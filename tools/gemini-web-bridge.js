const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const root = path.resolve(__dirname, '..');
const defaultChromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const defaultProfileDir = path.join(root, 'local', 'browser-profiles', 'gemini-web');
const geminiUrl = 'https://gemini.google.com/app';
const remoteDebugPort = process.env.GEMINI_WEB_DEBUG_PORT || '9222';

const composerSelectors = [
  'textarea',
  'rich-textarea textarea',
  'div[contenteditable="true"][aria-label="为 Gemini 输入提示"]',
  'div[contenteditable="plaintext-only"][aria-label="为 Gemini 输入提示"]',
  'div[contenteditable="true"]',
  'div[contenteditable="plaintext-only"]',
];

const sendButtonSelectors = [
  'button[aria-label="发送"]',
  'button[aria-label*="发送"]',
  'button[aria-label*="Send"]',
  'button[data-test-id*="send"]',
];

const responseSelectors = [
  'message-content',
  'model-response',
  '[data-message-author-role="assistant"]',
  '[data-response-id]',
];

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const json = rest.includes('--json');
  const args = rest.filter((arg) => arg !== '--json');
  return { command, json, args };
}

function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function getChromePath() {
  return process.env.GEMINI_WEB_CHROME_PATH || defaultChromePath;
}

function getProfileDir() {
  return process.env.GEMINI_WEB_PROFILE_DIR || defaultProfileDir;
}

function cleanResponseText(value) {
  return (value || '')
    .replace(/\r/g, '')
    .replace(/^Gemini 说\s*/u, '')
    .replace(/^Gemini says\s*/u, '')
    .trim();
}

async function launchContext() {
  const chromePath = getChromePath();
  if (!fs.existsSync(chromePath)) {
    throw new Error(`Chrome executable not found: ${chromePath}`);
  }

  const profileDir = getProfileDir();
  ensureDirectory(profileDir);

  const context = await chromium.launchPersistentContext(profileDir, {
    executablePath: chromePath,
    headless: false,
    viewport: { width: 1440, height: 960 },
    args: ['--disable-blink-features=AutomationControlled'],
  });

  await context.grantPermissions(['clipboard-read', 'clipboard-write'], {
    origin: 'https://gemini.google.com',
  });

  const page = context.pages()[0] || (await context.newPage());
  return { context, page };
}

async function connectToExistingChrome() {
  return chromium.connectOverCDP(`http://127.0.0.1:${remoteDebugPort}`);
}

async function getGeminiPageFromContext(context) {
  const existingPage = context.pages().find((candidate) => candidate.url().includes('gemini.google.com'));
  if (existingPage) {
    return existingPage;
  }

  const page = context.pages()[0] || (await context.newPage());
  return page;
}

async function findVisibleLocator(page, selectors, options = {}) {
  const timeoutMs = options.timeoutMs || 15000;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    for (const selector of selectors) {
      const locator = page.locator(selector);
      const count = await locator.count().catch(() => 0);
      for (let i = 0; i < count; i += 1) {
        const candidate = locator.nth(i);
        if (await candidate.isVisible().catch(() => false)) {
          return candidate;
        }
      }
    }
    await page.waitForTimeout(250);
  }

  return null;
}

async function ensureGeminiReady(page) {
  await page.bringToFront().catch(() => {});
  // Always start from the root app URL so each request lands in a fresh chat
  // instead of inheriting an old conversation thread.
  try {
    await page.goto(geminiUrl, { waitUntil: 'domcontentloaded' });
  } catch (error) {
    // Gemini occasionally aborts the navigation while it rewrites the route
    // to a fresh conversation URL. In that case, keep the current page and
    // continue once the DOM is available.
    if (!String(error && error.message).includes('ERR_ABORTED')) {
      throw error;
    }
    await page.waitForLoadState('domcontentloaded').catch(() => {});
  }

  const composer = await findVisibleLocator(page, composerSelectors, { timeoutMs: 20000 });
  if (composer) {
    return composer;
  }

  throw new Error(
    'Gemini input box not found. Run "npm run agent:gemini:login" first and finish login in the opened browser window.'
  );
}

async function fillComposer(page, composer, prompt) {
  const tagName = await composer.evaluate((node) => node.tagName.toLowerCase()).catch(() => '');

  await composer.click({ force: true }).catch(() => {});
  await page.keyboard.press('Control+A').catch(() => {});

  if (tagName === 'textarea') {
    await composer.fill(prompt);
    return;
  }

  await composer.evaluate((node) => {
    node.textContent = '';
    node.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.keyboard.type(prompt, { delay: 12 });
}

async function clickSend(page) {
  const sendButton = await findVisibleLocator(page, sendButtonSelectors, { timeoutMs: 5000 });
  if (sendButton) {
    await sendButton.click();
    return;
  }

  await page.keyboard.press('Enter');
}

async function captureResponseState(page) {
  for (const selector of responseSelectors) {
    const locator = page.locator(selector);
    const count = await locator.count().catch(() => 0);
    if (count > 0) {
      const lastText = cleanResponseText(await locator.last().innerText().catch(() => ''));
      if (lastText) {
        return { selector, count, lastText };
      }
    }
  }

  return { selector: responseSelectors[0], count: 0, lastText: '' };
}

async function waitForNewResponse(page, previousState) {
  const deadline = Date.now() + 180000;

  while (Date.now() < deadline) {
    for (const selector of responseSelectors) {
      const locator = page.locator(selector);
      const count = await locator.count().catch(() => 0);
      if (count === 0) {
        continue;
      }

      const lastText = cleanResponseText(await locator.last().innerText().catch(() => ''));
      if (!lastText) {
        continue;
      }

      const selectorMatches = selector === previousState.selector;
      const hasNewNode = selectorMatches ? count > previousState.count : count >= 1;
      const hasChangedText = lastText !== previousState.lastText;

      if (hasNewNode || hasChangedText) {
        return { selector, count, lastText };
      }
    }

    await page.waitForTimeout(1000);
  }

  throw new Error('Timed out while waiting for Gemini to finish responding.');
}

async function extractLatestResponse(page) {
  for (const selector of responseSelectors) {
    const locator = page.locator(selector);
    const count = await locator.count().catch(() => 0);
    if (count === 0) {
      continue;
    }

    const text = cleanResponseText(await locator.last().innerText().catch(() => ''));
    if (text) {
      return text;
    }
  }

  return '';
}

async function loginFlow() {
  const chromePath = getChromePath();
  const profileDir = getProfileDir();
  ensureDirectory(profileDir);
  console.log('Run this command in another terminal if you want to reuse an already opened browser:');
  console.log(`"${chromePath}" --remote-debugging-port=${remoteDebugPort} --user-data-dir="${profileDir}" ${geminiUrl}`);
  const { context, page } = await launchContext();
  await page.goto(geminiUrl, { waitUntil: 'domcontentloaded' });
  console.log('Opened Gemini in a dedicated browser profile.');
  console.log(`Profile dir: ${profileDir}`);
  console.log('Please finish login manually in the browser window, then close the browser when done.');
  await context.waitForEvent('close');
}

async function askFlow(prompt, json) {
  let browser = null;
  let context = null;
  let page = null;

  try {
    try {
      browser = await connectToExistingChrome();
      context = browser.contexts()[0];
      if (!context) {
        throw new Error('No browser context found on the remote debugging session.');
      }
      page = await getGeminiPageFromContext(context);
    } catch (error) {
      const launched = await launchContext();
      context = launched.context;
      page = launched.page;
    }

    const composer = await ensureGeminiReady(page);
    const previousState = await captureResponseState(page);
    await fillComposer(page, composer, prompt);
    await clickSend(page);
    await waitForNewResponse(page, previousState);

    const answer = await extractLatestResponse(page);
    if (!answer) {
      throw new Error('No Gemini response could be extracted from the page.');
    }

    if (json) {
      console.log(JSON.stringify({ ok: true, answer }, null, 2));
    } else {
      console.log(answer);
    }
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    } else if (context) {
      await context.close().catch(() => {});
    }
  }
}

async function main() {
  const { command, json, args } = parseArgs(process.argv.slice(2));
  if (!command) {
    console.error('Usage: node tools/gemini-web-bridge.js <login|ask> [--json] <prompt>');
    process.exit(1);
  }

  try {
    if (command === 'login') {
      await loginFlow();
      return;
    }

    if (command === 'ask') {
      if (args.length < 1) {
        throw new Error('Usage: node tools/gemini-web-bridge.js ask [--json] <prompt>');
      }
      await askFlow(args.join(' '), json);
      return;
    }

    throw new Error(`Unknown command: ${command}`);
  } catch (error) {
    console.error(`gemini-web-bridge error: ${error.message}`);
    process.exit(1);
  }
}

main();

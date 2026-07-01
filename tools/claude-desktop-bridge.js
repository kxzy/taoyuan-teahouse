const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const localAppData = process.env.LOCALAPPDATA;
const sessionsRoot = path.join(
  localAppData,
  'Claude-3p',
  'local-agent-mode-sessions',
  'a3728be1',
  '00000000'
);

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const json = rest.includes('--json');
  const args = rest.filter((arg) => arg !== '--json');
  return { command, json, args };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readAuditEntries(sessionDir) {
  const filePath = path.join(sessionDir, 'audit.jsonl');
  if (!fs.existsSync(filePath)) {
    return [];
  }

  return fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        return null;
      }
    })
    .filter(Boolean);
}

function getUserText(entry) {
  const content = entry?.message?.content;
  if (typeof content === 'string') {
    return content;
  }
  return '';
}

function getAssistantText(entry) {
  const content = entry?.message?.content;
  if (!Array.isArray(content)) {
    return '';
  }
  const textPart = content.find((item) => item?.type === 'text');
  return textPart?.text || '';
}

function getResultText(entry) {
  return typeof entry?.result === 'string' ? entry.result : '';
}

function getEntryTimestampMs(entry) {
  return Date.parse(entry?._audit_timestamp || 0);
}

function normalizeText(value) {
  return typeof value === 'string' ? value.replace(/\r\n/g, '\n').trim() : '';
}

function isPromptMatch(text, prompt, promptPrefix) {
  const normalizedText = normalizeText(text);
  const normalizedPrompt = normalizeText(prompt);
  const normalizedPrefix = normalizeText(promptPrefix);

  return (
    normalizedText === normalizedPrompt ||
    (normalizedPrefix && normalizedText.includes(normalizedPrefix))
  );
}

function listSessionAuditFiles() {
  if (!fs.existsSync(sessionsRoot)) {
    throw new Error(`Claude sessions root not found: ${sessionsRoot}`);
  }

  return fs
    .readdirSync(sessionsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('local_'))
    .map((entry) => {
      const fullPath = path.join(sessionsRoot, entry.name);
      const auditPath = path.join(fullPath, 'audit.jsonl');
      const stats = fs.existsSync(auditPath) ? fs.statSync(auditPath) : fs.statSync(fullPath);
      return {
        name: entry.name,
        fullPath,
        auditPath,
        mtimeMs: stats.mtimeMs,
      };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
}

function pickMatchingSession(prompt, sinceMs) {
  const candidates = listSessionAuditFiles().filter((dir) => dir.mtimeMs >= sinceMs - 5000);
  const promptPrefix = prompt.slice(0, 120);

  for (const candidate of candidates) {
    const entries = readAuditEntries(candidate.fullPath);
    const matchingIndexes = entries
      .map((entry, index) => ({ entry, index }))
      .filter(({ entry }) => {
        if (entry.type !== 'user') {
          return false;
        }

        if (getEntryTimestampMs(entry) < sinceMs - 5000) {
          return false;
        }

        const text = getUserText(entry);
        return isPromptMatch(text, prompt, promptPrefix);
      })
      .map(({ index }) => index);

    if (matchingIndexes.length === 0) {
      continue;
    }

    const promptIndex = matchingIndexes[matchingIndexes.length - 1];
    const nextUnrelatedUserIndex = entries.findIndex((entry, index) => {
      if (index <= promptIndex || entry.type !== 'user') {
        return false;
      }

      const text = getUserText(entry);
      return !isPromptMatch(text, prompt, promptPrefix);
    });

    return {
      dir: candidate,
      entries,
      promptIndex,
      responseEndIndex: nextUnrelatedUserIndex === -1 ? entries.length : nextUnrelatedUserIndex,
    };
  }

  return null;
}

function pickLatestCompletedSession(sinceMs) {
  const candidates = listSessionAuditFiles().filter((dir) => dir.mtimeMs >= sinceMs - 5000);

  for (const candidate of candidates) {
    const entries = readAuditEntries(candidate.fullPath);
    const resultEntry = [...entries].reverse().find(
      (entry) =>
        entry.type === 'result' &&
        entry.subtype === 'success' &&
        Date.parse(entry._audit_timestamp || 0) >= sinceMs - 5000
    );

    if (resultEntry) {
      return { dir: candidate, entries };
    }
  }

  return null;
}

async function waitForResponse(prompt, sinceMs, timeoutMs) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const match = pickMatchingSession(prompt, sinceMs);
    const fallbackMatch = match || pickLatestCompletedSession(sinceMs);

    if (fallbackMatch) {
      const trailingEntries = match
        ? match.entries.slice(match.promptIndex + 1, match.responseEndIndex)
        : fallbackMatch.entries;
      const resultEntry = trailingEntries.find(
        (entry) => entry.type === 'result' && entry.subtype === 'success'
      );
      if (resultEntry) {
        return getResultText(resultEntry);
      }

      const assistantEntry = trailingEntries.find((entry) => entry.type === 'assistant');
      if (assistantEntry) {
        const text = getAssistantText(assistantEntry);
        if (text) {
          return text;
        }
      }
    }

    await sleep(1000);
  }

  throw new Error('Timed out while waiting for Claude desktop response.');
}

function buildPowerShellAutomation(promptFilePath) {
  const escapedPath = promptFilePath.replace(/'/g, "''");

  return `
Add-Type -AssemblyName System.Windows.Forms;
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Win32 {
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
}
"@;
$p = Get-Process claude | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1;
if (-not $p) { throw 'Claude desktop main window not found.'; }
$hwnd = [IntPtr]$p.MainWindowHandle;
$prompt = Get-Content -Raw '${escapedPath}';
Set-Clipboard -Value $prompt;
[Win32]::ShowWindow($hwnd, 9) | Out-Null;
Start-Sleep -Milliseconds 300;
[Win32]::SetForegroundWindow($hwnd) | Out-Null;
Start-Sleep -Milliseconds 700;
[System.Windows.Forms.SendKeys]::SendWait('^o');
Start-Sleep -Milliseconds 1000;
[System.Windows.Forms.SendKeys]::SendWait('+{ESC}');
Start-Sleep -Milliseconds 500;
[System.Windows.Forms.SendKeys]::SendWait('^a');
Start-Sleep -Milliseconds 150;
[System.Windows.Forms.SendKeys]::SendWait('{DEL}');
Start-Sleep -Milliseconds 150;
[System.Windows.Forms.SendKeys]::SendWait('^v');
Start-Sleep -Milliseconds 300;
[System.Windows.Forms.SendKeys]::SendWait('{ENTER}');
Write-Output 'submitted';
`.trim();
}

function submitPrompt(prompt) {
  const promptFilePath = path.join(os.tmpdir(), `claude-desktop-bridge-${Date.now()}.txt`);
  fs.writeFileSync(promptFilePath, prompt, 'utf8');

  const script = buildPowerShellAutomation(promptFilePath);
  const result = spawnSync('powershell', ['-NoProfile', '-Command', script], {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 5,
  });

  try {
    fs.unlinkSync(promptFilePath);
  } catch (error) {
    // Ignore temp cleanup failure.
  }

  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || 'Failed to submit prompt to Claude desktop.').trim());
  }
}

async function askFlow(prompt, json) {
  const startedAt = Date.now();
  submitPrompt(prompt);
  const answer = await waitForResponse(prompt, startedAt, 180000);

  if (json) {
    console.log(JSON.stringify({ ok: true, answer }, null, 2));
  } else {
    console.log(answer);
  }
}

async function main() {
  const { command, json, args } = parseArgs(process.argv.slice(2));
  if (!command) {
    console.error('Usage: node tools/claude-desktop-bridge.js ask [--json] <prompt>');
    process.exit(1);
  }

  try {
    if (command === 'ask') {
      if (args.length < 1) {
        throw new Error('Usage: node tools/claude-desktop-bridge.js ask [--json] <prompt>');
      }
      await askFlow(args.join(' '), json);
      return;
    }

    throw new Error(`Unknown command: ${command}`);
  } catch (error) {
    console.error(`claude-desktop-bridge error: ${error.message}`);
    process.exit(1);
  }
}

main();

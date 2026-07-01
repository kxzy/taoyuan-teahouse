const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const agentsRoot = path.join(root, '.agents');
const tasksRoot = path.join(agentsRoot, 'tasks');
const templatePath = path.join(agentsRoot, 'templates', 'task.template.json');
const taoyuanTemplatePath = path.join(agentsRoot, 'templates', 'taoyuan-master-task.template.json');
const collaborationConfigPath = path.join(agentsRoot, 'collaboration.config.json');
const geminiBridgePath = path.join(__dirname, 'gemini-web-bridge.js');
const claudeDesktopBridgePath = path.join(__dirname, 'claude-desktop-bridge.js');
const allowedAgents = ['Planner', 'Code', 'Review', 'QA', 'Memory'];
const allowedStatuses = ['planning', 'in_progress', 'review', 'qa', 'done', 'blocked'];
const agentSequence = ['Planner', 'Code', 'Review', 'QA', 'Memory'];
const plannerHints = [
  {
    name: 'gameplay',
    keywords: ['玩法', '节奏', '顾客', '排队', '订单', '制作台', '经营', '收益', '数值', 'recipe', 'customer'],
    scopeIn: 'Review gameplay flow, state transitions, and player-facing pacing around the requested behavior.',
    scopeOut: 'Do not rewrite unrelated systems if a local behavior fix can solve the issue.',
    acceptance: 'Gameplay behavior matches the intended pacing or rule change without breaking the existing loop.',
    implementation: 'Prefer adjusting the current gameplay flow and data hooks instead of introducing a parallel system.',
    risk: 'Gameplay changes can silently affect income, queue pressure, energy, or recipe progression.',
  },
  {
    name: 'ui',
    keywords: ['ui', '界面', '按钮', '面板', '布局', '弹窗', '显示', '交互'],
    scopeIn: 'Clarify affected UI states, empty states, button affordances, and feedback timing.',
    scopeOut: 'Do not restyle unrelated screens outside the requested flow.',
    acceptance: 'UI state, visibility, and interactions remain consistent across the affected flow.',
    implementation: 'Reuse existing UI builders and panel composition patterns before adding new structural layers.',
    risk: 'UI changes can drift from gameplay state and leave stale or misleading on-screen information.',
  },
  {
    name: 'scene',
    keywords: ['scene', '场景', '节点', '预览', 'creator', 'Main.scene'],
    scopeIn: 'Identify whether the request needs scene-authored nodes, script bindings, or preview-only adjustments.',
    scopeOut: 'Avoid broad scene cleanup unless it is necessary for the requested behavior.',
    acceptance: 'Scene references and runtime bindings stay valid in both script checks and Creator preview.',
    implementation: 'Minimize scene churn and keep node-binding changes narrowly scoped.',
    risk: 'Scene edits are easy to make visually but can introduce hidden binding regressions.',
  },
  {
    name: 'asset',
    keywords: ['资源', '图片', '贴图', 'sprite', 'png', 'meta', '别名'],
    scopeIn: 'Confirm asset path, naming, fallback behavior, and any runtime loading expectations.',
    scopeOut: 'Avoid unnecessary asset directory reshuffles during focused feature work.',
    acceptance: 'Assets load from the intended path without breaking existing fallbacks or build compatibility.',
    implementation: 'Preserve existing asset loading conventions and keep path changes explicit.',
    risk: 'Asset and meta changes can pass script checks but fail at runtime or in build packaging.',
  },
  {
    name: 'validation',
    keywords: ['验证', '测试', 'typecheck', '检查', 'qa', '复盘'],
    scopeIn: 'Define concrete repo checks and any manual preview steps needed for acceptance.',
    scopeOut: 'Do not claim validation coverage for checks that were not actually run.',
    acceptance: 'Validation steps and remaining gaps are explicitly recorded in the task card.',
    implementation: 'Treat repository validation scripts and manual preview as first-class deliverables.',
    risk: 'A change may look done while still lacking the checks needed to make it trustworthy.',
  },
];

function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'task';
}

function now() {
  return new Date().toISOString();
}

function localDateStamp() {
  const date = new Date();
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function taskPath(taskId) {
  return path.join(tasksRoot, `${taskId}.json`);
}

function loadTask(taskId) {
  const filePath = taskPath(taskId);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Task not found: ${taskId}`);
  }
  return { filePath, task: readJson(filePath) };
}

function appendHistory(task, agent, action, detail) {
  task.history.push({
    at: now(),
    agent,
    action,
    detail,
  });
}

function printUsage() {
  console.log(
    [
      'Usage:',
      '  node tools/multi-agent.js advance <taskId> "<summary>"',
      '  node tools/multi-agent.js claude-review <taskId>',
      '  node tools/multi-agent.js context <taskId>',
      '  node tools/multi-agent.js gemini-planner <taskId>',
      '  node tools/multi-agent.js gemini-qa <taskId>',
      '  node tools/multi-agent.js gemini-review <taskId>',
      '  node tools/multi-agent.js intake "<title>" "<goal>"',
      '  node tools/multi-agent.js intake-taoyuan "<title>" "<goal>"',
      '  node tools/multi-agent.js init "<title>"',
      '  node tools/multi-agent.js list',
      '  node tools/multi-agent.js summary <taskId>',
      '  node tools/multi-agent.js show <taskId>',
      '  node tools/multi-agent.js handoff <taskId> <fromAgent> <toAgent> "<summary>"',
      '  node tools/multi-agent.js set-status <taskId> <status>',
      '  node tools/multi-agent.js note <taskId> <agent> "<summary>"',
    ].join('\n')
  );
}

function safeReadJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return readJson(filePath);
}

function readGitRemoteUrl() {
  const result = spawnSync('git', ['remote', 'get-url', 'origin'], {
    cwd: root,
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    return '';
  }

  return (result.stdout || '').trim();
}

function loadCollaborationConfig() {
  const configured = safeReadJsonIfExists(collaborationConfigPath) || {};
  const repoUrl = configured.repoUrl || readGitRemoteUrl();

  return {
    projectName: configured.projectName || path.basename(root),
    repoUrl,
    claudeLocalProject: configured.claudeLocalProject || root,
    codexRole: configured.codexRole || 'Orchestrate the workflow, write code, run checks, and persist task state.',
    geminiHints: configured.geminiHints || [
      'Use the public GitHub repository as the primary code context.',
      'Prefer reviewing linked repo files or paths over asking Codex to paste large code blocks.',
      'Return concise JSON only when the prompt requests structured output.',
    ],
    claudeHints: configured.claudeHints || [
      'Use the local Claude project context and the task card as primary review context.',
      'Focus on regressions, validation gaps, scene/resource stability, and lifecycle risks.',
      'Keep the response compact and action-oriented.',
    ],
  };
}

function formatList(items, fallback = 'none') {
  if (!Array.isArray(items) || items.length === 0) {
    return fallback;
  }
  return items.map((item) => `- ${item}`).join('\n');
}

function formatChecks(checks) {
  if (!Array.isArray(checks) || checks.length === 0) {
    return 'none';
  }

  return checks
    .map((check) => `- ${check.name} [${check.status}] ${check.detail}`)
    .join('\n');
}

function buildSharedTaskBrief(task) {
  const implementation = task.implementation || {};
  const review = task.review || {};
  const qa = task.qa || {};

  return [
    `Task id: ${task.id}`,
    `Task title: ${task.title}`,
    `Goal: ${task.goal}`,
    `Status: ${task.status}`,
    `Current agent: ${task.currentAgent}`,
    'Acceptance:',
    formatList(task.acceptance || []),
    'Scope in:',
    formatList(task.scope?.in || []),
    'Implementation summary:',
    implementation.summary || 'none',
    'Files touched:',
    formatList(implementation.filesTouched || []),
    'Implementation follow-ups:',
    formatList(implementation.followUps || []),
    'Existing review findings:',
    formatList(review.findings || []),
    'Existing review risks:',
    formatList(review.risks || []),
    'QA checks:',
    formatChecks(qa.checks || []),
  ].join('\n');
}

function buildAgentContextBlock(agentName, task) {
  const config = loadCollaborationConfig();
  const lines = [
    `Project: ${config.projectName}`,
    `Codex role: ${config.codexRole}`,
  ];

  if (config.repoUrl) {
    lines.push(`Public GitHub repo: ${config.repoUrl}`);
  }

  if (agentName === 'Gemini') {
    lines.push('Gemini context rules:');
    lines.push(formatList(config.geminiHints));
  }

  if (agentName === 'Claude') {
    lines.push(`Claude local project: ${config.claudeLocalProject}`);
    lines.push('Claude context rules:');
    lines.push(formatList(config.claudeHints));
  }

  lines.push('Use the task card for goal, acceptance, touched files, and follow-ups. Do not ask Codex to paste large unrelated file contents.');
  lines.push('');
  lines.push(buildSharedTaskBrief(task));
  return lines.join('\n');
}

function initTask(title) {
  ensureDirectory(tasksRoot);
  const template = readJson(templatePath);
  const taskId = `${localDateStamp()}-${slugify(title)}`;
  const filePath = taskPath(taskId);

  if (fs.existsSync(filePath)) {
    throw new Error(`Task already exists: ${taskId}`);
  }

  template.id = taskId;
  template.title = title;
  template.goal = title;
  appendHistory(template, 'Planner', 'init', 'Task created');
  writeJson(filePath, template);

  console.log(`Created task: ${taskId}`);
  console.log(filePath);
}

function createDefaultQaChecks() {
  return [
    {
      name: 'Static review of changed files',
      status: 'pending',
      detail: 'Review changed scripts and scene/config impact before runtime validation.',
    },
    {
      name: 'npm run validate:v1-loop',
      status: 'pending',
      detail: 'Run project loop validation after implementation if affected.',
    },
    {
      name: 'npm run typecheck:cocos',
      status: 'pending',
      detail: 'Run Cocos TypeScript typecheck after implementation if scripts changed.',
    },
    {
      name: 'Cocos preview smoke test',
      status: 'pending',
      detail: 'Verify core flow in Creator preview when UI, scene, or gameplay logic changes.',
    },
  ];
}

function matchPlannerHints(goal) {
  const lowerGoal = goal.toLowerCase();
  return plannerHints.filter((hint) =>
    hint.keywords.some((keyword) => lowerGoal.includes(keyword.toLowerCase()))
  );
}

function unique(values) {
  return [...new Set(values)];
}

function buildPlannerDraft(goal) {
  const matches = matchPlannerHints(goal);
  const scopeIn = [
    goal,
    'Clarify impacted gameplay, UI, data, and validation scope before coding.',
    ...matches.map((hint) => hint.scopeIn),
  ];
  const scopeOut = [
    'Unrelated gameplay refactors outside the current request.',
    'Large architecture rewrites unless explicitly required by the task.',
    ...matches.map((hint) => hint.scopeOut),
  ];
  const acceptance = [
    'Planner has written a concrete implementation direction and completion criteria.',
    'Code, Review, QA, and Memory all have reserved sections in the same task card.',
    'QA checklist includes repository-standard validation steps where applicable.',
    ...matches.map((hint) => hint.acceptance),
  ];
  const risks = [
    'Scene files and gameplay scripts can drift together and cause hidden regressions.',
    'Manual Cocos preview may still be needed even when script-level validation passes.',
    ...matches.map((hint) => hint.risk),
  ];
  const implementationNotes = [
    'Prefer minimal, repo-aligned changes over introducing a parallel architecture.',
    'Record deviations explicitly if implementation differs from the original plan.',
    ...matches.map((hint) => hint.implementation),
  ];

  return {
    scopeIn: unique(scopeIn),
    scopeOut: unique(scopeOut),
    acceptance: unique(acceptance),
    risks: unique(risks),
    implementationNotes: unique(implementationNotes),
    matchedAreas: matches.map((hint) => hint.name),
  };
}

function intakeTask(title, goal) {
  return intakeTaskFromTemplate(templatePath, title, goal, false);
}

function intakeTaoyuanTask(title, goal) {
  return intakeTaskFromTemplate(taoyuanTemplatePath, title, goal, true);
}

function intakeTaskFromTemplate(selectedTemplatePath, title, goal, isTaoyuanTemplate) {
  ensureDirectory(tasksRoot);
  const template = readJson(selectedTemplatePath);
  const taskId = `${localDateStamp()}-${slugify(title)}`;
  const filePath = taskPath(taskId);
  const draft = buildPlannerDraft(goal);

  if (fs.existsSync(filePath)) {
    throw new Error(`Task already exists: ${taskId}`);
  }

  template.id = taskId;
  template.title = title;
  template.goal = goal;
  template.status = 'planning';
  template.currentAgent = 'Planner';
  template.scope.in = unique([...template.scope.in, goal, ...draft.scopeIn]);
  template.scope.out = unique([...template.scope.out, ...draft.scopeOut]);
  template.acceptance = unique([...template.acceptance, ...draft.acceptance]);
  template.risks = unique([...template.risks, ...draft.risks]);
  template.qaChecks = unique([
    ...template.qaChecks,
    'Run validate:v1-loop when gameplay loop or UI flow changes.',
    'Run typecheck:cocos when TypeScript scripts change.',
    'Record any manual Creator preview findings in qa.checks.',
  ]);
  template.implementationNotes = unique([...template.implementationNotes, ...draft.implementationNotes]);
  if (!template.qa.checks || template.qa.checks.length === 0) {
    template.qa.checks = createDefaultQaChecks();
  }
  template.memory.nextDefaults = unique([
    ...template.memory.nextDefaults,
    'Use this task card as the single handoff source across Planner, Code, Review, QA, and Memory.',
  ]);
  template.memory.decisions = [
    `Planner draft auto-detected areas: ${draft.matchedAreas.join(', ') || 'general'}`,
    ...(isTaoyuanTemplate ? ['Task created from Taoyuan master template.'] : []),
  ];
  appendHistory(template, 'Planner', 'intake', `Task created from request: ${goal}`);
  writeJson(filePath, template);

  console.log(`Created intake task: ${taskId}`);
  console.log(filePath);
}

function listTasks() {
  ensureDirectory(tasksRoot);
  const files = fs
    .readdirSync(tasksRoot)
    .filter((file) => file.endsWith('.json'))
    .sort();

  if (files.length === 0) {
    console.log('No multi-agent tasks yet.');
    return;
  }

  for (const file of files) {
    const task = readJson(path.join(tasksRoot, file));
    console.log(`${task.id} | ${task.status} | ${task.currentAgent} | ${task.title}`);
  }
}

function showTask(taskId) {
  const { task } = loadTask(taskId);
  console.log(JSON.stringify(task, null, 2));
}

function ensureAssistantDrafts(task) {
  if (!task.assistantDrafts) {
    task.assistantDrafts = {
      planner: '',
      review: '',
      qa: '',
      notes: [],
    };
  }

  if (!Object.prototype.hasOwnProperty.call(task.assistantDrafts, 'qa')) {
    task.assistantDrafts.qa = '';
  }
}

function createGeminiPlannerPrompt(task) {
  return [
    'You are the Planner agent for a Cocos Creator teahouse game repository.',
    'Return strict JSON with keys: summary, scopeIn, scopeOut, acceptance, risks, implementationNotes.',
    'Each list field must be an array of short strings.',
    'Do not wrap the JSON in markdown fences.',
    buildAgentContextBlock('Gemini', task),
    'Current planner risks:',
    formatList(task.risks || []),
    'Current implementation notes:',
    formatList(task.implementationNotes || []),
    'Refine the planner draft for implementation and validation readiness.',
  ].join('\n');
}

function createGeminiReviewPrompt(task) {
  return [
    'You are the Review agent for a Cocos Creator teahouse game repository.',
    'Return strict JSON with keys: findings, risks, decision.',
    'findings must be an array of short actionable review findings.',
    'risks must be an array of short residual risks or test gaps.',
    'decision must be one of: approved, changes_requested, needs_followup.',
    'Do not wrap the JSON in markdown fences.',
    buildAgentContextBlock('Claude', task),
    'Implementation deviations:',
    formatList(task.implementation?.deviations || []),
    'Review for likely regressions, missing coverage, architecture drift, and gaps between the implementation and the task acceptance criteria.',
  ].join('\n');
}

function createGeminiQaPrompt(task) {
  return [
    'You are the QA agent for a Cocos Creator teahouse game repository.',
    'Return strict JSON with keys: checks, summary, blockers.',
    'checks must be an array of objects with keys: name, status, detail.',
    'status must be one of: pending, running, passed, failed, blocked, skipped.',
    'summary must be a short QA status summary string.',
    'blockers must be an array of short blocker strings.',
    'Do not wrap the JSON in markdown fences.',
    buildAgentContextBlock('Gemini', task),
    'Refine the QA checklist and identify what remains to be run, what is blocked, and what should be recorded before the task can be called validated.',
  ].join('\n');
}

function mergeGeminiPlannerDraft(task, draft) {
  task.scope.in = unique([...(task.scope?.in || []), ...(draft.scopeIn || [])]);
  task.scope.out = unique([...(task.scope?.out || []), ...(draft.scopeOut || [])]);
  task.acceptance = unique([...(task.acceptance || []), ...(draft.acceptance || [])]);
  task.risks = unique([...(task.risks || []), ...(draft.risks || [])]);
  task.implementationNotes = unique([
    ...(task.implementationNotes || []),
    ...(draft.implementationNotes || []),
  ]);
}

function mergeGeminiReviewDraft(task, draft) {
  task.review.findings = unique([...(task.review?.findings || []), ...(draft.findings || [])]);
  task.review.risks = unique([...(task.review?.risks || []), ...(draft.risks || [])]);
  if (draft.decision) {
    task.review.decision = draft.decision;
  }
}

function mergeGeminiQaDraft(task, draft) {
  if (Array.isArray(draft.checks) && draft.checks.length > 0) {
    task.qa.checks = draft.checks;
  }
  if (typeof draft.summary === 'string') {
    task.qa.summary = draft.summary;
  }
  if (Array.isArray(draft.blockers)) {
    task.qa.blockers = unique([...(draft.blockers || [])]);
  }
}

function extractJsonObject(text) {
  if (!text) {
    return null;
  }

  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidates = fencedMatch ? [fencedMatch[1], text] : [text];

  for (const candidate of candidates) {
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
      continue;
    }

    const maybeJson = candidate.slice(start, end + 1);
    try {
      return JSON.parse(maybeJson);
    } catch (error) {
      continue;
    }
  }

  return null;
}

function runGeminiPlanner(taskId) {
  const { filePath, task } = loadTask(taskId);
  ensureAssistantDrafts(task);

  const prompt = createGeminiPlannerPrompt(task);
  const result = spawnSync(process.execPath, [geminiBridgePath, 'ask', '--json', prompt], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 5,
  });

  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || 'Gemini planner call failed.').trim());
  }

  const payload = JSON.parse(result.stdout);
  const rawAnswer = payload.answer || '';
  task.assistantDrafts.planner = rawAnswer;

  const parsed = extractJsonObject(rawAnswer);
  if (parsed) {
    mergeGeminiPlannerDraft(task, parsed);
  } else {
    task.assistantDrafts.notes.push('Gemini planner returned non-JSON content; raw draft preserved.');
  }

  appendHistory(task, 'Planner', 'gemini-planner', 'Updated planner draft from Gemini web automation.');
  writeJson(filePath, task);
  console.log(`Gemini planner draft updated: ${taskId}`);
}

function runGeminiReview(taskId) {
  const { filePath, task } = loadTask(taskId);
  ensureAssistantDrafts(task);

  const prompt = createGeminiReviewPrompt(task);
  const result = spawnSync(process.execPath, [geminiBridgePath, 'ask', '--json', prompt], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 5,
  });

  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || 'Gemini review call failed.').trim());
  }

  const payload = JSON.parse(result.stdout);
  const rawAnswer = payload.answer || '';
  task.assistantDrafts.review = rawAnswer;

  const parsed = extractJsonObject(rawAnswer);
  if (parsed) {
    mergeGeminiReviewDraft(task, parsed);
  } else {
    task.assistantDrafts.notes.push('Gemini review returned non-JSON content; raw draft preserved.');
  }

  appendHistory(task, 'Review', 'gemini-review', 'Updated review draft from Gemini web automation.');
  writeJson(filePath, task);
  console.log(`Gemini review draft updated: ${taskId}`);
}

function runGeminiQa(taskId) {
  const { filePath, task } = loadTask(taskId);
  ensureAssistantDrafts(task);

  const prompt = createGeminiQaPrompt(task);
  const result = spawnSync(process.execPath, [geminiBridgePath, 'ask', '--json', prompt], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 5,
  });

  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || 'Gemini QA call failed.').trim());
  }

  const payload = JSON.parse(result.stdout);
  const rawAnswer = payload.answer || '';
  task.assistantDrafts.qa = rawAnswer;

  const parsed = extractJsonObject(rawAnswer);
  if (parsed) {
    mergeGeminiQaDraft(task, parsed);
  } else {
    task.assistantDrafts.notes.push('Gemini QA returned non-JSON content; raw draft preserved.');
  }

  appendHistory(task, 'QA', 'gemini-qa', 'Updated QA draft from Gemini web automation.');
  writeJson(filePath, task);
  console.log(`Gemini QA draft updated: ${taskId}`);
}

function runClaudeReview(taskId) {
  const { filePath, task } = loadTask(taskId);
  ensureAssistantDrafts(task);

  const prompt = createGeminiReviewPrompt(task);
  const result = spawnSync(process.execPath, [claudeDesktopBridgePath, 'ask', '--json', prompt], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 5,
  });

  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || 'Claude desktop review call failed.').trim());
  }

  const payload = JSON.parse(result.stdout);
  const rawAnswer = payload.answer || '';
  task.assistantDrafts.review = rawAnswer;

  const parsed = extractJsonObject(rawAnswer);
  if (parsed) {
    mergeGeminiReviewDraft(task, parsed);
  } else {
    task.assistantDrafts.notes.push('Claude review returned non-JSON content; raw draft preserved.');
  }

  appendHistory(task, 'Review', 'claude-review', 'Updated review draft from Claude desktop automation.');
  writeJson(filePath, task);
  console.log(`Claude review draft updated: ${taskId}`);
}

function handoffTask(taskId, fromAgent, toAgent, summary) {
  if (!allowedAgents.includes(fromAgent)) {
    throw new Error(`Unknown fromAgent: ${fromAgent}`);
  }
  if (!allowedAgents.includes(toAgent)) {
    throw new Error(`Unknown toAgent: ${toAgent}`);
  }

  const { filePath, task } = loadTask(taskId);
  task.currentAgent = toAgent;
  task.status = nextStatusForAgent(toAgent);
  task.handoffs.push({
    at: now(),
    from: fromAgent,
    to: toAgent,
    summary,
  });
  appendHistory(task, fromAgent, 'handoff', `to ${toAgent}: ${summary}`);
  writeJson(filePath, task);

  console.log(`Handoff complete: ${taskId} ${fromAgent} -> ${toAgent}`);
}

function nextStatusForAgent(agent) {
  if (agent === 'Review') {
    return 'review';
  }
  if (agent === 'QA') {
    return 'qa';
  }
  if (agent === 'Memory') {
    return 'in_progress';
  }
  return 'in_progress';
}

function advanceTask(taskId, summary) {
  const { filePath, task } = loadTask(taskId);
  const currentIndex = agentSequence.indexOf(task.currentAgent);
  if (currentIndex === -1) {
    throw new Error(`Current agent is invalid: ${task.currentAgent}`);
  }

  if (task.status === 'done') {
    throw new Error(`Task already completed: ${taskId}`);
  }

  if (task.currentAgent === 'Memory') {
    task.status = 'done';
    appendHistory(task, 'Memory', 'advance', `completed: ${summary}`);
    writeJson(filePath, task);
    console.log(`Task completed: ${taskId}`);
    return;
  }

  const nextAgent = agentSequence[currentIndex + 1];
  if (!nextAgent) {
    throw new Error(`No next agent found for: ${task.currentAgent}`);
  }

  task.handoffs.push({
    at: now(),
    from: task.currentAgent,
    to: nextAgent,
    summary,
  });
  appendHistory(task, task.currentAgent, 'advance', `to ${nextAgent}: ${summary}`);
  task.currentAgent = nextAgent;
  task.status = nextStatusForAgent(nextAgent);
  writeJson(filePath, task);

  console.log(`Advanced task: ${taskId} ${task.handoffs[task.handoffs.length - 1].from} -> ${nextAgent}`);
}

function summarizeTask(taskId) {
  const { task } = loadTask(taskId);
  const lastHandoff = task.handoffs.length > 0 ? task.handoffs[task.handoffs.length - 1] : null;
  const lines = [
    `id: ${task.id}`,
    `title: ${task.title}`,
    `status: ${task.status}`,
    `currentAgent: ${task.currentAgent}`,
    `goal: ${task.goal}`,
    `handoffs: ${task.handoffs.length}`,
    `historyEntries: ${task.history.length}`,
  ];

  if (lastHandoff) {
    lines.push(`lastHandoff: ${lastHandoff.from} -> ${lastHandoff.to} | ${lastHandoff.summary}`);
  }

  console.log(lines.join('\n'));
}

function showContext(taskId) {
  const { task } = loadTask(taskId);
  const config = loadCollaborationConfig();
  const lines = [
    `project: ${config.projectName}`,
    `repoUrl: ${config.repoUrl || 'not configured'}`,
    `claudeLocalProject: ${config.claudeLocalProject}`,
    `codexRole: ${config.codexRole}`,
    '',
    'geminiHints:',
    formatList(config.geminiHints),
    '',
    'claudeHints:',
    formatList(config.claudeHints),
    '',
    buildSharedTaskBrief(task),
  ];

  console.log(lines.join('\n'));
}

function setStatus(taskId, status) {
  if (!allowedStatuses.includes(status)) {
    throw new Error(`Unknown status: ${status}`);
  }

  const { filePath, task } = loadTask(taskId);
  task.status = status;
  appendHistory(task, task.currentAgent, 'set-status', status);
  writeJson(filePath, task);

  console.log(`Updated status: ${taskId} -> ${status}`);
}

function addNote(taskId, agent, summary) {
  if (!allowedAgents.includes(agent)) {
    throw new Error(`Unknown agent: ${agent}`);
  }

  const { filePath, task } = loadTask(taskId);
  appendHistory(task, agent, 'note', summary);
  writeJson(filePath, task);

  console.log(`Added note: ${taskId} / ${agent}`);
}

function main() {
  ensureDirectory(tasksRoot);

  const [, , command, ...args] = process.argv;
  if (!command) {
    printUsage();
    process.exit(1);
  }

  try {
    switch (command) {
      case 'intake':
        if (args.length < 2) {
          throw new Error('Usage: intake "<title>" "<goal>"');
        }
        intakeTask(args[0], args.slice(1).join(' '));
        return;
      case 'intake-taoyuan':
        if (args.length < 2) {
          throw new Error('Usage: intake-taoyuan "<title>" "<goal>"');
        }
        intakeTaoyuanTask(args[0], args.slice(1).join(' '));
        return;
      case 'advance':
        if (args.length < 2) {
          throw new Error('Usage: advance <taskId> "<summary>"');
        }
        advanceTask(args[0], args.slice(1).join(' '));
        return;
      case 'gemini-planner':
        if (args.length !== 1) {
          throw new Error('Usage: gemini-planner <taskId>');
        }
        runGeminiPlanner(args[0]);
        return;
      case 'claude-review':
        if (args.length !== 1) {
          throw new Error('Usage: claude-review <taskId>');
        }
        runClaudeReview(args[0]);
        return;
      case 'gemini-review':
        if (args.length !== 1) {
          throw new Error('Usage: gemini-review <taskId>');
        }
        runGeminiReview(args[0]);
        return;
      case 'gemini-qa':
        if (args.length !== 1) {
          throw new Error('Usage: gemini-qa <taskId>');
        }
        runGeminiQa(args[0]);
        return;
      case 'init':
        if (args.length < 1) {
          throw new Error('Missing task title');
        }
        initTask(args.join(' '));
        return;
      case 'list':
        listTasks();
        return;
      case 'show':
        if (args.length !== 1) {
          throw new Error('Usage: show <taskId>');
        }
        showTask(args[0]);
        return;
      case 'summary':
        if (args.length !== 1) {
          throw new Error('Usage: summary <taskId>');
        }
        summarizeTask(args[0]);
        return;
      case 'context':
        if (args.length !== 1) {
          throw new Error('Usage: context <taskId>');
        }
        showContext(args[0]);
        return;
      case 'handoff':
        if (args.length < 4) {
          throw new Error('Usage: handoff <taskId> <fromAgent> <toAgent> "<summary>"');
        }
        handoffTask(args[0], args[1], args[2], args.slice(3).join(' '));
        return;
      case 'set-status':
        if (args.length !== 2) {
          throw new Error('Usage: set-status <taskId> <status>');
        }
        setStatus(args[0], args[1]);
        return;
      case 'note':
        if (args.length < 3) {
          throw new Error('Usage: note <taskId> <agent> "<summary>"');
        }
        addNote(args[0], args[1], args.slice(2).join(' '));
        return;
      default:
        throw new Error(`Unknown command: ${command}`);
    }
  } catch (error) {
    console.error(`multi-agent error: ${error.message}`);
    process.exit(1);
  }
}

main();

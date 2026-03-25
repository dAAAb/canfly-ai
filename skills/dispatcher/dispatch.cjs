#!/usr/bin/env node
/**
 * LittleLobster Skill Execution Dispatcher
 *
 * Routes incoming task requests to the appropriate skill handler
 * based on skill_name. Returns results to stdout as JSON.
 *
 * Usage:
 *   node dispatch.cjs --skill "AI Cover Image" --params '{"prompt":"a sunset"}'
 *   node dispatch.cjs --skill "Voice Quote Video" --params '{"text":"Hello world","lang":"en"}'
 *   node dispatch.cjs --skill "Blog Post Writing" --params '{"topic":"AI agents"}'
 *   node dispatch.cjs --skill "Onchain Research Report" --params '{"address":"0x..."}'
 */

const path = require('path');
const { parseArgs } = require('util');

// --- Skill registry -----------------------------------------------------------

const SKILL_MAP = {
  'ai cover image':           './handlers/cover-image.cjs',
  'cover image':              './handlers/cover-image.cjs',
  'voice quote video':        './handlers/voice-quote.cjs',
  'voice quote':              './handlers/voice-quote.cjs',
  'tts':                      './handlers/voice-quote.cjs',
  'onchain research report':  './handlers/onchain-research.cjs',
  'onchain research':         './handlers/onchain-research.cjs',
  'blog post writing':        './handlers/blog-post.cjs',
  'blog post':                './handlers/blog-post.cjs',
};

// --- CLI argument parsing -----------------------------------------------------

function parseCliArgs() {
  const { values } = parseArgs({
    options: {
      skill:  { type: 'string', short: 's' },
      params: { type: 'string', short: 'p' },
      'task-id': { type: 'string', short: 't' },
      help:   { type: 'boolean', short: 'h' },
    },
    strict: true,
  });

  if (values.help) {
    console.log(`
LittleLobster Skill Dispatcher

Options:
  --skill, -s    Skill name (required)
  --params, -p   JSON params for the skill handler (default: {})
  --task-id, -t  Task ID for result callback (optional)
  --help, -h     Show this help

Available skills:
${Object.keys(SKILL_MAP).map(k => `  - ${k}`).join('\n')}
`);
    process.exit(0);
  }

  if (!values.skill) {
    console.error('Error: --skill is required');
    process.exit(1);
  }

  let params = {};
  if (values.params) {
    try {
      params = JSON.parse(values.params);
    } catch (e) {
      console.error('Error: --params must be valid JSON');
      process.exit(1);
    }
  }

  return {
    skill: values.skill,
    params,
    taskId: values['task-id'] || null,
  };
}

// --- Dispatcher ---------------------------------------------------------------

async function dispatch(skillName, params) {
  const key = skillName.toLowerCase().trim();
  const handlerPath = SKILL_MAP[key];

  if (!handlerPath) {
    const available = [...new Set(Object.values(SKILL_MAP))].map(v => path.basename(v, '.cjs'));
    throw new Error(
      `Unknown skill: "${skillName}". Available handlers: ${available.join(', ')}`
    );
  }

  const handler = require(handlerPath);

  if (typeof handler.execute !== 'function') {
    throw new Error(`Handler for "${skillName}" does not export an execute() function`);
  }

  return handler.execute(params);
}

// --- Main ---------------------------------------------------------------------

async function main() {
  const { skill, params, taskId } = parseCliArgs();

  const startTime = Date.now();
  try {
    const result = await dispatch(skill, params);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    const output = {
      ok: true,
      skill,
      taskId,
      elapsedSeconds: parseFloat(elapsed),
      result,
    };

    console.log(JSON.stringify(output, null, 2));
  } catch (err) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    const output = {
      ok: false,
      skill,
      taskId,
      elapsedSeconds: parseFloat(elapsed),
      error: err.message,
    };

    console.error(JSON.stringify(output, null, 2));
    process.exit(1);
  }
}

main();

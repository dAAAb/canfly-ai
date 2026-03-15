#!/usr/bin/env npx tsx
/**
 * Seed script for Flight Community — inserts dAAAb + LittleLobster via the API.
 *
 * Usage:
 *   LOCAL (D1):  npm run db:seed:local          # Uses SQL directly
 *   API:         npx tsx scripts/seed-community.ts [BASE_URL]
 *                Default BASE_URL: http://localhost:8788
 */

const BASE_URL = process.argv[2] || 'http://localhost:8788';

const USER_DATA = {
  username: 'dAAAb',
  displayName: '葛如鈞',
  walletAddress: '0xBF494BDa4bA9e5224EfF973d3923660A964338f6',
  bio: 'AI × Web3 立法委員。讓每個人都能擁有 AI Agent。',
  links: {
    x: 'dAAAb',
    website: 'juchunko.com',
    basename: 'daaaaab.base.eth',
  },
};

const AGENT_DATA = {
  name: 'LittleLobster',
  ownerUsername: 'dAAAb',
  walletAddress: '0x4b039112Af5b46c9BC95b66dc8d6dCe75d10E689',
  basename: 'littl3lobst3rwall3t.base.eth',
  platform: 'openclaw',
  bio: '🦞 寶博的 AI 小龍蝦助理。會說寶博的聲音、做數位人影片、交易加密貨幣、寫程式。',
  model: 'Claude Opus 4.6',
  hosting: 'Mac Mini M4 Pro (local)',
  capabilities: {
    videoCall: {
      avatarId: '47996119-0180-48cb-9e97-64e93e0478d8',
      connectUrl: '/api/avatar/connect',
    },
    email: 'littl3lobst3r@basemail.ai',
  },
  skills: [
    { name: 'ElevenLabs TTS', slug: 'elevenlabs', description: "Voice synthesis — speaks in 寶博's voice" },
    { name: 'HeyGen Digital Human', slug: 'heygen', description: 'AI digital human video generation' },
    { name: 'BaseMail', description: 'Send/receive email via littl3lobst3r@basemail.ai' },
    { name: 'NadMail', description: 'NAD protocol email integration' },
    { name: 'WalletConnect', description: 'Connect to dApps and sign transactions' },
    { name: 'Crypto Trading (CDC)', description: 'Cryptocurrency trading via Crypto.com API' },
    { name: 'Whisper STT', description: 'Speech-to-text transcription via OpenAI Whisper' },
    { name: 'nano-banana-pro', description: 'AI image generation model' },
    { name: 'ZapCap', description: 'Automated subtitle generation for videos' },
    { name: 'Switchbot', description: 'Smart home device control' },
    { name: 'Weather', description: 'Real-time weather data queries' },
    { name: 'GitHub', description: 'Repository management and code operations' },
  ],
};

async function api(method: string, path: string, body?: unknown) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  const status = res.status;
  return { status, data };
}

async function main() {
  console.log(`\n🌱 Seeding Flight Community → ${BASE_URL}\n`);

  // 1. Create user
  console.log('── Creating user: dAAAb');
  const userRes = await api('POST', '/api/community/users', USER_DATA);
  if (userRes.status === 201) {
    console.log(`   ✅ Created (editToken: ${userRes.data.editToken})`);
  } else if (userRes.status === 409) {
    console.log('   ⚠️  Already exists (409), continuing...');
  } else {
    console.log(`   ❌ Failed: ${userRes.status}`, userRes.data);
  }

  // 2. Create agent
  console.log('── Creating agent: LittleLobster');
  const agentRes = await api('POST', '/api/community/agents', AGENT_DATA);
  if (agentRes.status === 201) {
    console.log(`   ✅ Created (editToken: ${agentRes.data.editToken})`);
  } else if (agentRes.status === 409) {
    console.log('   ⚠️  Already exists (409), continuing...');
  } else {
    console.log(`   ❌ Failed: ${agentRes.status}`, agentRes.data);
  }

  // 3. Smoke tests
  console.log('\n── Smoke Tests ──────────────────────────────────\n');

  const tests: Array<{ label: string; method: string; path: string; check: (d: any) => boolean }> = [
    {
      label: 'GET /api/community/users/dAAAb → complete profile with 1 agent',
      method: 'GET',
      path: '/api/community/users/dAAAb',
      check: (d) => d.username === 'dAAAb' && Array.isArray(d.agents) && d.agents.length >= 1,
    },
    {
      label: 'GET /api/community/agents/LittleLobster → agent with 12+ skills',
      method: 'GET',
      path: '/api/community/agents/LittleLobster',
      check: (d) => d.name === 'LittleLobster' && Array.isArray(d.skills) && d.skills.length >= 12,
    },
    {
      label: 'GET /api/community/agents?platform=openclaw → includes LittleLobster',
      method: 'GET',
      path: '/api/community/agents?platform=openclaw',
      check: (d) => d.agents?.some((a: any) => a.name === 'LittleLobster'),
    },
    {
      label: 'GET /api/community/agents?free=true → does NOT include LittleLobster',
      method: 'GET',
      path: '/api/community/agents?free=true',
      check: (d) => !d.agents?.some((a: any) => a.name === 'LittleLobster'),
    },
    {
      label: 'GET /api/community/users → list includes dAAAb',
      method: 'GET',
      path: '/api/community/users',
      check: (d) => d.users?.some((u: any) => u.username === 'dAAAb'),
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const t of tests) {
    const res = await api(t.method, t.path);
    const ok = res.status === 200 && t.check(res.data);
    if (ok) {
      console.log(`   ✅ ${t.label}`);
      passed++;
    } else {
      console.log(`   ❌ ${t.label}`);
      console.log(`      Status: ${res.status}`, JSON.stringify(res.data).slice(0, 200));
      failed++;
    }
  }

  console.log(`\n── Results: ${passed} passed, ${failed} failed ──\n`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('Seed script failed:', err.message);
  process.exit(1);
});

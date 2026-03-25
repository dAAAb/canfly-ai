/**
 * Blog Post Writing handler
 *
 * Generates article content via OpenAI GPT-4o.
 *
 * Params:
 *   topic       - Article topic (required)
 *   lang        - Language: "en", "zh-TW", "zh-CN" (default: "en")
 *   tone        - Writing tone: "professional", "casual", "tutorial" (default: "professional")
 *   wordCount   - Target word count (default: 800)
 *   audience    - Target audience description (default: "tech-savvy readers")
 *   includeCode - Include code examples if relevant (default: false)
 *   outDir      - Output directory (default: /tmp/littlelobster)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// --- HTTP helper --------------------------------------------------------------

function jsonRequest(url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const payload = JSON.stringify(body);

    const req = https.request(parsed, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        ...headers,
      },
    }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString();
        try { resolve({ status: res.statusCode, data: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, data: raw }); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// --- Language map --------------------------------------------------------------

const LANG_INSTRUCTIONS = {
  'en': 'Write in English.',
  'zh-TW': '用繁體中文撰寫。語氣自然、貼近台灣讀者。',
  'zh-CN': '用简体中文撰写。语气自然、贴近大陆读者。',
};

// --- OpenAI article generation ------------------------------------------------

async function generateArticle(topic, lang, tone, wordCount, audience, includeCode) {
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set');

  const langInstruction = LANG_INSTRUCTIONS[lang] || LANG_INSTRUCTIONS['en'];
  const codeInstruction = includeCode
    ? 'Include relevant code examples with explanations.'
    : 'Do not include code examples unless absolutely necessary.';

  const systemPrompt = `You are a skilled technical writer for CanFly.ai, a platform that helps people get started with AI tools. ${langInstruction}

Writing style:
- Tone: ${tone}
- Target audience: ${audience}
- Target length: ~${wordCount} words
- ${codeInstruction}
- Use markdown formatting with headers, lists, and emphasis
- Include a compelling title (H1) and introduction
- End with a clear call-to-action or takeaway
- Brand voice: empowering ("Now You Can Fly"), accessible, practical`;

  const res = await jsonRequest('https://api.openai.com/v1/chat/completions', {
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Write a blog post about: ${topic}` },
    ],
    temperature: 0.7,
    max_tokens: 4096,
  }, {
    'Authorization': `Bearer ${OPENAI_API_KEY}`,
  });

  if (res.status !== 200) {
    throw new Error(`OpenAI API error ${res.status}: ${JSON.stringify(res.data)}`);
  }

  const content = res.data.choices?.[0]?.message?.content;
  if (!content) throw new Error('OpenAI returned no content');

  return {
    content,
    model: res.data.model,
    usage: res.data.usage,
  };
}

// --- Main handler -------------------------------------------------------------

async function execute(params = {}) {
  const {
    topic,
    lang = 'en',
    tone = 'professional',
    wordCount = 800,
    audience = 'tech-savvy readers',
    includeCode = false,
    outDir = '/tmp/littlelobster',
  } = params;

  if (!topic) throw new Error('Missing required param: topic');

  fs.mkdirSync(outDir, { recursive: true });

  const result = await generateArticle(topic, lang, tone, wordCount, audience, includeCode);

  // Save markdown file
  const timestamp = Date.now();
  const slug = topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60);
  const filename = `blog-${slug}-${timestamp}.md`;
  const filepath = path.join(outDir, filename);

  fs.writeFileSync(filepath, result.content, 'utf-8');

  // Rough word count
  const actualWords = result.content.split(/\s+/).length;

  return {
    filepath,
    filename,
    provider: 'openai',
    model: result.model,
    lang,
    tone,
    wordCount: actualWords,
    tokensUsed: result.usage,
  };
}

module.exports = { execute };

/**
 * AI Cover Image handler
 *
 * Generates cover images using Gemini (nano-banana-pro) or OpenAI as fallback.
 *
 * Params:
 *   prompt   - Image description (required)
 *   style    - Style hint: "photo", "illustration", "3d", "flat" (default: "illustration")
 *   width    - Width in px (default: 1200)
 *   height   - Height in px (default: 630)
 *   provider - Force provider: "gemini" | "openai" (default: auto)
 *   outDir   - Output directory (default: /tmp/littlelobster)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// --- HTTP helper --------------------------------------------------------------

function jsonRequest(url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const mod = parsed.protocol === 'https:' ? https : http;
    const payload = JSON.stringify(body);

    const req = mod.request(parsed, {
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

// --- Gemini image generation --------------------------------------------------

async function generateWithGemini(prompt, style) {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not set');

  const fullPrompt = style !== 'photo'
    ? `Create a ${style} style cover image: ${prompt}. High quality, vibrant colors, suitable for a blog or article header.`
    : `Professional photograph for a cover image: ${prompt}. High resolution, editorial quality.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`;

  const body = {
    contents: [{
      parts: [{ text: fullPrompt }],
    }],
    generationConfig: {
      responseModalities: ['IMAGE', 'TEXT'],
      imageMimeType: 'image/png',
    },
  };

  const res = await jsonRequest(url, body);
  if (res.status !== 200) {
    throw new Error(`Gemini API error ${res.status}: ${JSON.stringify(res.data)}`);
  }

  // Extract image from response
  const candidates = res.data.candidates || [];
  for (const candidate of candidates) {
    for (const part of (candidate.content?.parts || [])) {
      if (part.inlineData?.mimeType?.startsWith('image/')) {
        return {
          base64: part.inlineData.data,
          mimeType: part.inlineData.mimeType,
          provider: 'gemini',
        };
      }
    }
  }

  throw new Error('Gemini returned no image data');
}

// --- OpenAI image generation --------------------------------------------------

async function generateWithOpenAI(prompt, style, width, height) {
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set');

  // Map to closest DALL-E 3 size
  let size = '1792x1024'; // landscape default
  if (width === height) size = '1024x1024';
  else if (height > width) size = '1024x1792';

  const fullPrompt = `Cover image in ${style} style: ${prompt}. High quality, vibrant, suitable as a blog or article header image.`;

  const res = await jsonRequest('https://api.openai.com/v1/images/generations', {
    model: 'dall-e-3',
    prompt: fullPrompt,
    n: 1,
    size,
    quality: 'hd',
    response_format: 'b64_json',
  }, {
    'Authorization': `Bearer ${OPENAI_API_KEY}`,
  });

  if (res.status !== 200) {
    throw new Error(`OpenAI API error ${res.status}: ${JSON.stringify(res.data)}`);
  }

  const img = res.data.data?.[0];
  if (!img?.b64_json) throw new Error('OpenAI returned no image data');

  return {
    base64: img.b64_json,
    mimeType: 'image/png',
    provider: 'openai',
    revisedPrompt: img.revised_prompt,
  };
}

// --- Main handler -------------------------------------------------------------

async function execute(params = {}) {
  const {
    prompt,
    style = 'illustration',
    width = 1200,
    height = 630,
    provider = 'auto',
    outDir = '/tmp/littlelobster',
  } = params;

  if (!prompt) throw new Error('Missing required param: prompt');

  fs.mkdirSync(outDir, { recursive: true });

  let result;

  if (provider === 'gemini' || (provider === 'auto' && GEMINI_API_KEY)) {
    try {
      result = await generateWithGemini(prompt, style);
    } catch (err) {
      if (provider === 'gemini') throw err;
      // Fallback to OpenAI
      console.error(`Gemini failed (${err.message}), falling back to OpenAI`);
      result = await generateWithOpenAI(prompt, style, width, height);
    }
  } else {
    result = await generateWithOpenAI(prompt, style, width, height);
  }

  // Save to file
  const ext = result.mimeType === 'image/jpeg' ? 'jpg' : 'png';
  const timestamp = Date.now();
  const filename = `cover-${timestamp}.${ext}`;
  const filepath = path.join(outDir, filename);

  fs.writeFileSync(filepath, Buffer.from(result.base64, 'base64'));

  return {
    filepath,
    filename,
    provider: result.provider,
    mimeType: result.mimeType,
    sizeBytes: fs.statSync(filepath).size,
    revisedPrompt: result.revisedPrompt || null,
  };
}

module.exports = { execute };

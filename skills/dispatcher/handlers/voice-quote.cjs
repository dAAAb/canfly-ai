/**
 * Voice Quote Video handler
 *
 * Generates TTS audio via ElevenLabs (寶博 voice clone = "sag").
 * When HeyGen + ZapCap APIs are available, extends to full video pipeline.
 *
 * Current pipeline:  text → ElevenLabs TTS → MP3/WAV audio file
 * Future pipeline:   text → TTS → HeyGen avatar video → ZapCap subtitles → final MP4
 *
 * Params:
 *   text       - Text to speak (required)
 *   lang       - Language: "en", "zh-TW", "zh-CN" (default: "en")
 *   voiceId    - ElevenLabs voice ID (default: env SAG_VOICE_ID or "pNInz6obpgDQGcFmaJgB" — Adam)
 *   model      - ElevenLabs model (default: "eleven_multilingual_v2")
 *   format     - Output format: "mp3_44100_128" | "pcm_16000" (default: "mp3_44100_128")
 *   outDir     - Output directory (default: /tmp/littlelobster)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const SAG_VOICE_ID = process.env.SAG_VOICE_ID || 'pNInz6obpgDQGcFmaJgB'; // default: Adam

// --- HTTP helper for binary response -----------------------------------------

function binaryRequest(url, body, headers = {}) {
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
        const buf = Buffer.concat(chunks);
        if (res.statusCode !== 200) {
          try {
            const err = JSON.parse(buf.toString());
            reject(new Error(`ElevenLabs ${res.statusCode}: ${JSON.stringify(err)}`));
          } catch {
            reject(new Error(`ElevenLabs ${res.statusCode}: ${buf.toString().slice(0, 200)}`));
          }
          return;
        }
        resolve({ status: res.statusCode, buffer: buf, headers: res.headers });
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// --- ElevenLabs TTS -----------------------------------------------------------

async function generateTTS(text, voiceId, model, format) {
  if (!ELEVENLABS_API_KEY) throw new Error('ELEVENLABS_API_KEY not set');

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

  const body = {
    text,
    model_id: model,
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.75,
      style: 0.0,
      use_speaker_boost: true,
    },
  };

  const res = await binaryRequest(url, body, {
    'xi-api-key': ELEVENLABS_API_KEY,
    'Accept': 'audio/mpeg',
  });

  return res.buffer;
}

// --- Main handler -------------------------------------------------------------

async function execute(params = {}) {
  const {
    text,
    lang = 'en',
    voiceId = SAG_VOICE_ID,
    model = 'eleven_multilingual_v2',
    format = 'mp3_44100_128',
    outDir = '/tmp/littlelobster',
  } = params;

  if (!text) throw new Error('Missing required param: text');

  fs.mkdirSync(outDir, { recursive: true });

  // Step 1: Generate TTS audio
  const audioBuffer = await generateTTS(text, voiceId, model, format);

  const ext = format.startsWith('pcm') ? 'wav' : 'mp3';
  const timestamp = Date.now();
  const filename = `voice-${timestamp}.${ext}`;
  const filepath = path.join(outDir, filename);

  fs.writeFileSync(filepath, audioBuffer);

  const result = {
    step: 'tts',
    filepath,
    filename,
    provider: 'elevenlabs',
    voiceId,
    model,
    lang,
    sizeBytes: audioBuffer.length,
    durationEstimate: `~${Math.ceil(text.length / 15)}s`,
  };

  // Step 2: HeyGen avatar video (future — requires HEYGEN_API_KEY)
  if (process.env.HEYGEN_API_KEY) {
    result.heygenNote = 'HeyGen integration ready — implement when API key is provisioned';
  }

  // Step 3: ZapCap subtitles (future — requires ZAPCAP_API_KEY)
  if (process.env.ZAPCAP_API_KEY) {
    result.zapcapNote = 'ZapCap integration ready — implement when API key is provisioned';
  }

  return result;
}

module.exports = { execute };

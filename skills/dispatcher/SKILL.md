# dispatcher — LittleLobster Skill Execution Engine

Local execution dispatcher for LittleLobster (CMO/素材長). Routes task requests to skill handlers and returns structured JSON results.

## Available Skills

| Skill | Handler | API Provider | Status |
|-------|---------|-------------|--------|
| AI Cover Image | `cover-image.cjs` | Gemini (nano-banana-pro) + OpenAI DALL-E 3 fallback | ✅ Live |
| Voice Quote Video | `voice-quote.cjs` | ElevenLabs TTS (sag voice) | ✅ TTS live, HeyGen/ZapCap pending |
| Blog Post Writing | `blog-post.cjs` | OpenAI GPT-4o | ✅ Live |
| Onchain Research Report | `onchain-research.cjs` | Base/Ethereum RPC + OpenAI analysis | ✅ Live |

## Quick Start

```bash
# Generate a cover image
node skills/dispatcher/dispatch.cjs \
  --skill "AI Cover Image" \
  --params '{"prompt":"AI agents collaborating in a futuristic workspace"}'

# Generate voice audio (TTS)
node skills/dispatcher/dispatch.cjs \
  --skill "Voice Quote Video" \
  --params '{"text":"歡迎來到 CanFly.ai！現在你可以飛了。","lang":"zh-TW"}'

# Write a blog post
node skills/dispatcher/dispatch.cjs \
  --skill "Blog Post Writing" \
  --params '{"topic":"How AI agents are changing content creation","lang":"en","tone":"tutorial"}'

# Onchain research
node skills/dispatcher/dispatch.cjs \
  --skill "Onchain Research Report" \
  --params '{"address":"0xE1D1D3526A6FAa37eb36bD10B933C1b77f4561a4","chain":"base"}'
```

## Output Format

All skills return JSON to stdout:

```json
{
  "ok": true,
  "skill": "AI Cover Image",
  "taskId": null,
  "elapsedSeconds": 3.2,
  "result": {
    "filepath": "/tmp/littlelobster/cover-1711234567890.png",
    "filename": "cover-1711234567890.png",
    "provider": "gemini",
    "mimeType": "image/png",
    "sizeBytes": 245678
  }
}
```

On error:

```json
{
  "ok": false,
  "skill": "AI Cover Image",
  "error": "Missing required param: prompt"
}
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | For cover images | Google Gemini API key (nano-banana-pro) |
| `OPENAI_API_KEY` | For images/blog/research | OpenAI API key (DALL-E 3 + GPT-4o) |
| `ELEVENLABS_API_KEY` | For voice | ElevenLabs API key |
| `SAG_VOICE_ID` | Optional | ElevenLabs voice clone ID (default: Adam) |
| `HEYGEN_API_KEY` | Future | HeyGen avatar video API |
| `ZAPCAP_API_KEY` | Future | ZapCap subtitle API |

## Skill Details

### AI Cover Image

Generates images via Gemini (primary) with DALL-E 3 fallback.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `prompt` | string | **required** | Image description |
| `style` | string | `"illustration"` | `"photo"`, `"illustration"`, `"3d"`, `"flat"` |
| `width` | number | `1200` | Width in pixels |
| `height` | number | `630` | Height in pixels |
| `provider` | string | `"auto"` | Force `"gemini"` or `"openai"` |
| `outDir` | string | `/tmp/littlelobster` | Output directory |

### Voice Quote Video

TTS via ElevenLabs. Full video pipeline (HeyGen + ZapCap) pending API keys.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `text` | string | **required** | Text to speak |
| `lang` | string | `"en"` | `"en"`, `"zh-TW"`, `"zh-CN"` |
| `voiceId` | string | env `SAG_VOICE_ID` | ElevenLabs voice ID |
| `model` | string | `"eleven_multilingual_v2"` | ElevenLabs model |
| `outDir` | string | `/tmp/littlelobster` | Output directory |

### Blog Post Writing

Article generation via OpenAI GPT-4o.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `topic` | string | **required** | Article topic |
| `lang` | string | `"en"` | Output language |
| `tone` | string | `"professional"` | `"professional"`, `"casual"`, `"tutorial"` |
| `wordCount` | number | `800` | Target word count |
| `audience` | string | `"tech-savvy readers"` | Target audience |
| `includeCode` | boolean | `false` | Include code examples |
| `outDir` | string | `/tmp/littlelobster` | Output directory |

### Onchain Research Report

On-chain analysis via Base/Ethereum RPC with AI-powered report generation.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `address` | string | **required** | `0x`-prefixed address (40 hex chars) |
| `chain` | string | `"base"` | `"base"` or `"ethereum"` |
| `depth` | string | `"standard"` | `"quick"`, `"standard"`, `"deep"` |
| `outDir` | string | `/tmp/littlelobster` | Output directory |

## Architecture

```
skills/dispatcher/
├── dispatch.cjs              # Entry point — CLI arg parsing + routing
├── handlers/
│   ├── cover-image.cjs       # Gemini / OpenAI DALL-E 3
│   ├── voice-quote.cjs       # ElevenLabs TTS (+future HeyGen/ZapCap)
│   ├── blog-post.cjs         # OpenAI GPT-4o
│   └── onchain-research.cjs  # Base RPC + OpenAI analysis
└── SKILL.md                  # This file
```

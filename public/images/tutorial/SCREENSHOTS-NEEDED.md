# Tutorial Screenshots Needed

Screenshots should be captured from UTM VMs. The ScreenshotGallery component
gracefully hides images that fail to load, so pages work fine without them.

## Ollama Tutorial — Step 0: Install

| Filename | VM | What to capture |
|---|---|---|
| `ollama-mac-installer.png` | macOS | Ollama.app drag-to-Applications installer |
| `ollama-linux-install.png` | Linux | Terminal showing `curl -fsSL https://ollama.com/install.sh \| sh` output |
| `ollama-win-installer.png` | Win EN | Windows installer wizard |

## Ollama Tutorial — Step 1: Download Model

| Filename | VM | What to capture |
|---|---|---|
| `ollama-pull-model.png` | Any | Terminal showing `ollama pull llama3.2` progress bar |

## Ollama Tutorial — Step 2: Chat

| Filename | VM | What to capture |
|---|---|---|
| `ollama-chat-session.png` | Any | Terminal showing `ollama run llama3.2` interactive chat |

## Ollama Tutorial — Step 3: Connect to OpenClaw

| Filename | VM | What to capture |
|---|---|---|
| `openclaw-ollama-config.png` | macOS | OpenClaw settings page with Ollama model selected |

## Image Guidelines

- **Format**: PNG, optimized (use `pngquant` or similar)
- **Width**: 1200px max (will be responsive)
- **Theme**: Match dark theme if possible (dark terminal backgrounds)
- **Language**: Capture both EN and zh-TW versions if applicable
- **Size**: Keep under 200KB each for fast loading

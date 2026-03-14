#!/usr/bin/env python3
"""Generate hero images for 18 CanFly.ai products using Gemini 2.5 Flash Image API."""

import json, os, sys, time, base64, urllib.request, urllib.error

API_KEY = os.environ.get("GEMINI_API_KEY")
if not API_KEY:
    print("ERROR: GEMINI_API_KEY not set")
    sys.exit(1)

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "images", "products")
ICON_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "images", "icons")

# Product definitions: (slug, display_name, brand_color, description_hint)
PRODUCTS = [
    ("ollama", "Ollama", "#7C3AED", "llama silhouette logo, AI model runner, purple brand"),
    ("omlx", "oMLX", "#00D4AA", "Apple Silicon MLX framework, green/teal brand, Mac menu bar app"),
    ("openclaw", "OpenClaw", "#FF6B35", "open-source AI agent platform, claw/paw logo, orange brand"),
    ("zeabur", "Zeabur", "#6366F1", "cloud deployment platform, indigo/purple brand, cloud icon"),
    ("elevenlabs", "ElevenLabs", "#00C9A7", "AI voice synthesis, sound wave visualization, teal/green brand"),
    ("heygen", "HeyGen", "#FF4F8B", "AI video generation, digital avatar, pink/magenta brand"),
    ("umbrel", "Umbrel", "#5351FB", "personal home cloud server, umbrella logo, purple/blue brand"),
    ("pinata", "Pinata", "#E4B34D", "IPFS Web3 storage, piñata icon, yellow/gold brand"),
    ("switchbot-ai-hub", "SwitchBot AI Hub", "#FF5722", "smart home AI hub device, orange/red brand, IoT"),
    ("perplexity", "Perplexity", "#20B2AA", "AI search engine, magnifying glass, teal brand"),
    ("even-g2-bridge", "Even Realities G2 Bridge", "#00BFFF", "smart glasses AI bridge, futuristic eyewear, sky blue brand"),
    ("whisper", "Whisper", "#10A37F", "speech-to-text AI, sound wave to text, OpenAI green brand"),
    ("brave-search", "Brave Search API", "#FB542B", "privacy web search, lion shield logo, orange/red brand"),
    ("basemail", "BaseMail", "#0052FF", "crypto-native email for AI agents, Base chain blue, blockchain mail"),
    ("agentmail", "AgentMail", "#6C5CE7", "email infrastructure for AI agents, envelope icon, purple brand"),
    ("agentcard", "AgentCard", "#00D2FF", "virtual Visa cards for AI agents, credit card icon, cyan brand"),
    ("utm", "UTM", "#2196F3", "virtual machines for Mac, VM window icon, blue brand"),
    ("virtual-buddy", "Virtual Buddy", "#A855F7", "one-click Linux VM setup on Mac, friendly robot, purple brand"),
]

BASE_PROMPT = """Generate a hero banner image for the software/tech product "{name}".

STRICT STYLE REQUIREMENTS:
- Deep dark navy blue background (#0a1628 to #0f1d35 gradient)
- Product concept/logo representation centered in the image
- {brand_color} colored glow/halo effect radiating from behind the central element
- Subtle geometric grid lines or circuit board traces in the background
- Wide 16:9 landscape format, 1600x900 pixels
- Modern, clean, minimal, professional tech aesthetic
- NO text, NO words, NO letters, NO watermarks anywhere in the image
- The central element should represent: {hint}
- Dark, moody, futuristic atmosphere consistent with a dark-theme tech website
"""

MODEL = "gemini-2.5-flash-image"
URL = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={API_KEY}"


def generate_image(slug, name, brand_color, hint):
    outpath = os.path.join(OUTPUT_DIR, f"{slug}-hero.png")
    if os.path.exists(outpath) and os.path.getsize(outpath) > 10000:
        print(f"  SKIP {slug} (already exists: {os.path.getsize(outpath)} bytes)")
        return True

    prompt = BASE_PROMPT.format(name=name, brand_color=brand_color, hint=hint)

    # Check if icon exists to use as reference
    icon_path = None
    for ext in [".png", ".svg", ".webp", ".jpg"]:
        candidate = os.path.join(ICON_DIR, f"{slug}{ext}")
        # Also check alternate names
        alt_names = {
            "even-g2-bridge": "even-g2",
            "switchbot-ai-hub": "switchbot-ai-hub",
            "brave-search": "brave-search",
        }
        alt = alt_names.get(slug, slug)
        candidate2 = os.path.join(ICON_DIR, f"{alt}{ext}")
        for c in [candidate, candidate2]:
            if os.path.exists(c) and ext != ".svg":
                icon_path = c
                break
        if icon_path:
            break

    parts = [{"text": prompt}]

    # Include icon as input reference if available (not SVG)
    if icon_path and icon_path.endswith((".png", ".jpg", ".webp")):
        with open(icon_path, "rb") as f:
            icon_data = base64.b64encode(f.read()).decode()
        mime = "image/png" if icon_path.endswith(".png") else "image/jpeg" if icon_path.endswith(".jpg") else "image/webp"
        parts.insert(0, {"inlineData": {"mimeType": mime, "data": icon_data}})
        parts.insert(1, {"text": f"Here is the {name} product icon/logo for reference. Use its visual style and shape as inspiration for the central element in the hero banner."})

    payload = {
        "contents": [{"parts": parts}],
        "generationConfig": {"responseModalities": ["IMAGE", "TEXT"]},
    }

    data = json.dumps(payload).encode()
    req = urllib.request.Request(URL, data=data, headers={"Content-Type": "application/json"})

    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            result = json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"  ERROR {slug}: HTTP {e.code} — {body[:200]}")
        return False
    except Exception as e:
        print(f"  ERROR {slug}: {e}")
        return False

    if "error" in result:
        print(f"  ERROR {slug}: {result['error'].get('message', '')[:200]}")
        return False

    candidates = result.get("candidates", [{}])
    parts_out = candidates[0].get("content", {}).get("parts", [])

    for p in parts_out:
        if "inlineData" in p:
            img_data = base64.b64decode(p["inlineData"]["data"])
            with open(outpath, "wb") as f:
                f.write(img_data)
            print(f"  OK {slug}: {len(img_data)} bytes → {outpath}")
            return True

    print(f"  WARN {slug}: no image in response")
    for p in parts_out:
        if "text" in p:
            print(f"    Text: {p['text'][:200]}")
    return False


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    success = 0
    failed = []

    for i, (slug, name, color, hint) in enumerate(PRODUCTS):
        print(f"[{i+1}/{len(PRODUCTS)}] Generating {name}...")
        if generate_image(slug, name, color, hint):
            success += 1
        else:
            failed.append(slug)
        # Rate limit: small delay between requests
        if i < len(PRODUCTS) - 1:
            time.sleep(2)

    print(f"\nDone: {success}/{len(PRODUCTS)} succeeded")
    if failed:
        print(f"Failed: {', '.join(failed)}")
    return 0 if not failed else 1


if __name__ == "__main__":
    sys.exit(main())

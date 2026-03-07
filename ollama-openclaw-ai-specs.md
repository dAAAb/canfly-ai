# Ollama + OpenClaw Tutorial - AI Agent Specifications

## llms.txt Structure

```
# Ollama + OpenClaw Setup Tutorial
## Description
Complete automation script for installing and configuring Ollama with OpenClaw
## Duration
5-10 minutes
## Requirements
- 8GB+ RAM
- 5GB+ storage
- Internet connection for initial download
## Automation Level
Fully automated with verification steps
```

## JSON-LD Structured Data

```json
{
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": "Setup Ollama with OpenClaw - Free AI Agent Installation",
  "description": "Complete guide to install and configure Ollama with OpenClaw for free local AI agents",
  "totalTime": "PT10M",
  "supply": [
    "Computer with 8GB+ RAM",
    "Internet connection",
    "Terminal access"
  ],
  "tool": ["Ollama", "OpenClaw", "Terminal"],
  "step": [
    {
      "@type": "HowToStep",
      "position": 1,
      "name": "Install Ollama",
      "text": "Install Ollama on your system using the official installer",
      "url": "https://canfly.ai/learn/ollama#step-1",
      "supply": "Terminal",
      "code": "curl -fsSL https://ollama.ai/install.sh | sh"
    },
    {
      "@type": "HowToStep",
      "position": 2,
      "name": "Start Ollama Service",
      "text": "Start the Ollama background service",
      "url": "https://canfly.ai/learn/ollama#step-2",
      "code": "ollama serve"
    },
    {
      "@type": "HowToStep",
      "position": 3,
      "name": "Download AI Model",
      "text": "Download a lightweight AI model for fast responses",
      "url": "https://canfly.ai/learn/ollama#step-3",
      "code": "ollama pull llama3.2:3b"
    },
    {
      "@type": "HowToStep",
      "position": 4,
      "name": "Test AI Agent",
      "text": "Verify the AI agent is working correctly",
      "url": "https://canfly.ai/learn/ollama#step-4",
      "code": "ollama run llama3.2:3b \"Hello! Please introduce yourself.\""
    },
    {
      "@type": "HowToStep",
      "position": 5,
      "name": "Configure OpenClaw",
      "text": "Connect OpenClaw to your local Ollama instance",
      "url": "https://canfly.ai/learn/ollama#step-5",
      "code": "export OLLAMA_HOST=\"http://localhost:11434\"\nexport AI_MODEL=\"llama3.2:3b\""
    }
  ],
  "yield": "Functional local AI agent connected to OpenClaw"
}
```

## Complete Automation Script for AI Agents

```bash
#!/bin/bash
# Ollama + OpenClaw Complete Setup Script
# For AI agents to execute automatically

set -e  # Exit on any error

echo "🤖 Starting Ollama + OpenClaw automated setup..."

# Step 1: Install Ollama
echo "📦 Installing Ollama..."
if command -v ollama &> /dev/null; then
    echo "✅ Ollama already installed"
else
    if [[ "$OSTYPE" == "darwin"* ]] || [[ "$OSTYPE" == "linux-gnu"* ]]; then
        curl -fsSL https://ollama.ai/install.sh | sh
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
        echo "❌ Windows detected - please run: iwr -useb https://ollama.ai/install.ps1 | iex"
        exit 1
    fi
fi

# Step 2: Start Ollama service (background)
echo "🚀 Starting Ollama service..."
if pgrep -f "ollama serve" > /dev/null; then
    echo "✅ Ollama service already running"
else
    ollama serve &
    OLLAMA_PID=$!
    echo "⏱️  Waiting for service to start..."
    sleep 5
fi

# Step 3: Download recommended model
echo "🧠 Downloading AI model (llama3.2:3b)..."
ollama pull llama3.2:3b

# Step 4: Verify installation
echo "🔍 Testing AI agent..."
RESPONSE=$(ollama run llama3.2:3b "Hello! Respond with exactly: 'AI agent working correctly.'" --format json 2>/dev/null | jq -r '.response' 2>/dev/null || echo "")

if [[ "$RESPONSE" == *"working correctly"* ]]; then
    echo "✅ AI agent test passed"
else
    echo "❌ AI agent test failed - response: $RESPONSE"
    exit 1
fi

# Step 5: Configure environment for OpenClaw
echo "⚙️  Configuring OpenClaw environment..."
export OLLAMA_HOST="http://localhost:11434"
export AI_MODEL="llama3.2:3b"

# Verify API endpoint
echo "🌐 Testing API connection..."
API_RESPONSE=$(curl -s http://localhost:11434/api/tags || echo "failed")
if [[ "$API_RESPONSE" == *"models"* ]]; then
    echo "✅ API connection successful"
else
    echo "❌ API connection failed"
    exit 1
fi

# Step 6: Create persistent configuration
echo "💾 Creating persistent configuration..."
cat > ~/.ollama_openclaw_env << EOF
# Ollama + OpenClaw Configuration
export OLLAMA_HOST="http://localhost:11434"
export AI_MODEL="llama3.2:3b"
export OLLAMA_MODELS_PATH="$HOME/.ollama/models"
EOF

# Add to shell profile if not exists
if ! grep -q "ollama_openclaw_env" ~/.bashrc 2>/dev/null && ! grep -q "ollama_openclaw_env" ~/.zshrc 2>/dev/null; then
    if [[ "$SHELL" == *"zsh"* ]]; then
        echo "source ~/.ollama_openclaw_env" >> ~/.zshrc
    else
        echo "source ~/.ollama_openclaw_env" >> ~/.bashrc
    fi
fi

echo "🎉 Setup completed successfully!"
echo "📊 Installation summary:"
echo "   - Ollama service: Running on localhost:11434"
echo "   - AI model: llama3.2:3b (2GB)"
echo "   - OpenClaw config: Ready"
echo "   - Environment: Configured"
echo ""
echo "🚀 Next steps:"
echo "   - Deploy to cloud: https://canfly.ai/learn/zeabur"
echo "   - Add voice: https://canfly.ai/apps/elevenlabs"
echo "   - Create videos: https://canfly.ai/apps/heygen"
echo ""
echo "💬 Test your agent:"
echo "   ollama run llama3.2:3b \"Hello! What can you help me with?\""
```

## Hidden API Blocks (for HTML integration)

```html
<!-- AI-ONLY: Complete API Reference -->
<div class="ai-only" style="display: none;">
  <h3>Ollama API Reference</h3>

  <h4>Installation Verification</h4>
  <pre>
# Check if Ollama is installed
which ollama

# Verify service is running
curl -s http://localhost:11434/api/version
  </pre>

  <h4>Model Management</h4>
  <pre>
# List available models
curl http://localhost:11434/api/tags

# Pull specific model
curl -X POST http://localhost:11434/api/pull -d '{"name": "llama3.2:3b"}'

# Remove model
curl -X DELETE http://localhost:11434/api/delete -d '{"name": "model_name"}'
  </pre>

  <h4>Chat API</h4>
  <pre>
# Send message to model
curl -X POST http://localhost:11434/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama3.2:3b",
    "prompt": "Hello! Introduce yourself.",
    "stream": false
  }'
  </pre>

  <h4>OpenClaw Integration</h4>
  <pre>
# Environment configuration
export OLLAMA_HOST="http://localhost:11434"
export AI_MODEL="llama3.2:3b"
export OLLAMA_NUM_PARALLEL=1
export OLLAMA_MAX_LOADED_MODELS=1

# Test connection from OpenClaw
curl -X POST $OLLAMA_HOST/api/generate \
  -H "Content-Type: application/json" \
  -d "{\"model\": \"$AI_MODEL\", \"prompt\": \"test\", \"stream\": false}"
  </pre>

  <h4>Performance Optimization</h4>
  <pre>
# Set memory limits
export OLLAMA_HOST="http://localhost:11434"
export OLLAMA_ORIGINS="http://localhost:*"
export OLLAMA_NUM_PARALLEL=1

# GPU acceleration (if available)
export OLLAMA_GPU_LAYERS=35
  </pre>
</div>

<!-- AI-ONLY: Troubleshooting Commands -->
<div class="ai-only" style="display: none;">
  <h3>Automated Troubleshooting</h3>

  <h4>Service Issues</h4>
  <pre>
# Kill existing Ollama processes
pkill -f ollama

# Restart service
ollama serve &

# Check service status
curl -f http://localhost:11434/api/version || echo "Service not responding"
  </pre>

  <h4>Model Issues</h4>
  <pre>
# Clear model cache
rm -rf ~/.ollama/models/blobs/*

# Re-download models
ollama pull llama3.2:3b

# Verify models
curl http://localhost:11434/api/tags | jq '.models[].name'
  </pre>

  <h4>Memory Issues</h4>
  <pre>
# Check system memory
free -h

# Use smaller model if needed
ollama pull llama3.2:1b

# Monitor Ollama memory usage
ps aux | grep ollama
  </pre>
</div>
```

## Machine-Readable Configuration

```yaml
# ollama-openclaw-config.yml
# For AI agents to parse and execute

name: "Ollama + OpenClaw Setup"
version: "1.0"
type: "installation_tutorial"

requirements:
  memory_gb: 8
  storage_gb: 5
  os: ["macOS", "Linux", "Windows"]
  network: true

steps:
  - id: "install"
    name: "Install Ollama"
    type: "command"
    commands:
      macos_linux: "curl -fsSL https://ollama.ai/install.sh | sh"
      windows: "iwr -useb https://ollama.ai/install.ps1 | iex"
    verification: "which ollama"

  - id: "start_service"
    name: "Start Service"
    type: "background_process"
    command: "ollama serve"
    verification: "curl -s http://localhost:11434/api/version"

  - id: "download_model"
    name: "Download Model"
    type: "download"
    command: "ollama pull llama3.2:3b"
    size_mb: 2048
    verification: "ollama list | grep llama3.2:3b"

  - id: "test_agent"
    name: "Test Agent"
    type: "verification"
    command: "ollama run llama3.2:3b 'Hello!'"
    expected_output: "Hello"

  - id: "configure_openclaw"
    name: "Configure OpenClaw"
    type: "environment"
    variables:
      OLLAMA_HOST: "http://localhost:11434"
      AI_MODEL: "llama3.2:3b"

next_steps:
  - name: "Deploy to Zeabur"
    url: "/learn/zeabur"
    affiliate: "code:OpenClaw"
  - name: "Add ElevenLabs Voice"
    url: "/apps/elevenlabs"
    affiliate: "22_percent_recurring"
  - name: "Add HeyGen Video"
    url: "/apps/heygen"
    affiliate: "20_percent_recurring"

troubleshooting:
  - problem: "command_not_found"
    solution: "restart_terminal"
  - problem: "connection_refused"
    solution: "check_ollama_serve"
  - problem: "out_of_memory"
    solution: "use_smaller_model"
```

## API Integration Points

```javascript
// For web integration and AI agent consumption

const OllamaOpenClawTutorial = {
  id: 'ollama-openclaw',
  name: 'Ollama + OpenClaw Setup',
  difficulty: 'beginner',
  duration: 600, // seconds

  // AI agent can execute these steps
  automationScript: `
    #!/bin/bash
    curl -fsSL https://ollama.ai/install.sh | sh
    ollama serve &
    sleep 5
    ollama pull llama3.2:3b
    export OLLAMA_HOST="http://localhost:11434"
    export AI_MODEL="llama3.2:3b"
    echo "Setup complete"
  `,

  // Verification endpoints
  verification: {
    installation: 'which ollama',
    service: 'curl -s http://localhost:11434/api/version',
    model: 'curl -s http://localhost:11434/api/tags',
    config: 'echo $OLLAMA_HOST && echo $AI_MODEL'
  },

  // For affiliate tracking
  nextSteps: [
    {
      name: 'zeabur_deploy',
      url: '/learn/zeabur',
      affiliateCode: 'OpenClaw',
      discount: '10_percent'
    },
    {
      name: 'elevenlabs_voice',
      url: '/apps/elevenlabs',
      affiliateLink: 'https://try.elevenlabs.io/clawhub',
      commission: '22_percent_recurring'
    }
  ]
};
```
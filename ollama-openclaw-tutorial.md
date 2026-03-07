# Your First AI Agent in 5 Minutes - 100% Free
# 5分鐘打造你的第一隻AI智能體 - 完全免費

> **English**: Turn your computer into an AI-powered assistant without spending a penny. No API keys, no subscriptions, just pure local AI magic.

> **中文**: 將你的電腦變成AI助手，完全免費。不需API金鑰，不用訂閱，純粹的本地AI魔法。

## What You'll Build | 你將建造什麼

**English**: A personal AI agent that:
- Runs completely on your computer (private & secure)
- Answers questions and helps with tasks
- Works offline once set up
- Can be upgraded with voice, video, and cloud features

**中文**: 一個個人AI智能體：
- 完全在你的電腦上運行（私密且安全）
- 回答問題並協助完成任務
- 設置完成後可離線工作
- 可升級語音、影片和雲端功能

## Requirements | 系統需求

- **Computer | 電腦**: Mac, Windows, or Linux | Mac、Windows 或 Linux
- **Memory | 記憶體**: 8GB+ RAM recommended | 建議8GB+記憶體
- **Storage | 儲存空間**: 5GB free space | 5GB可用空間
- **Time | 時間**: 5-10 minutes | 5-10分鐘
- **Cost | 費用**: $0 | 免費

---

## Step 1: Install Ollama | 步驟1：安裝Ollama

### Quick Install (Recommended) | 快速安裝（推薦）

**English**: The easiest way to get started.

**中文**: 最簡單的入門方式。

#### For Mac & Linux | Mac和Linux系統:

```bash
# One-line installation
curl -fsSL https://ollama.ai/install.sh | sh
```

#### For Windows | Windows系統:

```powershell
# PowerShell installation
iwr -useb https://ollama.ai/install.ps1 | iex
```

#### Alternative: Manual Download | 替代方案：手動下載

**English**: Visit [ollama.ai/download](https://ollama.ai/download) and download the installer for your system.

**中文**: 造訪 [ollama.ai/download](https://ollama.ai/download) 下載適合你系統的安裝程式。

### Expected Result | 預期結果

**English**: You should see:
```
✅ Ollama has been installed to /usr/local/bin/ollama
✅ Run 'ollama' to get started
```

**中文**: 你應該看到：
```
✅ Ollama已安裝至 /usr/local/bin/ollama
✅ 執行 'ollama' 開始使用
```

### Troubleshooting | 故障排除

**Problem | 問題**: "Command not found" | "找不到指令"
**Solution | 解決方案**: Restart your terminal and try again. If still not working, check if the installation path is in your system PATH.
**中文解決方案**: 重新啟動終端機再試一次。如仍無法使用，檢查安裝路徑是否已加入系統PATH。

---

## Step 2: Start Ollama Service | 步驟2：啟動Ollama服務

**English**: Start the Ollama background service.

**中文**: 啟動Ollama背景服務。

```bash
# Start the service
ollama serve
```

### Expected Result | 預期結果

**English**: You should see:
```
time=2024-XX-XX level=INFO source=images.go:XXX msg="total blobs: 0"
time=2024-XX-XX level=INFO source=images.go:XXX msg="total unused blobs removed: 0"
time=2024-XX-XX level=INFO source=routes.go:XXX msg="Listening on 127.0.0.1:11434 (version X.X.X)"
time=2024-XX-XX level=INFO source=payload.go:XXX msg="Dynamic LLM libraries [cpu]"
```

**中文**: 你應該看到：
```
time=2024-XX-XX level=INFO source=images.go:XXX msg="total blobs: 0"
time=2024-XX-XX level=INFO source=images.go:XXX msg="total unused blobs removed: 0"
time=2024-XX-XX level=INFO source=routes.go:XXX msg="Listening on 127.0.0.1:11434 (version X.X.X)"
time=2024-XX-XX level=INFO source=payload.go:XXX msg="Dynamic LLM libraries [cpu]"
```

### Tips | 小提示

**English**:
- Keep this terminal window open while using Ollama
- You can also run this as a system service for automatic startup

**中文**:
- 使用Ollama時請保持此終端機視窗開啟
- 你也可以將此設定為系統服務以便自動啟動

---

## Step 3: Download Your First AI Model | 步驟3：下載你的第一個AI模型

**English**: Choose your AI "brain". We recommend starting with a small, fast model.

**中文**: 選擇你的AI「大腦」。我們建議從小型、快速的模型開始。

### Recommended Models | 推薦模型

#### Option A: Ultra-Fast (1.3GB) | 選項A：超高速（1.3GB）

```bash
# Perfect for beginners and slower computers
ollama pull llama3.2:1b
```

#### Option B: Balanced (2GB) | 選項B：平衡型（2GB）

```bash
# Good balance of speed and capability
ollama pull llama3.2:3b
```

#### Option C: Chinese-Optimized (2GB) | 選項C：中文最佳化（2GB）

```bash
# Best for Chinese conversations
ollama pull qwen2.5:3b
```

### Expected Result | 預期結果

**English**: You'll see a download progress bar:
```
pulling manifest
pulling 8eeb52dfb3bb... 100% ▕████████████████▏ 1.4 GB
pulling 097a36493f71... 100% ▕████████████████▏ 8.4 KB
pulling 109037bec39c... 100% ▕████████████████▏  136 B
pulling 881f5bb9c897... 100% ▕████████████████▏  11 KB
pulling 5f113c7b5d66... 100% ▕████████████████▏  544 B
verifying sha256 digest
writing manifest
removing any unused layers
success
```

**中文**: 你會看到下載進度條：
```
pulling manifest
pulling 8eeb52dfb3bb... 100% ▕████████████████▏ 1.4 GB
pulling 097a36493f71... 100% ▕████████████████▏ 8.4 KB
pulling 109037bec39c... 100% ▕████████████████▏  136 B
pulling 881f5bb9c897... 100% ▕████████████████▏  11 KB
pulling 5f113c7b5d66... 100% ▕████████████████▏  544 B
verifying sha256 digest
writing manifest
removing any unused layers
success
```

---

## Step 4: Test Your AI Agent | 步驟4：測試你的AI智能體

**English**: Time for the magic moment - let's talk to your AI!

**中文**: 魔法時刻到了 - 讓我們跟你的AI對話！

### First Conversation | 第一次對話

```bash
# Start chatting (replace with your chosen model)
ollama run llama3.2:3b
```

### Test Prompts | 測試提示

**English Test**:
```
>>> Hello! Please introduce yourself and tell me what you can help with.
```

**中文測試**:
```
>>> 你好！請介紹一下自己，告訴我你能幫助什麼？
```

### Expected Result | 預期結果

**English**: Your AI should respond with something like:
```
Hello! I'm an AI assistant created by Meta. I can help you with a wide variety of tasks including:

- Answering questions on many topics
- Writing and editing text
- Brainstorming ideas
- Problem-solving
- Simple coding tasks
- Creative writing
- And much more!

What would you like help with today?
```

**中文**: 你的AI應該回應類似內容：
```
你好！我是Meta創建的AI助手。我可以幫助你處理各種任務，包括：

- 回答各種主題的問題
- 撰寫和編輯文本
- 腦力激盪
- 解決問題
- 簡單的編程任務
- 創意寫作
- 還有更多！

今天你需要什麼幫助嗎？
```

### Exit Chat | 退出聊天

**English**: Type `/bye` or press `Ctrl+C` to exit.

**中文**: 輸入 `/bye` 或按 `Ctrl+C` 退出。

---

## Step 5: Connect to OpenClaw | 步驟5：連接到OpenClaw

**English**: Now let's connect your local AI to OpenClaw for advanced automation.

**中文**: 現在讓我們將你的本地AI連接到OpenClaw以進行進階自動化。

### Configuration | 配置

Create a configuration file | 創建配置檔案:

```bash
# Create .env file for OpenClaw
echo "OLLAMA_HOST=http://localhost:11434" > .env
echo "AI_MODEL=llama3.2:3b" >> .env
```

### For OpenClaw Setup | OpenClaw設置

```bash
# Set environment variables
export OLLAMA_HOST="http://localhost:11434"
export AI_MODEL="llama3.2:3b"

# Or add to your shell profile
echo 'export OLLAMA_HOST="http://localhost:11434"' >> ~/.zshrc
echo 'export AI_MODEL="llama3.2:3b"' >> ~/.zshrc
```

### Verification | 驗證

```bash
# Test the connection
curl http://localhost:11434/api/tags
```

### Expected Result | 預期結果

**English**: You should see your downloaded models listed:
```json
{
  "models": [
    {
      "name": "llama3.2:3b",
      "model": "llama3.2:3b",
      "modified_at": "2024-01-01T12:00:00Z",
      "size": 2019393792,
      "digest": "sha256:abcd1234..."
    }
  ]
}
```

**中文**: 你應該看到你下載的模型列表：
```json
{
  "models": [
    {
      "name": "llama3.2:3b",
      "model": "llama3.2:3b",
      "modified_at": "2024-01-01T12:00:00Z",
      "size": 2019393792,
      "digest": "sha256:abcd1234..."
    }
  ]
}
```

---

## Congratulations! | 恭喜！

**English**: 🎉 You now have a fully functional local AI agent! Your computer can now:
- Chat intelligently
- Help with writing and coding
- Answer questions on many topics
- Work completely offline
- Keep all your data private

**中文**: 🎉 你現在擁有一個完全正常運作的本地AI智能體！你的電腦現在可以：
- 智能對話
- 協助寫作和編程
- 回答各種主題的問題
- 完全離線工作
- 保持你的所有資料私密

## What's Next? | 下一步？

### Upgrade Your Setup | 升級你的設置

#### 1. Deploy to Cloud | 部署到雲端
**English**: Want your AI agent available anywhere? Deploy to Zeabur cloud hosting.
**中文**: 想要你的AI智能體隨處可用？部署到Zeabur雲端託管。

[→ Deploy to Zeabur Tutorial | Zeabur部署教學](/learn/zeabur) (Use code "OpenClaw" for 10% off | 使用代碼"OpenClaw"享9折優惠)

#### 2. Add Voice Capabilities | 添加語音功能
**English**: Make your agent speak and listen with ElevenLabs.
**中文**: 使用ElevenLabs讓你的智能體能說會聽。

[→ Add Voice with ElevenLabs | ElevenLabs語音功能](/apps/elevenlabs)

#### 3. Create Videos | 創建影片
**English**: Generate videos and presentations with HeyGen.
**中文**: 使用HeyGen生成影片和簡報。

[→ Video Generation with HeyGen | HeyGen影片生成](/apps/heygen)

#### 4. Explore More Models | 探索更多模型
**English**: Try different AI models for specialized tasks.
**中文**: 嘗試不同的AI模型來處理專門任務。

```bash
# Try these models
ollama pull codellama:7b      # For coding | 編程專用
ollama pull mistral:7b        # General purpose | 通用型
ollama pull neural-chat:7b    # Conversational | 對話專用
```

### Join the Community | 加入社群

**English**:
- Share your AI agent on `{username}.canfly.ai`
- Connect with other AI enthusiasts
- Discover new tools and capabilities

**中文**:
- 在 `{username}.canfly.ai` 分享你的AI智能體
- 與其他AI愛好者連接
- 發現新工具和功能

---

## Troubleshooting | 故障排除

### Common Issues | 常見問題

#### Issue 1: Model Download Stuck | 問題1：模型下載卡住
**English Solution**: Check your internet connection and try again. Large models take time.
**中文解決方案**: 檢查網路連接並重試。大型模型需要時間下載。

#### Issue 2: "Connection Refused" Error | 問題2："連接被拒絕"錯誤
**English Solution**: Make sure `ollama serve` is running in another terminal.
**中文解決方案**: 確保在另一個終端機中運行 `ollama serve`。

#### Issue 3: Out of Memory | 問題3：記憶體不足
**English Solution**: Try a smaller model like `llama3.2:1b` instead.
**中文解決方案**: 嘗試較小的模型，如 `llama3.2:1b`。

#### Issue 4: Slow Responses | 問題4：回應緩慢
**English Solution**:
- Close other heavy applications
- Try the 1b model for faster responses
- Consider upgrading your RAM

**中文解決方案**:
- 關閉其他重型應用程式
- 嘗試1b模型以獲得更快回應
- 考慮升級你的記憶體

### Need Help? | 需要幫助？

**English**:
- Check the [Ollama documentation](https://ollama.ai/docs)
- Join our Discord community
- Contact support at hello@canfly.ai

**中文**:
- 查看 [Ollama文檔](https://ollama.ai/docs)
- 加入我們的Discord社群
- 聯繫客服 hello@canfly.ai

---

## Free Resources | 免費資源

**English**: Continue your AI journey with these free resources:
- [More AI Tools](/apps) - Discover new capabilities
- [Tutorial Library](/learn) - Step-by-step guides
- [Community Showcase](/community) - See what others are building

**中文**: 使用這些免費資源繼續你的AI之旅：
- [更多AI工具](/apps) - 發現新功能
- [教學庫](/learn) - 逐步指南
- [社群展示](/community) - 看看其他人在建造什麼

---

*Tutorial Duration: 5-10 minutes | 教學時長：5-10分鐘*
*Last Updated: March 2026 | 最後更新：2026年3月*
*Created by CanFly.ai Community | 由CanFly.ai社群創建*
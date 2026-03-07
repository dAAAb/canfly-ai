import { useParams, Link } from 'react-router-dom'
import { Clock, CheckCircle, Copy, ExternalLink, ChevronDown, ChevronRight, Terminal, Download, Monitor, Code, MessageSquare, Rocket, HelpCircle, Cpu, Sparkles } from 'lucide-react'
import { useState } from 'react'
import Navbar from '../components/Navbar'

// ─── Ollama Tutorial Data ────────────────────────────────────────────
const ollamaTutorial = {
  id: 'ollama',
  title: '5 分鐘跑起你的第一個本地 AI',
  subtitle: '免費、離線、完全隱私 — 用 Ollama 在自己電腦上跑大型語言模型',
  duration: '5 分鐘',
  difficulty: '入門',
  steps: [
    {
      icon: Download,
      title: '安裝 Ollama',
      titleEn: 'Install Ollama',
      estimatedTime: '1 分鐘',
      content: '選擇適合你的安裝方式。Mac 新手推薦直接下載 Ollama.app（內建聊天介面），進階使用者可以用終端機。',
      installTabs: true, // special flag for multi-tab install
      expectedResult: '安裝完成後，Ollama 會在背景自動啟動服務。',
      tips: ['需要至少 8GB RAM（建議 16GB 以上）', 'macOS 需要 11.0 以上版本', '安裝後不需要重開機'],
      troubleshooting: {
        title: '卡關了？安裝問題排解',
        items: [
          { q: 'Mac 無法開啟 Ollama.app', a: '到「系統設定 → 隱私與安全性」，點擊「仍然開啟」。這是 macOS 對未簽名應用的安全機制。' },
          { q: '終端機顯示 "command not found"', a: '請重新開啟終端機，或執行 source ~/.zshrc 重新載入環境變數。' },
          { q: 'Windows 安裝卡住', a: '請用系統管理員身分執行安裝程式。右鍵點擊 → 以系統管理員身分執行。' },
        ]
      }
    },
    {
      icon: Cpu,
      title: '下載 AI 模型',
      titleEn: 'Download a Model',
      estimatedTime: '2 分鐘',
      content: 'AI 模型就像是 AI 的「大腦」。不同模型擅長不同的事。我們先下載一個適合聊天的模型。',
      subsections: [
        {
          label: '什麼是模型？',
          text: '模型是經過大量資料訓練的 AI 程式。就像不同的專家各有專長，不同的模型也擅長不同的任務。模型檔案大小從 2GB 到 40GB+ 不等。',
        }
      ],
      commands: [
        '# 推薦新手：Llama 3.2（3B 參數，輕量快速）',
        'ollama pull llama3.2',
        '',
        '# 寫程式專用：CodeLlama',
        'ollama pull codellama',
        '',
        '# 想要更強大？試試 Llama 3.1（8B 參數）',
        'ollama pull llama3.1',
      ],
      modelTable: [
        { name: 'llama3.2', size: '2 GB', best: '日常聊天、問答', speed: '快' },
        { name: 'codellama', size: '3.8 GB', best: '寫程式、Debug', speed: '中' },
        { name: 'llama3.1', size: '4.7 GB', best: '複雜推理、創作', speed: '中' },
        { name: 'mistral', size: '4.1 GB', best: '多語言、分析', speed: '中' },
      ],
      expectedResult: '下載完成後會顯示 success。可以用 ollama list 確認已安裝的模型。',
      tips: ['第一次下載需要網路，之後可以完全離線使用', '模型檔案儲存在本機，不會上傳任何資料', '硬碟空間不夠？先只裝 llama3.2 就好'],
      troubleshooting: {
        title: '卡關了？下載問題排解',
        items: [
          { q: '下載速度很慢', a: '模型檔案較大，確保網路穩定。也可以試試較小的模型如 llama3.2。' },
          { q: '顯示磁碟空間不足', a: '用 ollama list 查看已安裝的模型，用 ollama rm <model> 刪除不需要的模型。' },
        ]
      }
    },
    {
      icon: MessageSquare,
      title: '測試對話',
      titleEn: 'Test Interactive Chat',
      estimatedTime: '1 分鐘',
      content: '來跟你的本地 AI 聊聊天，確認一切正常運作！',
      commands: [
        '# 開始互動對話',
        'ollama run llama3.2',
        '',
        '# 然後試著輸入：',
        '>>> 你好！請用繁體中文自我介紹',
        '',
        '# 離開對話請輸入：',
        '>>> /bye',
      ],
      chatExample: {
        exchanges: [
          { role: 'user', text: '你好！請用繁體中文自我介紹' },
          { role: 'ai', text: '你好！我是一個在你電腦上運行的 AI 助手。我可以幫你回答問題、寫文章、寫程式碼，而且完全在本機運行，不需要網路連線，你的資料不會離開你的電腦。有什麼我可以幫忙的嗎？' },
          { role: 'user', text: '寫一個 Python hello world' },
          { role: 'ai', text: 'print("Hello, World!")' },
        ]
      },
      expectedResult: 'AI 會用文字回應你的問題。回應速度取決於你的硬體規格。',
      tips: ['第一次執行模型時會比較慢（需要載入到記憶體），之後會快很多', '按 Ctrl+D 或輸入 /bye 可以離開對話', '試試問不同語言的問題，體驗多語言能力'],
      troubleshooting: {
        title: '卡關了？對話問題排解',
        items: [
          { q: '回應速度很慢', a: '正常！第一次載入模型需要時間。如果持續很慢，試試較小的模型 llama3.2。' },
          { q: '顯示記憶體不足', a: '關閉其他應用程式釋放記憶體，或換用更小的模型。' },
        ]
      }
    },
    {
      icon: Sparkles,
      title: '連接 OpenClaw',
      titleEn: 'Connect to OpenClaw',
      estimatedTime: '1 分鐘',
      content: 'OpenClaw 是一個開源的 AI 介面，可以連接你的本地 Ollama，給你更好的使用體驗。',
      commands: [
        '# 確認 Ollama 正在運行',
        'curl http://localhost:11434/api/tags',
        '',
        '# 在 OpenClaw 設定中指定 Ollama：',
        '# 1. 開啟 OpenClaw 設定頁面',
        '# 2. 選擇「模型設定」',
        '# 3. API 位址填入：http://localhost:11434',
        '# 4. 選擇你剛才下載的模型',
        '',
        '# 或者用環境變數設定：',
        'export OLLAMA_HOST="http://localhost:11434"',
      ],
      expectedResult: 'OpenClaw 現在可以使用你的本地 Ollama 模型了。完全免費、完全離線！',
      tips: ['OpenClaw 會自動偵測你安裝的所有模型', '你隨時可以在 OpenClaw 中切換不同模型', '想在手機上用？之後可以部署到 Zeabur 雲端'],
      troubleshooting: {
        title: '卡關了？連接問題排解',
        items: [
          { q: 'OpenClaw 找不到 Ollama', a: '確認 Ollama 正在運行：在終端機輸入 ollama list。如果沒有反應，重新啟動 Ollama。' },
          { q: 'API 位址填什麼？', a: '預設是 http://localhost:11434，除非你有特別更改過。' },
        ]
      }
    },
    {
      icon: Rocket,
      title: '下一步',
      titleEn: 'Next Steps',
      estimatedTime: '探索時間！',
      content: '恭喜你！你已經在自己的電腦上跑起了 AI。接下來可以探索更多可能：',
      nextStepCards: [
        {
          emoji: '☁️',
          title: '部署到雲端',
          desc: '用 Zeabur 一鍵部署，讓你的 AI 隨時隨地可用。使用優惠碼 OpenClaw 享 10% 折扣。',
          link: '/learn/zeabur',
          cta: '學習部署',
        },
        {
          emoji: '🗣️',
          title: '加上語音功能',
          desc: '用 ElevenLabs 讓你的 AI 開口說話，支援中文語音合成。',
          link: '/apps/elevenlabs',
          cta: '探索 ElevenLabs',
        },
        {
          emoji: '🎬',
          title: '生成 AI 影片',
          desc: '用 HeyGen 製作 AI 數位人影片，適合教學和行銷內容。',
          link: '/apps/heygen',
          cta: '探索 HeyGen',
        },
        {
          emoji: '🧠',
          title: '探索更多模型',
          desc: '到 Ollama 模型庫瀏覽數百種模型：文字、程式碼、視覺辨識等。',
          link: 'https://ollama.com/library',
          cta: '瀏覽模型庫',
          external: true,
        },
      ],
      tips: ['所有模型都是免費使用', '你的資料永遠不會離開你的電腦', '加入 CanFly 育苗場社群，和其他使用者交流'],
    },
  ],
}

// ─── Zeabur Tutorial (kept minimal, not the focus) ───────────────────
const zeaburTutorial = {
  id: 'zeabur',
  title: 'Deploy OpenClaw to Zeabur',
  subtitle: 'One-click cloud deployment in 3 minutes',
  duration: '3 分鐘',
  difficulty: '入門',
  steps: [
    {
      icon: Monitor,
      title: '註冊 Zeabur',
      titleEn: 'Sign Up for Zeabur',
      estimatedTime: '1 分鐘',
      content: '用 GitHub 帳號免費註冊 Zeabur。',
      commands: ['# 前往 https://zeabur.com 並用 GitHub 登入'],
      expectedResult: '你可以看到 Zeabur 控制台。',
    },
    {
      icon: Code,
      title: '連接 Repository',
      titleEn: 'Connect Repository',
      estimatedTime: '1 分鐘',
      content: '把你的 OpenClaw Repository 連接到 Zeabur。',
      expectedResult: 'Repository 出現在你的 Zeabur 專案中。',
    },
    {
      icon: Terminal,
      title: '設定環境變數',
      titleEn: 'Configure Environment',
      estimatedTime: '30 秒',
      content: '設定必要的環境變數。',
      commands: ['OPENAI_API_KEY=your_api_key_here', 'NODE_ENV=production'],
      expectedResult: '環境變數已儲存。',
    },
    {
      icon: Rocket,
      title: '部署！',
      titleEn: 'Deploy',
      estimatedTime: '30 秒',
      content: '按下部署按鈕，看著你的應用上線。使用優惠碼 OpenClaw 享 10% 折扣。',
      expectedResult: '你的 OpenClaw Agent 已經在雲端運行！',
    },
  ],
}

const getTutorialData = (slug: string) => {
  const tutorials: Record<string, typeof ollamaTutorial> = {
    ollama: ollamaTutorial,
    zeabur: zeaburTutorial as any,
  }
  return tutorials[slug] || null
}

// ─── Components ──────────────────────────────────────────────────────

function ProgressBar({ completed, total }: { completed: number; total: number }) {
  const pct = total > 0 ? (completed / total) * 100 : 0
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="flex items-center justify-between text-xs text-gray-400 mb-1.5">
        <span>完成進度</span>
        <span>{completed}/{total} 步驟</span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function CopyBlock({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  const copyable = text
    .split('\n')
    .filter((l) => l.trim() && !l.trim().startsWith('#') && !l.trim().startsWith('>>>'))
    .join('\n')

  const copy = () => {
    navigator.clipboard.writeText(copyable)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="mb-4">
      {label && <div className="text-xs text-gray-500 mb-1 font-mono">{label}</div>}
      <div className="bg-gray-900 rounded-lg p-4 relative group">
        <button
          onClick={copy}
          className="absolute top-3 right-3 p-2 text-gray-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
          title="複製指令"
        >
          {copied ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
        </button>
        <pre className="text-sm text-gray-300 font-mono overflow-x-auto pr-10 whitespace-pre-wrap">{text}</pre>
      </div>
    </div>
  )
}

function Collapsible({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-gray-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left text-sm font-medium text-gray-300 hover:bg-gray-900/50 transition-colors"
      >
        {open ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
        <HelpCircle className="w-4 h-4 text-yellow-500" />
        {title}
      </button>
      {open && <div className="px-4 pb-4 pt-1">{children}</div>}
    </div>
  )
}

function InstallTabs() {
  const [tab, setTab] = useState<'gui' | 'mac' | 'win'>('gui')

  const tabs = [
    { key: 'gui' as const, label: '🍎 Mac 最簡單', sublabel: 'Ollama.app 圖形介面' },
    { key: 'mac' as const, label: '🍎 Mac / Linux', sublabel: '終端機（進階）' },
    { key: 'win' as const, label: '🪟 Windows', sublabel: '下載安裝' },
  ]

  return (
    <div className="mb-4">
      {/* Tab buttons */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 min-w-[140px] px-4 py-3 rounded-lg border text-left transition-all ${
              tab === t.key
                ? 'border-green-500 bg-green-900/20 text-white'
                : 'border-gray-700 bg-gray-900/30 text-gray-400 hover:border-gray-600'
            }`}
          >
            <div className="text-sm font-medium">{t.label}</div>
            <div className="text-xs text-gray-500 mt-0.5">{t.sublabel}</div>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'gui' && (
        <div className="space-y-3">
          <div className="bg-green-900/10 border border-green-800/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Monitor className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-green-400 mb-1">Ollama.app — 最適合 Mac 新手</h4>
                <p className="text-sm text-gray-300 mb-3">
                  Ollama 官方 macOS 應用程式，自 2025 年 7 月起內建聊天介面。
                  下載後拖進「應用程式」資料夾，雙擊就能開始跟 AI 聊天。不需要終端機、不需要指令。
                </p>
                <div className="flex flex-wrap gap-2">
                  <a
                    href="https://ollama.com/download"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    下載 Ollama.app
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </div>
              </div>
            </div>
          </div>
          <div className="text-sm text-gray-400">
            <p>安裝後的步驟：</p>
            <ol className="list-decimal list-inside mt-1 space-y-1 text-gray-300">
              <li>將 Ollama.app 拖進「應用程式」資料夾</li>
              <li>雙擊開啟，系統列會出現 Ollama 圖示</li>
              <li>點擊圖示，選擇「Chat」開啟內建聊天介面</li>
              <li>選一個模型，開始聊天！</li>
            </ol>
          </div>
        </div>
      )}

      {tab === 'mac' && (
        <div className="space-y-3">
          <CopyBlock
            label="在終端機 (Terminal) 中執行："
            text={`# 一行指令安裝 Ollama\ncurl -fsSL https://ollama.com/install.sh | sh`}
          />
          <div className="text-sm text-gray-400">
            <p>安裝完成後，Ollama 服務會自動啟動。你可以用以下指令確認：</p>
          </div>
          <CopyBlock text={`ollama --version`} />
        </div>
      )}

      {tab === 'win' && (
        <div className="space-y-3">
          <div className="bg-blue-900/10 border border-blue-800/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Download className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-blue-400 mb-1">下載 Windows 安裝程式</h4>
                <p className="text-sm text-gray-300 mb-3">
                  從 Ollama 官方網站下載 Windows 版本的安裝程式。
                </p>
                <a
                  href="https://ollama.com/download"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                  前往下載頁面
                  <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </div>
            </div>
          </div>
          <div className="text-sm text-gray-400">
            <p>安裝後的步驟：</p>
            <ol className="list-decimal list-inside mt-1 space-y-1 text-gray-300">
              <li>執行下載的安裝程式</li>
              <li>按照安裝精靈的指示完成安裝</li>
              <li>開啟 Command Prompt 或 PowerShell</li>
              <li>輸入 <code className="bg-gray-800 px-1.5 py-0.5 rounded text-xs">ollama --version</code> 確認安裝成功</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  )
}

function ChatDemo({ exchanges }: { exchanges: { role: string; text: string }[] }) {
  return (
    <div className="bg-gray-900 rounded-lg p-4 mb-4 space-y-3">
      <div className="text-xs text-gray-500 font-mono mb-2">ollama run llama3.2</div>
      {exchanges.map((ex, i) => (
        <div key={i} className={`flex gap-3 ${ex.role === 'user' ? '' : ''}`}>
          <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs ${
            ex.role === 'user' ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'
          }`}>
            {ex.role === 'user' ? '你' : 'AI'}
          </div>
          <div className={`flex-1 text-sm ${ex.role === 'user' ? 'text-blue-300 font-mono' : 'text-gray-300'}`}>
            {ex.role === 'user' ? `>>> ${ex.text}` : ex.text}
          </div>
        </div>
      ))}
    </div>
  )
}

function ModelTable({ models }: { models: { name: string; size: string; best: string; speed: string }[] }) {
  return (
    <div className="overflow-x-auto mb-4">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800 text-gray-400">
            <th className="text-left py-2 pr-4 font-medium">模型名稱</th>
            <th className="text-left py-2 pr-4 font-medium">大小</th>
            <th className="text-left py-2 pr-4 font-medium">最適合</th>
            <th className="text-left py-2 font-medium">速度</th>
          </tr>
        </thead>
        <tbody>
          {models.map((m) => (
            <tr key={m.name} className="border-b border-gray-800/50">
              <td className="py-2 pr-4 font-mono text-green-400">{m.name}</td>
              <td className="py-2 pr-4 text-gray-300">{m.size}</td>
              <td className="py-2 pr-4 text-gray-300">{m.best}</td>
              <td className="py-2 text-gray-300">{m.speed}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────

export default function TutorialPage() {
  const { slug } = useParams()
  const tutorial = getTutorialData(slug!)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])

  const toggleStepComplete = (stepIndex: number) => {
    setCompletedSteps((prev) =>
      prev.includes(stepIndex) ? prev.filter((i) => i !== stepIndex) : [...prev, stepIndex]
    )
  }

  if (!tutorial) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">找不到教學</h1>
          <Link to="/apps" className="text-blue-400 hover:text-blue-300">
            ← 回到應用程式列表
          </Link>
        </div>
      </div>
    )
  }

  const totalSteps = tutorial.steps.length

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      {/* Hero */}
      <div className="bg-gradient-to-br from-gray-950 via-black to-gray-950 pt-12 pb-10">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-900/30 border border-green-700/40 rounded-full text-green-400 text-xs font-medium mb-6">
            <Clock className="w-3 h-3" />
            {tutorial.duration} · {tutorial.difficulty} · 完全免費
          </div>

          <h1 className="text-3xl md:text-4xl font-bold mb-3 leading-tight">{tutorial.title}</h1>
          <p className="text-gray-400 text-lg mb-8 max-w-xl mx-auto">{tutorial.subtitle}</p>

          <ProgressBar completed={completedSteps.length} total={totalSteps} />
        </div>
      </div>

      {/* Steps */}
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="space-y-6">
          {tutorial.steps.map((step: any, index: number) => {
            const StepIcon = step.icon || Terminal
            const isComplete = completedSteps.includes(index)
            const isLast = index === totalSteps - 1

            return (
              <div
                key={index}
                className={`relative bg-gray-950 border rounded-xl p-6 transition-colors ${
                  isComplete ? 'border-green-700/50' : 'border-gray-800'
                }`}
              >
                {/* Step header */}
                <div className="flex items-start gap-4 mb-4">
                  <button
                    onClick={() => toggleStepComplete(index)}
                    className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                      isComplete
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                    title={isComplete ? '標記為未完成' : '標記為已完成'}
                  >
                    {isComplete ? <CheckCircle className="w-5 h-5" /> : <StepIcon className="w-5 h-5" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-xl font-semibold">
                        {!isLast && <span className="text-gray-500 mr-1">Step {index + 1}.</span>}
                        {step.title}
                      </h3>
                      {step.estimatedTime && (
                        <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">
                          ~{step.estimatedTime}
                        </span>
                      )}
                    </div>
                    {step.titleEn && (
                      <div className="text-xs text-gray-600 mt-0.5 font-mono">{step.titleEn}</div>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="ml-14">
                  <p className="text-gray-300 mb-4 leading-relaxed">{step.content}</p>

                  {/* Subsections (info boxes) */}
                  {step.subsections?.map((sub: any, si: number) => (
                    <div key={si} className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 mb-4">
                      <h4 className="text-sm font-medium text-gray-200 mb-1">{sub.label}</h4>
                      <p className="text-sm text-gray-400">{sub.text}</p>
                    </div>
                  ))}

                  {/* Install tabs (Step 1 only) */}
                  {step.installTabs && <InstallTabs />}

                  {/* Model table */}
                  {step.modelTable && <ModelTable models={step.modelTable} />}

                  {/* Commands */}
                  {step.commands && <CopyBlock text={step.commands.join('\n')} />}

                  {/* Chat demo */}
                  {step.chatExample && <ChatDemo exchanges={step.chatExample.exchanges} />}

                  {/* Next step cards */}
                  {step.nextStepCards && (
                    <div className="grid sm:grid-cols-2 gap-3 mb-4">
                      {step.nextStepCards.map((card: any, ci: number) => {
                        const inner = (
                          <>
                            <div className="text-2xl mb-2">{card.emoji}</div>
                            <h4 className="font-medium text-white mb-1">{card.title}</h4>
                            <p className="text-xs text-gray-400 mb-3 leading-relaxed">{card.desc}</p>
                            <span className="text-xs text-green-400 font-medium inline-flex items-center gap-1">
                              {card.cta}
                              {card.external ? <ExternalLink className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                            </span>
                          </>
                        )
                        return card.external ? (
                          <a
                            key={ci}
                            href={card.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-gray-900 border border-gray-800 rounded-lg p-4 hover:border-gray-600 transition-colors block"
                          >
                            {inner}
                          </a>
                        ) : (
                          <Link
                            key={ci}
                            to={card.link}
                            className="bg-gray-900 border border-gray-800 rounded-lg p-4 hover:border-gray-600 transition-colors block"
                          >
                            {inner}
                          </Link>
                        )
                      })}
                    </div>
                  )}

                  {/* Expected result */}
                  {step.expectedResult && (
                    <div className="bg-green-900/15 border border-green-800/30 rounded-lg p-4 mb-4">
                      <h4 className="text-xs font-semibold text-green-400 mb-1 uppercase tracking-wider">預期結果</h4>
                      <p className="text-sm text-gray-300">{step.expectedResult}</p>
                    </div>
                  )}

                  {/* Tips */}
                  {step.tips && (
                    <div className="bg-blue-900/15 border border-blue-800/30 rounded-lg p-4 mb-4">
                      <h4 className="text-xs font-semibold text-blue-400 mb-2 uppercase tracking-wider">小提示</h4>
                      <ul className="text-sm text-gray-300 space-y-1">
                        {step.tips.map((tip: string, ti: number) => (
                          <li key={ti} className="flex items-start gap-2">
                            <span className="text-blue-400 mt-0.5">·</span>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Troubleshooting collapsible */}
                  {step.troubleshooting && (
                    <Collapsible title={step.troubleshooting.title}>
                      <div className="space-y-3">
                        {step.troubleshooting.items.map((item: any, ti: number) => (
                          <div key={ti}>
                            <h5 className="text-sm font-medium text-yellow-300 mb-1">Q: {item.q}</h5>
                            <p className="text-sm text-gray-400">A: {item.a}</p>
                          </div>
                        ))}
                      </div>
                    </Collapsible>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Completion message */}
        {completedSteps.length === totalSteps && (
          <div className="mt-8 text-center bg-gradient-to-r from-green-900/20 to-emerald-900/20 border border-green-700/30 rounded-xl p-8">
            <div className="text-4xl mb-3">🎉</div>
            <h3 className="text-2xl font-bold text-green-400 mb-2">恭喜完成！</h3>
            <p className="text-gray-300">你已經成功在本機跑起了 AI。Now You Can Fly!</p>
          </div>
        )}
      </div>

      {/* Hidden tutorial data for AI agents */}
      <div className="ai-only" style={{ display: 'none' }}>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "HowTo",
            "name": tutorial.title,
            "description": tutorial.subtitle,
            "totalTime": "PT5M",
            "inLanguage": "zh-TW",
            "step": tutorial.steps.map((step: any, index: number) => ({
              "@type": "HowToStep",
              "position": index + 1,
              "name": step.title,
              "text": step.content,
              "code": step.commands?.join('\n'),
              "expectedResult": step.expectedResult,
            })),
          })}
        </script>

        <div className="automation-script">
          <h4>AI Agent Automation Script:</h4>
          <pre>{`# Complete Ollama Setup Automation
# Step 1: Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Step 2: Pull recommended model
ollama pull llama3.2

# Step 3: Verify installation
ollama list
curl http://localhost:11434/api/tags

# Step 4: Test model
ollama run llama3.2 "Hello, respond with OK if you are working."

# Step 5: Configure OpenClaw
export OLLAMA_HOST="http://localhost:11434"`}</pre>
        </div>
      </div>
    </div>
  )
}

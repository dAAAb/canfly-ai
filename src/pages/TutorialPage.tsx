import { useParams, Link } from 'react-router-dom'
import { Clock, CheckCircle, Copy, ExternalLink, ChevronDown, ChevronRight, Terminal, Download, Monitor, MessageSquare, Rocket, HelpCircle, Cpu, Sparkles, Search, Globe } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import Navbar from '../components/Navbar'
import { useHead } from '../hooks/useHead'

// ─── Types ──────────────────────────────────────────────────────────

interface TroubleshootingItem { q: string; a: string }

interface ScreenshotData { src: string; alt: string; caption?: string }

interface StepData {
  icon: typeof Terminal
  title: string
  titleEn: string
  estimatedTime: string
  content: string
  installTabs?: boolean
  commands?: string[]
  subsections?: { label: string; text: string }[]
  modelTable?: ModelInfo[]
  chatExample?: { exchanges: ChatExchange[] }
  nextStepCards?: NextStepCard[]
  expectedResult?: string
  tips?: string[]
  troubleshooting?: { title: string; items: TroubleshootingItem[] }
  screenshots?: ScreenshotData[]
}

interface ModelInfo { name: string; size: string; best: string; speed: string }
interface ChatExchange { role: 'user' | 'ai'; text: string }
interface NextStepCard { emoji: string; title: string; desc: string; link: string; cta: string; external?: boolean }

interface TutorialData {
  id: string
  title: string
  subtitle: string
  duration: string
  difficulty: string
  steps: StepData[]
}

// ─── Dynamic Tutorial Data Functions ───────────────────────────────

function createOllamaTutorial(t: any): TutorialData {
  return {
    id: 'ollama',
    title: t('tutorial.ollama.title'),
    subtitle: t('tutorial.ollama.subtitle'),
    duration: t('tutorial.ollama.duration'),
    difficulty: t('tutorial.ollama.difficulty'),
    steps: [
      {
        icon: Download,
        title: t('tutorial.ollama.steps.0.title'),
        titleEn: t('tutorial.ollama.steps.0.titleEn'),
        estimatedTime: t('tutorial.ollama.steps.0.estimatedTime'),
        content: t('tutorial.ollama.steps.0.content'),
        installTabs: true,
        screenshots: [
          { src: '/images/tutorial/ollama-mac-installer.png', alt: t('tutorial.ollama.screenshots.macInstaller', 'Ollama.app installer on macOS'), caption: t('tutorial.ollama.screenshots.macInstallerCaption', 'Drag Ollama to Applications') },
          { src: '/images/tutorial/ollama-linux-install.png', alt: t('tutorial.ollama.screenshots.linuxInstall', 'Ollama install on Linux terminal'), caption: t('tutorial.ollama.screenshots.linuxInstallCaption', 'curl install on Ubuntu') },
          { src: '/images/tutorial/ollama-win-installer.png', alt: t('tutorial.ollama.screenshots.winInstaller', 'Ollama installer on Windows'), caption: t('tutorial.ollama.screenshots.winInstallerCaption', 'Windows installer wizard') },
        ].filter(s => {
          // Only show screenshots that exist (check at render time via onError fallback)
          return true
        }),
        expectedResult: t('tutorial.ollama.steps.0.expectedResult'),
        tips: t('tutorial.ollama.steps.0.tips', { returnObjects: true }),
        troubleshooting: {
          title: t('tutorial.ollama.steps.0.troubleshooting.title'),
          items: t('tutorial.ollama.steps.0.troubleshooting.items', { returnObjects: true })
        }
      },
      {
        icon: Cpu,
        title: t('tutorial.ollama.steps.1.title'),
        titleEn: t('tutorial.ollama.steps.1.titleEn'),
        estimatedTime: t('tutorial.ollama.steps.1.estimatedTime'),
        content: t('tutorial.ollama.steps.1.content'),
        screenshots: [
          { src: '/images/tutorial/ollama-pull-model.png', alt: t('tutorial.ollama.screenshots.pullModel', 'ollama pull downloading a model'), caption: t('tutorial.ollama.screenshots.pullModelCaption', 'Downloading Llama 3.2 model') },
        ],
        subsections: t('tutorial.ollama.steps.1.subsections', { returnObjects: true }),
        commands: t('tutorial.ollama.steps.1.commands', { returnObjects: true }),
        modelTable: t('tutorial.ollama.steps.1.modelTable.models', { returnObjects: true }),
        expectedResult: t('tutorial.ollama.steps.1.expectedResult'),
        tips: t('tutorial.ollama.steps.1.tips', { returnObjects: true }),
        troubleshooting: {
          title: t('tutorial.ollama.steps.1.troubleshooting.title'),
          items: t('tutorial.ollama.steps.1.troubleshooting.items', { returnObjects: true })
        }
      },
      {
        icon: MessageSquare,
        title: t('tutorial.ollama.steps.2.title'),
        titleEn: t('tutorial.ollama.steps.2.titleEn'),
        estimatedTime: t('tutorial.ollama.steps.2.estimatedTime'),
        content: t('tutorial.ollama.steps.2.content'),
        screenshots: [
          { src: '/images/tutorial/ollama-chat-session.png', alt: t('tutorial.ollama.screenshots.chatSession', 'Ollama chat session in terminal'), caption: t('tutorial.ollama.screenshots.chatSessionCaption', 'Interactive chat with Llama 3.2') },
        ],
        commands: t('tutorial.ollama.steps.2.commands', { returnObjects: true }),
        chatExample: t('tutorial.ollama.steps.2.chatExample', { returnObjects: true }),
        expectedResult: t('tutorial.ollama.steps.2.expectedResult'),
        tips: t('tutorial.ollama.steps.2.tips', { returnObjects: true }),
        troubleshooting: {
          title: t('tutorial.ollama.steps.2.troubleshooting.title'),
          items: t('tutorial.ollama.steps.2.troubleshooting.items', { returnObjects: true })
        }
      },
      {
        icon: Sparkles,
        title: t('tutorial.ollama.steps.3.title'),
        titleEn: t('tutorial.ollama.steps.3.titleEn'),
        estimatedTime: t('tutorial.ollama.steps.3.estimatedTime'),
        content: t('tutorial.ollama.steps.3.content'),
        screenshots: [
          { src: '/images/tutorial/openclaw-ollama-config.png', alt: t('tutorial.ollama.screenshots.openclawConfig', 'OpenClaw settings connected to Ollama'), caption: t('tutorial.ollama.screenshots.openclawConfigCaption', 'OpenClaw model configuration') },
        ],
        commands: t('tutorial.ollama.steps.3.commands', { returnObjects: true }),
        expectedResult: t('tutorial.ollama.steps.3.expectedResult'),
        tips: t('tutorial.ollama.steps.3.tips', { returnObjects: true }),
        troubleshooting: {
          title: t('tutorial.ollama.steps.3.troubleshooting.title'),
          items: t('tutorial.ollama.steps.3.troubleshooting.items', { returnObjects: true })
        }
      },
      {
        icon: Rocket,
        title: t('tutorial.ollama.steps.4.title'),
        titleEn: t('tutorial.ollama.steps.4.titleEn'),
        estimatedTime: t('tutorial.ollama.steps.4.estimatedTime'),
        content: t('tutorial.ollama.steps.4.content'),
        nextStepCards: t('tutorial.ollama.steps.4.nextStepCards', { returnObjects: true }),
        tips: t('tutorial.ollama.steps.4.tips', { returnObjects: true }),
      },
    ],
  }
}

function createZeaburTutorial(t: any): TutorialData {
  return {
    id: 'zeabur',
    title: t('tutorial.zeabur.title'),
    subtitle: t('tutorial.zeabur.subtitle'),
    duration: t('tutorial.zeabur.duration'),
    difficulty: t('tutorial.zeabur.difficulty'),
    steps: [
      {
        icon: Download,
        title: t('tutorial.zeabur.steps.0.title'),
        titleEn: t('tutorial.zeabur.steps.0.titleEn'),
        estimatedTime: t('tutorial.zeabur.steps.0.estimatedTime'),
        content: t('tutorial.zeabur.steps.0.content'),
        expectedResult: t('tutorial.zeabur.steps.0.expectedResult'),
        tips: t('tutorial.zeabur.steps.0.tips', { returnObjects: true }),
        commands: t('tutorial.zeabur.steps.0.commands', { returnObjects: true }),
        troubleshooting: {
          title: t('tutorial.zeabur.steps.0.troubleshooting.title'),
          items: t('tutorial.zeabur.steps.0.troubleshooting.items', { returnObjects: true })
        }
      },
      {
        icon: Terminal,
        title: t('tutorial.zeabur.steps.1.title'),
        titleEn: t('tutorial.zeabur.steps.1.titleEn'),
        estimatedTime: t('tutorial.zeabur.steps.1.estimatedTime'),
        content: t('tutorial.zeabur.steps.1.content'),
        expectedResult: t('tutorial.zeabur.steps.1.expectedResult'),
        commands: t('tutorial.zeabur.steps.1.commands', { returnObjects: true }),
        tips: t('tutorial.zeabur.steps.1.tips', { returnObjects: true }),
        troubleshooting: {
          title: t('tutorial.zeabur.steps.1.troubleshooting.title'),
          items: t('tutorial.zeabur.steps.1.troubleshooting.items', { returnObjects: true })
        }
      },
      {
        icon: Rocket,
        title: t('tutorial.zeabur.steps.2.title'),
        titleEn: t('tutorial.zeabur.steps.2.titleEn'),
        estimatedTime: t('tutorial.zeabur.steps.2.estimatedTime'),
        content: t('tutorial.zeabur.steps.2.content'),
        expectedResult: t('tutorial.zeabur.steps.2.expectedResult'),
        commands: t('tutorial.zeabur.steps.2.commands', { returnObjects: true }),
        tips: t('tutorial.zeabur.steps.2.tips', { returnObjects: true }),
        troubleshooting: {
          title: t('tutorial.zeabur.steps.2.troubleshooting.title'),
          items: t('tutorial.zeabur.steps.2.troubleshooting.items', { returnObjects: true })
        }
      },
      {
        icon: Cpu,
        title: t('tutorial.zeabur.steps.3.title'),
        titleEn: t('tutorial.zeabur.steps.3.titleEn'),
        estimatedTime: t('tutorial.zeabur.steps.3.estimatedTime'),
        content: t('tutorial.zeabur.steps.3.content'),
        commands: t('tutorial.zeabur.steps.3.commands', { returnObjects: true }),
        expectedResult: t('tutorial.zeabur.steps.3.expectedResult'),
        tips: t('tutorial.zeabur.steps.3.tips', { returnObjects: true }),
        troubleshooting: {
          title: t('tutorial.zeabur.steps.3.troubleshooting.title'),
          items: t('tutorial.zeabur.steps.3.troubleshooting.items', { returnObjects: true })
        }
      },
      {
        icon: ExternalLink,
        title: t('tutorial.zeabur.steps.4.title'),
        titleEn: t('tutorial.zeabur.steps.4.titleEn'),
        estimatedTime: t('tutorial.zeabur.steps.4.estimatedTime'),
        content: t('tutorial.zeabur.steps.4.content'),
        commands: t('tutorial.zeabur.steps.4.commands', { returnObjects: true }),
        expectedResult: t('tutorial.zeabur.steps.4.expectedResult'),
        tips: t('tutorial.zeabur.steps.4.tips', { returnObjects: true }),
        troubleshooting: {
          title: t('tutorial.zeabur.steps.4.troubleshooting.title'),
          items: t('tutorial.zeabur.steps.4.troubleshooting.items', { returnObjects: true })
        }
      },
      {
        icon: Sparkles,
        title: t('tutorial.zeabur.steps.5.title'),
        titleEn: t('tutorial.zeabur.steps.5.titleEn'),
        estimatedTime: t('tutorial.zeabur.steps.5.estimatedTime'),
        content: t('tutorial.zeabur.steps.5.content'),
        commands: t('tutorial.zeabur.steps.5.commands', { returnObjects: true }),
        expectedResult: t('tutorial.zeabur.steps.5.expectedResult'),
        tips: t('tutorial.zeabur.steps.5.tips', { returnObjects: true }),
        nextStepCards: t('tutorial.zeabur.steps.5.nextStepCards', { returnObjects: true }),
      },
    ],
  }
}

function createElevenLabsTutorial(t: any): TutorialData {
  return {
    id: 'elevenlabs',
    title: t('tutorial.elevenlabs.title'),
    subtitle: t('tutorial.elevenlabs.subtitle'),
    duration: t('tutorial.elevenlabs.duration'),
    difficulty: t('tutorial.elevenlabs.difficulty'),
    steps: [
      {
        icon: Download,
        title: t('tutorial.elevenlabs.steps.0.title'),
        titleEn: t('tutorial.elevenlabs.steps.0.titleEn'),
        estimatedTime: t('tutorial.elevenlabs.steps.0.estimatedTime'),
        content: t('tutorial.elevenlabs.steps.0.content'),
        commands: t('tutorial.elevenlabs.steps.0.commands', { returnObjects: true }),
        expectedResult: t('tutorial.elevenlabs.steps.0.expectedResult'),
        tips: t('tutorial.elevenlabs.steps.0.tips', { returnObjects: true }),
        troubleshooting: {
          title: t('tutorial.elevenlabs.steps.0.troubleshooting.title'),
          items: t('tutorial.elevenlabs.steps.0.troubleshooting.items', { returnObjects: true })
        }
      },
      {
        icon: Terminal,
        title: t('tutorial.elevenlabs.steps.1.title'),
        titleEn: t('tutorial.elevenlabs.steps.1.titleEn'),
        estimatedTime: t('tutorial.elevenlabs.steps.1.estimatedTime'),
        content: t('tutorial.elevenlabs.steps.1.content'),
        commands: t('tutorial.elevenlabs.steps.1.commands', { returnObjects: true }),
        expectedResult: t('tutorial.elevenlabs.steps.1.expectedResult'),
        tips: t('tutorial.elevenlabs.steps.1.tips', { returnObjects: true }),
        troubleshooting: {
          title: t('tutorial.elevenlabs.steps.1.troubleshooting.title'),
          items: t('tutorial.elevenlabs.steps.1.troubleshooting.items', { returnObjects: true })
        }
      },
      {
        icon: Sparkles,
        title: t('tutorial.elevenlabs.steps.2.title'),
        titleEn: t('tutorial.elevenlabs.steps.2.titleEn'),
        estimatedTime: t('tutorial.elevenlabs.steps.2.estimatedTime'),
        content: t('tutorial.elevenlabs.steps.2.content'),
        commands: t('tutorial.elevenlabs.steps.2.commands', { returnObjects: true }),
        expectedResult: t('tutorial.elevenlabs.steps.2.expectedResult'),
        tips: t('tutorial.elevenlabs.steps.2.tips', { returnObjects: true }),
        troubleshooting: {
          title: t('tutorial.elevenlabs.steps.2.troubleshooting.title'),
          items: t('tutorial.elevenlabs.steps.2.troubleshooting.items', { returnObjects: true })
        }
      },
      {
        icon: MessageSquare,
        title: t('tutorial.elevenlabs.steps.3.title'),
        titleEn: t('tutorial.elevenlabs.steps.3.titleEn'),
        estimatedTime: t('tutorial.elevenlabs.steps.3.estimatedTime'),
        content: t('tutorial.elevenlabs.steps.3.content'),
        commands: t('tutorial.elevenlabs.steps.3.commands', { returnObjects: true }),
        expectedResult: t('tutorial.elevenlabs.steps.3.expectedResult'),
        tips: t('tutorial.elevenlabs.steps.3.tips', { returnObjects: true }),
        troubleshooting: {
          title: t('tutorial.elevenlabs.steps.3.troubleshooting.title'),
          items: t('tutorial.elevenlabs.steps.3.troubleshooting.items', { returnObjects: true })
        }
      },
      {
        icon: Rocket,
        title: t('tutorial.elevenlabs.steps.4.title'),
        titleEn: t('tutorial.elevenlabs.steps.4.titleEn'),
        estimatedTime: t('tutorial.elevenlabs.steps.4.estimatedTime'),
        content: t('tutorial.elevenlabs.steps.4.content'),
        nextStepCards: t('tutorial.elevenlabs.steps.4.nextStepCards', { returnObjects: true }).map((card: any) => ({
          ...card,
          link: card.title.includes('ElevenLabs') ? 'https://try.elevenlabs.io/clawhub?utm_source=canfly&utm_medium=web&utm_campaign=elevenlabs' :
                card.title.includes('HeyGen') ? '/learn/heygen-video' :
                card.title.includes('Cloud') ? '/learn/zeabur' : '#'
        })),
        tips: t('tutorial.elevenlabs.steps.4.tips', { returnObjects: true }),
      },
    ],
  }
}

function createHeyGenTutorial(t: any): TutorialData {
  return {
    id: 'heygen',
    title: t('tutorial.heygen.title'),
    subtitle: t('tutorial.heygen.subtitle'),
    duration: t('tutorial.heygen.duration'),
    difficulty: t('tutorial.heygen.difficulty'),
    steps: [
      {
        icon: Download,
        title: t('tutorial.heygen.steps.0.title'),
        titleEn: t('tutorial.heygen.steps.0.titleEn'),
        estimatedTime: t('tutorial.heygen.steps.0.estimatedTime'),
        content: t('tutorial.heygen.steps.0.content'),
        commands: t('tutorial.heygen.steps.0.commands', { returnObjects: true }),
        expectedResult: t('tutorial.heygen.steps.0.expectedResult'),
        tips: t('tutorial.heygen.steps.0.tips', { returnObjects: true }),
        troubleshooting: {
          title: t('tutorial.heygen.steps.0.troubleshooting.title'),
          items: t('tutorial.heygen.steps.0.troubleshooting.items', { returnObjects: true })
        }
      },
      {
        icon: Terminal,
        title: t('tutorial.heygen.steps.1.title'),
        titleEn: t('tutorial.heygen.steps.1.titleEn'),
        estimatedTime: t('tutorial.heygen.steps.1.estimatedTime'),
        content: t('tutorial.heygen.steps.1.content'),
        commands: t('tutorial.heygen.steps.1.commands', { returnObjects: true }),
        expectedResult: t('tutorial.heygen.steps.1.expectedResult'),
        tips: t('tutorial.heygen.steps.1.tips', { returnObjects: true }),
        troubleshooting: {
          title: t('tutorial.heygen.steps.1.troubleshooting.title'),
          items: t('tutorial.heygen.steps.1.troubleshooting.items', { returnObjects: true })
        }
      },
      {
        icon: Sparkles,
        title: t('tutorial.heygen.steps.2.title'),
        titleEn: t('tutorial.heygen.steps.2.titleEn'),
        estimatedTime: t('tutorial.heygen.steps.2.estimatedTime'),
        content: t('tutorial.heygen.steps.2.content'),
        commands: t('tutorial.heygen.steps.2.commands', { returnObjects: true }),
        expectedResult: t('tutorial.heygen.steps.2.expectedResult'),
        tips: t('tutorial.heygen.steps.2.tips', { returnObjects: true }),
        troubleshooting: {
          title: t('tutorial.heygen.steps.2.troubleshooting.title'),
          items: t('tutorial.heygen.steps.2.troubleshooting.items', { returnObjects: true })
        }
      },
      {
        icon: MessageSquare,
        title: t('tutorial.heygen.steps.3.title'),
        titleEn: t('tutorial.heygen.steps.3.titleEn'),
        estimatedTime: t('tutorial.heygen.steps.3.estimatedTime'),
        content: t('tutorial.heygen.steps.3.content'),
        commands: t('tutorial.heygen.steps.3.commands', { returnObjects: true }),
        expectedResult: t('tutorial.heygen.steps.3.expectedResult'),
        tips: t('tutorial.heygen.steps.3.tips', { returnObjects: true }),
        troubleshooting: {
          title: t('tutorial.heygen.steps.3.troubleshooting.title'),
          items: t('tutorial.heygen.steps.3.troubleshooting.items', { returnObjects: true })
        }
      },
      {
        icon: Rocket,
        title: t('tutorial.heygen.steps.4.title'),
        titleEn: t('tutorial.heygen.steps.4.titleEn'),
        estimatedTime: t('tutorial.heygen.steps.4.estimatedTime'),
        content: t('tutorial.heygen.steps.4.content'),
        nextStepCards: t('tutorial.heygen.steps.4.nextStepCards', { returnObjects: true }).map((card: any) => ({
          ...card,
          link: card.title.includes('HeyGen') ? 'https://www.heygen.com/?sid=rewardful&via=clawhub&utm_source=canfly&utm_medium=web&utm_campaign=heygen' :
                card.title.includes('ElevenLabs') ? '/learn/elevenlabs-integration' :
                card.title.includes('Cloud') ? '/learn/zeabur' : '#'
        })),
        tips: t('tutorial.heygen.steps.4.tips', { returnObjects: true }),
      },
    ],
  }
}

function createVirtualMachineTutorial(t: any): TutorialData {
  return {
    id: 'virtual-machine',
    title: t('tutorial.virtualmachine.title'),
    subtitle: t('tutorial.virtualmachine.subtitle'),
    duration: t('tutorial.virtualmachine.duration'),
    difficulty: t('tutorial.virtualmachine.difficulty'),
    steps: [
      {
        icon: Monitor,
        title: t('tutorial.virtualmachine.steps.0.title'),
        titleEn: t('tutorial.virtualmachine.steps.0.titleEn'),
        estimatedTime: t('tutorial.virtualmachine.steps.0.estimatedTime'),
        content: t('tutorial.virtualmachine.steps.0.content'),
        subsections: t('tutorial.virtualmachine.steps.0.subsections', { returnObjects: true }),
        expectedResult: t('tutorial.virtualmachine.steps.0.expectedResult'),
        tips: t('tutorial.virtualmachine.steps.0.tips', { returnObjects: true }),
        troubleshooting: {
          title: t('tutorial.virtualmachine.steps.0.troubleshooting.title'),
          items: t('tutorial.virtualmachine.steps.0.troubleshooting.items', { returnObjects: true })
        }
      },
      {
        icon: Download,
        title: t('tutorial.virtualmachine.steps.1.title'),
        titleEn: t('tutorial.virtualmachine.steps.1.titleEn'),
        estimatedTime: t('tutorial.virtualmachine.steps.1.estimatedTime'),
        content: t('tutorial.virtualmachine.steps.1.content'),
        commands: t('tutorial.virtualmachine.steps.1.commands', { returnObjects: true }),
        expectedResult: t('tutorial.virtualmachine.steps.1.expectedResult'),
        tips: t('tutorial.virtualmachine.steps.1.tips', { returnObjects: true }),
        troubleshooting: {
          title: t('tutorial.virtualmachine.steps.1.troubleshooting.title'),
          items: t('tutorial.virtualmachine.steps.1.troubleshooting.items', { returnObjects: true })
        }
      },
      {
        icon: Cpu,
        title: t('tutorial.virtualmachine.steps.2.title'),
        titleEn: t('tutorial.virtualmachine.steps.2.titleEn'),
        estimatedTime: t('tutorial.virtualmachine.steps.2.estimatedTime'),
        content: t('tutorial.virtualmachine.steps.2.content'),
        subsections: t('tutorial.virtualmachine.steps.2.subsections', { returnObjects: true }),
        commands: t('tutorial.virtualmachine.steps.2.commands', { returnObjects: true }),
        expectedResult: t('tutorial.virtualmachine.steps.2.expectedResult'),
        tips: t('tutorial.virtualmachine.steps.2.tips', { returnObjects: true }),
        troubleshooting: {
          title: t('tutorial.virtualmachine.steps.2.troubleshooting.title'),
          items: t('tutorial.virtualmachine.steps.2.troubleshooting.items', { returnObjects: true })
        }
      },
      {
        icon: Terminal,
        title: t('tutorial.virtualmachine.steps.3.title'),
        titleEn: t('tutorial.virtualmachine.steps.3.titleEn'),
        estimatedTime: t('tutorial.virtualmachine.steps.3.estimatedTime'),
        content: t('tutorial.virtualmachine.steps.3.content'),
        commands: t('tutorial.virtualmachine.steps.3.commands', { returnObjects: true }),
        expectedResult: t('tutorial.virtualmachine.steps.3.expectedResult'),
        tips: t('tutorial.virtualmachine.steps.3.tips', { returnObjects: true }),
        troubleshooting: {
          title: t('tutorial.virtualmachine.steps.3.troubleshooting.title'),
          items: t('tutorial.virtualmachine.steps.3.troubleshooting.items', { returnObjects: true })
        }
      },
      {
        icon: Rocket,
        title: t('tutorial.virtualmachine.steps.4.title'),
        titleEn: t('tutorial.virtualmachine.steps.4.titleEn'),
        estimatedTime: t('tutorial.virtualmachine.steps.4.estimatedTime'),
        content: t('tutorial.virtualmachine.steps.4.content'),
        nextStepCards: t('tutorial.virtualmachine.steps.4.nextStepCards', { returnObjects: true }),
        tips: t('tutorial.virtualmachine.steps.4.tips', { returnObjects: true }),
      },
    ],
  }
}

function createPerplexityTutorial(t: any): TutorialData {
  return {
    id: 'perplexity',
    title: t('tutorial.perplexity.title'),
    subtitle: t('tutorial.perplexity.subtitle'),
    duration: t('tutorial.perplexity.duration'),
    difficulty: t('tutorial.perplexity.difficulty'),
    steps: [
      {
        icon: Download,
        title: t('tutorial.perplexity.steps.0.title'),
        titleEn: t('tutorial.perplexity.steps.0.titleEn'),
        estimatedTime: t('tutorial.perplexity.steps.0.estimatedTime'),
        content: t('tutorial.perplexity.steps.0.content'),
        commands: t('tutorial.perplexity.steps.0.commands', { returnObjects: true }),
        expectedResult: t('tutorial.perplexity.steps.0.expectedResult'),
        tips: t('tutorial.perplexity.steps.0.tips', { returnObjects: true }),
        troubleshooting: {
          title: t('tutorial.perplexity.steps.0.troubleshooting.title'),
          items: t('tutorial.perplexity.steps.0.troubleshooting.items', { returnObjects: true })
        }
      },
      {
        icon: Search,
        title: t('tutorial.perplexity.steps.1.title'),
        titleEn: t('tutorial.perplexity.steps.1.titleEn'),
        estimatedTime: t('tutorial.perplexity.steps.1.estimatedTime'),
        content: t('tutorial.perplexity.steps.1.content'),
        commands: t('tutorial.perplexity.steps.1.commands', { returnObjects: true }),
        expectedResult: t('tutorial.perplexity.steps.1.expectedResult'),
        tips: t('tutorial.perplexity.steps.1.tips', { returnObjects: true }),
        troubleshooting: {
          title: t('tutorial.perplexity.steps.1.troubleshooting.title'),
          items: t('tutorial.perplexity.steps.1.troubleshooting.items', { returnObjects: true })
        }
      },
      {
        icon: Terminal,
        title: t('tutorial.perplexity.steps.2.title'),
        titleEn: t('tutorial.perplexity.steps.2.titleEn'),
        estimatedTime: t('tutorial.perplexity.steps.2.estimatedTime'),
        content: t('tutorial.perplexity.steps.2.content'),
        commands: t('tutorial.perplexity.steps.2.commands', { returnObjects: true }),
        expectedResult: t('tutorial.perplexity.steps.2.expectedResult'),
        tips: t('tutorial.perplexity.steps.2.tips', { returnObjects: true }),
        troubleshooting: {
          title: t('tutorial.perplexity.steps.2.troubleshooting.title'),
          items: t('tutorial.perplexity.steps.2.troubleshooting.items', { returnObjects: true })
        }
      },
      {
        icon: Sparkles,
        title: t('tutorial.perplexity.steps.3.title'),
        titleEn: t('tutorial.perplexity.steps.3.titleEn'),
        estimatedTime: t('tutorial.perplexity.steps.3.estimatedTime'),
        content: t('tutorial.perplexity.steps.3.content'),
        commands: t('tutorial.perplexity.steps.3.commands', { returnObjects: true }),
        expectedResult: t('tutorial.perplexity.steps.3.expectedResult'),
        tips: t('tutorial.perplexity.steps.3.tips', { returnObjects: true }),
        troubleshooting: {
          title: t('tutorial.perplexity.steps.3.troubleshooting.title'),
          items: t('tutorial.perplexity.steps.3.troubleshooting.items', { returnObjects: true })
        }
      },
      {
        icon: Rocket,
        title: t('tutorial.perplexity.steps.4.title'),
        titleEn: t('tutorial.perplexity.steps.4.titleEn'),
        estimatedTime: t('tutorial.perplexity.steps.4.estimatedTime'),
        content: t('tutorial.perplexity.steps.4.content'),
        nextStepCards: t('tutorial.perplexity.steps.4.nextStepCards', { returnObjects: true }).map((card: any) => ({
          ...card,
          link: card.title.includes('Perplexity') ? 'https://perplexity.ai/?referral=canfly' :
                card.title.includes('Brave') ? '/learn/brave-search' :
                card.title.includes('OpenClaw') ? '/learn/ollama' :
                card.title.includes('Cloud') ? '/learn/zeabur' : '#'
        })),
        tips: t('tutorial.perplexity.steps.4.tips', { returnObjects: true }),
      },
    ],
  }
}

function createBraveSearchTutorial(t: any): TutorialData {
  return {
    id: 'brave-search',
    title: t('tutorial.brave.title'),
    subtitle: t('tutorial.brave.subtitle'),
    duration: t('tutorial.brave.duration'),
    difficulty: t('tutorial.brave.difficulty'),
    steps: [
      {
        icon: Globe,
        title: t('tutorial.brave.steps.0.title'),
        titleEn: t('tutorial.brave.steps.0.titleEn'),
        estimatedTime: t('tutorial.brave.steps.0.estimatedTime'),
        content: t('tutorial.brave.steps.0.content'),
        commands: t('tutorial.brave.steps.0.commands', { returnObjects: true }),
        expectedResult: t('tutorial.brave.steps.0.expectedResult'),
        tips: t('tutorial.brave.steps.0.tips', { returnObjects: true }),
        troubleshooting: {
          title: t('tutorial.brave.steps.0.troubleshooting.title'),
          items: t('tutorial.brave.steps.0.troubleshooting.items', { returnObjects: true })
        }
      },
      {
        icon: Terminal,
        title: t('tutorial.brave.steps.1.title'),
        titleEn: t('tutorial.brave.steps.1.titleEn'),
        estimatedTime: t('tutorial.brave.steps.1.estimatedTime'),
        content: t('tutorial.brave.steps.1.content'),
        commands: t('tutorial.brave.steps.1.commands', { returnObjects: true }),
        expectedResult: t('tutorial.brave.steps.1.expectedResult'),
        tips: t('tutorial.brave.steps.1.tips', { returnObjects: true }),
        troubleshooting: {
          title: t('tutorial.brave.steps.1.troubleshooting.title'),
          items: t('tutorial.brave.steps.1.troubleshooting.items', { returnObjects: true })
        }
      },
      {
        icon: Search,
        title: t('tutorial.brave.steps.2.title'),
        titleEn: t('tutorial.brave.steps.2.titleEn'),
        estimatedTime: t('tutorial.brave.steps.2.estimatedTime'),
        content: t('tutorial.brave.steps.2.content'),
        commands: t('tutorial.brave.steps.2.commands', { returnObjects: true }),
        expectedResult: t('tutorial.brave.steps.2.expectedResult'),
        tips: t('tutorial.brave.steps.2.tips', { returnObjects: true }),
        troubleshooting: {
          title: t('tutorial.brave.steps.2.troubleshooting.title'),
          items: t('tutorial.brave.steps.2.troubleshooting.items', { returnObjects: true })
        }
      },
      {
        icon: Sparkles,
        title: t('tutorial.brave.steps.3.title'),
        titleEn: t('tutorial.brave.steps.3.titleEn'),
        estimatedTime: t('tutorial.brave.steps.3.estimatedTime'),
        content: t('tutorial.brave.steps.3.content'),
        commands: t('tutorial.brave.steps.3.commands', { returnObjects: true }),
        expectedResult: t('tutorial.brave.steps.3.expectedResult'),
        tips: t('tutorial.brave.steps.3.tips', { returnObjects: true }),
        troubleshooting: {
          title: t('tutorial.brave.steps.3.troubleshooting.title'),
          items: t('tutorial.brave.steps.3.troubleshooting.items', { returnObjects: true })
        }
      },
      {
        icon: Rocket,
        title: t('tutorial.brave.steps.4.title'),
        titleEn: t('tutorial.brave.steps.4.titleEn'),
        estimatedTime: t('tutorial.brave.steps.4.estimatedTime'),
        content: t('tutorial.brave.steps.4.content'),
        nextStepCards: t('tutorial.brave.steps.4.nextStepCards', { returnObjects: true }),
        tips: t('tutorial.brave.steps.4.tips', { returnObjects: true }),
      },
    ],
  }
}

function getTutorials(t: any): Record<string, TutorialData> {
  return {
    ollama: createOllamaTutorial(t),
    zeabur: createZeaburTutorial(t),
    'elevenlabs-integration': createElevenLabsTutorial(t),
    'heygen-video': createHeyGenTutorial(t),
    'virtual-machine': createVirtualMachineTutorial(t),
    perplexity: createPerplexityTutorial(t),
    'brave-search': createBraveSearchTutorial(t),
  }
}

// ─── Components ─────────────────────────────────────────────────────

function ProgressBar({ completed, total }: { completed: number; total: number }) {
  const { t } = useTranslation()
  const pct = total > 0 ? (completed / total) * 100 : 0
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="flex items-center justify-between text-xs text-gray-400 mb-1.5">
        <span>{t('tutorial.progress')}</span>
        <span>{t('tutorial.steps', { completed, total })}</span>
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
  const { t } = useTranslation()
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
          title={t('tutorial.copyCommand')}
        >
          {copied ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
        </button>
        <pre className="text-sm text-gray-300 font-mono overflow-x-auto pr-10 whitespace-pre-wrap">{text}</pre>
      </div>
    </div>
  )
}

function Collapsible({ title, children, defaultOpen = false }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
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
  const { t } = useTranslation()
  const [tab, setTab] = useState<'gui' | 'terminal' | 'win'>('gui')

  const tabs = [
    { key: 'gui' as const, label: `🍎 ${t('tutorial.ollama.steps.0.installTabs.guiLabel')}`, sublabel: t('tutorial.ollama.steps.0.installTabs.guiSublabel') },
    { key: 'terminal' as const, label: `🖥 ${t('tutorial.ollama.steps.0.installTabs.terminalLabel')}`, sublabel: t('tutorial.ollama.steps.0.installTabs.terminalSublabel') },
    { key: 'win' as const, label: `🪟 ${t('tutorial.ollama.steps.0.installTabs.winLabel')}`, sublabel: t('tutorial.ollama.steps.0.installTabs.winSublabel') },
  ]

  return (
    <div className="mb-4">
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

      {tab === 'gui' && (
        <div className="space-y-3">
          <div className="bg-green-900/10 border border-green-800/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Monitor className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-green-400 mb-1">{t('tutorial.ollama.steps.0.installTabs.guiTitle')}</h4>
                <p className="text-sm text-gray-300 mb-3">
                  {t('tutorial.ollama.steps.0.installTabs.guiDesc')}
                </p>
                <a
                  href="https://ollama.com/download"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                  {t('tutorial.ollama.steps.0.installTabs.downloadOllamaApp')}
                  <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </div>
            </div>
          </div>
          <div className="text-sm text-gray-400">
            <p>{t('tutorial.ollama.steps.0.installTabs.installSteps')}</p>
            <ol className="list-decimal list-inside mt-1 space-y-1 text-gray-300">
              {(t('tutorial.ollama.steps.0.installTabs.guiSteps', { returnObjects: true }) as string[]).map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </div>
        </div>
      )}

      {tab === 'terminal' && (
        <div className="space-y-3">
          <CopyBlock
            label={t('tutorial.ollama.steps.0.installTabs.terminalLabel2')}
            text={t('tutorial.installOllamaOneLine')}
          />
          <div className="text-sm text-gray-400">
            <p>{t('tutorial.ollama.steps.0.installTabs.terminalConfirm')}</p>
          </div>
          <CopyBlock text="ollama --version" />
        </div>
      )}

      {tab === 'win' && (
        <div className="space-y-3">
          <div className="bg-blue-900/10 border border-blue-800/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Download className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-blue-400 mb-1">{t('tutorial.ollama.steps.0.installTabs.winTitle')}</h4>
                <p className="text-sm text-gray-300 mb-3">
                  {t('tutorial.ollama.steps.0.installTabs.winDesc')}
                </p>
                <a
                  href="https://ollama.com/download"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                  {t('tutorial.ollama.steps.0.installTabs.goToDownload')}
                  <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </div>
            </div>
          </div>
          <div className="text-sm text-gray-400">
            <p>{t('tutorial.ollama.steps.0.installTabs.installSteps')}</p>
            <ol className="list-decimal list-inside mt-1 space-y-1 text-gray-300">
              {(t('tutorial.ollama.steps.0.installTabs.winSteps', { returnObjects: true }) as string[]).map((step, i) => (
                <li key={i}>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  )
}

function ChatDemo({ exchanges }: { exchanges: ChatExchange[] }) {
  const { t } = useTranslation()
  return (
    <div className="bg-gray-900 rounded-lg p-4 mb-4 space-y-3">
      <div className="text-xs text-gray-500 font-mono mb-2">ollama run llama3.2</div>
      {exchanges.map((ex, i) => (
        <div key={i} className="flex gap-3">
          <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs ${
            ex.role === 'user' ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'
          }`}>
            {ex.role === 'user' ? t('tutorial.chatDemo.you') : 'AI'}
          </div>
          <div className={`flex-1 text-sm ${ex.role === 'user' ? 'text-blue-300 font-mono' : 'text-gray-300'}`}>
            {ex.role === 'user' ? `>>> ${ex.text}` : ex.text}
          </div>
        </div>
      ))}
    </div>
  )
}

function ModelTable({ models }: { models: ModelInfo[] }) {
  const { t } = useTranslation()
  return (
    <div className="overflow-x-auto mb-4">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800 text-gray-400">
            <th className="text-left py-2 pr-4 font-medium">{t('tutorial.ollama.steps.1.modelTable.nameHeader')}</th>
            <th className="text-left py-2 pr-4 font-medium">{t('tutorial.ollama.steps.1.modelTable.sizeHeader')}</th>
            <th className="text-left py-2 pr-4 font-medium">{t('tutorial.ollama.steps.1.modelTable.bestHeader')}</th>
            <th className="text-left py-2 font-medium">{t('tutorial.ollama.steps.1.modelTable.speedHeader')}</th>
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

function NextStepGrid({ cards }: { cards: NextStepCard[] }) {
  return (
    <div className="grid sm:grid-cols-2 gap-3 mb-4">
      {cards.map((card, i) => {
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
        const cls = "bg-gray-900 border border-gray-800 rounded-lg p-4 hover:border-gray-600 transition-colors block"
        return card.external ? (
          <a key={i} href={card.link} target="_blank" rel="noopener noreferrer" className={cls}>{inner}</a>
        ) : (
          <Link key={i} to={card.link} className={cls}>{inner}</Link>
        )
      })}
    </div>
  )
}

function ScreenshotGallery({ screenshots }: { screenshots: ScreenshotData[] }) {
  const [loaded, setLoaded] = useState<Record<number, boolean>>({})
  const visibleCount = Object.values(loaded).filter(Boolean).length

  if (visibleCount === 0 && Object.keys(loaded).length === screenshots.length) return null

  return (
    <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: visibleCount <= 1 ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))' }}>
      {screenshots.map((ss, i) => (
        <figure
          key={i}
          className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden"
          style={{ display: loaded[i] === false ? 'none' : undefined }}
        >
          <img
            src={ss.src}
            alt={ss.alt}
            className="w-full"
            loading="lazy"
            onLoad={() => setLoaded(prev => ({ ...prev, [i]: true }))}
            onError={() => setLoaded(prev => ({ ...prev, [i]: false }))}
          />
          {ss.caption && <figcaption className="text-xs text-gray-500 px-3 py-2">{ss.caption}</figcaption>}
        </figure>
      ))}
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────

export default function TutorialPage() {
  const { slug } = useParams()
  const { t } = useTranslation()
  const tutorials = getTutorials(t)
  const tutorial = tutorials[slug!] ?? null
  const [completedSteps, setCompletedSteps] = useState<number[]>([])

  useHead(tutorial ? {
    title: `${tutorial.title} — Canfly`,
    description: tutorial.subtitle,
    canonical: `https://canfly.ai/learn/${slug}`,
  } : {})

  const toggleStep = (i: number) =>
    setCompletedSteps((prev) => prev.includes(i) ? prev.filter((s) => s !== i) : [...prev, i])

  if (!tutorial) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">{t('tutorial.notFound')}</h1>
          <Link to="/apps" className="text-blue-400 hover:text-blue-300">{t('tutorial.backToApps')}</Link>
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
            {tutorial.duration} · {tutorial.difficulty} · {t('tutorial.free')}
          </div>

          <h1 className="text-3xl md:text-4xl font-bold mb-3 leading-tight">{tutorial.title}</h1>
          <p className="text-gray-400 text-lg mb-8 max-w-xl mx-auto">{tutorial.subtitle}</p>

          <ProgressBar completed={completedSteps.length} total={totalSteps} />
        </div>
      </div>

      {/* Steps */}
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="space-y-6">
          {tutorial.steps.map((step, index) => {
            const StepIcon = step.icon
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
                    onClick={() => toggleStep(index)}
                    className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                      isComplete
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                    title={isComplete ? t('tutorial.markIncomplete') : t('tutorial.markComplete')}
                  >
                    {isComplete ? <CheckCircle className="w-5 h-5" /> : <StepIcon className="w-5 h-5" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-xl font-semibold">
                        {!isLast && <span className="text-gray-500 mr-1">{t('tutorial.step', { n: index + 1 })}</span>}
                        {step.title}
                      </h3>
                      <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">
                        ~{step.estimatedTime}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 mt-0.5 font-mono">{step.titleEn}</div>
                  </div>
                </div>

                {/* Content */}
                <div className="ml-14">
                  <p className="text-gray-300 mb-4 leading-relaxed">{step.content}</p>

                  {step.screenshots && step.screenshots.length > 0 && (
                    <ScreenshotGallery screenshots={step.screenshots} />
                  )}

                  {step.subsections?.map((sub, si) => (
                    <div key={si} className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 mb-4">
                      <h4 className="text-sm font-medium text-gray-200 mb-1">{sub.label}</h4>
                      <p className="text-sm text-gray-400">{sub.text}</p>
                    </div>
                  ))}

                  {step.installTabs && <InstallTabs />}

                  {step.modelTable && <ModelTable models={step.modelTable} />}

                  {step.commands && <CopyBlock text={step.commands.join('\n')} />}

                  {step.chatExample && <ChatDemo exchanges={step.chatExample.exchanges} />}

                  {step.nextStepCards && <NextStepGrid cards={step.nextStepCards} />}

                  {step.expectedResult && (
                    <div className="bg-green-900/15 border border-green-800/30 rounded-lg p-4 mb-4">
                      <h4 className="text-xs font-semibold text-green-400 mb-1 uppercase tracking-wider">{t('tutorial.expectedResult')}</h4>
                      <p className="text-sm text-gray-300">{step.expectedResult}</p>
                    </div>
                  )}

                  {step.tips && (
                    <div className="bg-blue-900/15 border border-blue-800/30 rounded-lg p-4 mb-4">
                      <h4 className="text-xs font-semibold text-blue-400 mb-2 uppercase tracking-wider">{t('tutorial.tips')}</h4>
                      <ul className="text-sm text-gray-300 space-y-1">
                        {step.tips.map((tip, ti) => (
                          <li key={ti} className="flex items-start gap-2">
                            <span className="text-blue-400 mt-0.5">·</span>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {step.troubleshooting && (
                    <Collapsible title={step.troubleshooting.title}>
                      <div className="space-y-3">
                        {step.troubleshooting.items.map((item, ti) => (
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

        {completedSteps.length === totalSteps && (
          <div className="mt-8 text-center bg-gradient-to-r from-green-900/20 to-emerald-900/20 border border-green-700/30 rounded-xl p-8">
            <div className="text-4xl mb-3">🎉</div>
            <h3 className="text-2xl font-bold text-green-400 mb-2">{t('tutorial.congratsTitle')}</h3>
            <p className="text-gray-300">{t('tutorial.congratsDesc')}</p>
          </div>
        )}
      </div>

      {/* Structured data for AI agents */}
      <div className="ai-only" style={{ display: 'none' }}>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "HowTo",
            "name": tutorial.title,
            "description": tutorial.subtitle,
            "totalTime": "PT5M",
            "inLanguage": "zh-TW",
            "step": tutorial.steps.map((step, index) => ({
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
          <pre>{tutorial.id === 'ollama' ? `# Complete Ollama Setup Automation
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
export OLLAMA_HOST="http://localhost:11434"` : `# Complete Zeabur Deployment Automation
# Step 1: Account Setup
# Visit: https://zeabur.com?referralCode=openclaw&utm_source=canfly&utm_medium=web&utm_campaign=zeabur
# Use code "OpenClaw" for 10% off

# Step 2: Fork OpenClaw Repository
curl -H "Authorization: token YOUR_GITHUB_TOKEN" \\
  -X POST \\
  https://api.github.com/repos/openclaw/openclaw/forks

# Step 3: Deploy to Zeabur via GitHub
# Connect GitHub repository to Zeabur project
# Zeabur will auto-detect and deploy

# Step 4: Configure Environment Variables
# Set in Zeabur dashboard:
export OPENAI_API_KEY="sk-your-openai-key"
export NODE_ENV="production"
export OLLAMA_HOST="http://localhost:11434"

# Step 5: Verify Deployment
curl https://your-project.zeabur.app/health

# Optional: Add Custom Domain
# Set DNS CNAME: your-domain.com -> your-project.zeabur.app`}</pre>
        </div>
      </div>
    </div>
  )
}

export interface Product {
  id: string
  name: string
  icon: string
  tagline: string
  category: string
  price: string
  status: 'available' | 'coming-soon'
  description: string
  features: string[]
  screenshots: string[]
  reviewVideo?: string
  tutorial: string
  affiliateLink?: string
  affiliateCode?: string
  affiliateDiscount?: string
  commission?: string
  cta: {
    primary: string
    primaryLink: string
    secondary: string
    secondaryLink: string
  }
}

export const products: Product[] = [
  {
    id: 'ollama',
    icon: '/images/icons/ollama.png',
    name: 'Ollama',
    tagline: 'Free local AI models',
    category: 'free',
    price: 'Free',
    status: 'available',
    description: 'Run powerful AI models locally without requiring API keys or internet connection. Perfect for privacy-conscious users and development environments.',
    features: [
      'No API keys required',
      'Privacy-focused local processing',
      'Multiple model support (Llama, CodeLlama, Mistral)',
      'Easy command-line interface',
      'Works with OpenClaw agents',
    ],
    screenshots: [
      '/images/tutorial/ollama-mac-installer.png',
      '/images/tutorial/ollama-pull-model.png',
      '/images/tutorial/ollama-chat-session.png',
    ],
    reviewVideo: '/videos/reviews/ollama-review.mp4',
    tutorial: '/learn/ollama',
    cta: {
      primary: 'Start Free Tutorial',
      primaryLink: '/learn/ollama',
      secondary: 'View on GitHub',
      secondaryLink: 'https://github.com/ollama/ollama',
    },
  },
  {
    id: 'zeabur',
    icon: '/images/icons/zeabur.png',
    name: 'Zeabur',
    tagline: 'One-click cloud deployment',
    category: 'hosting',
    price: '$5/month',
    status: 'available',
    description: 'Deploy your OpenClaw agents to the cloud with zero configuration. Get started in minutes with our affiliate partnership.',
    affiliateLink: 'https://zeabur.com?referralCode=openclaw&utm_source=canfly&utm_medium=web&utm_campaign=zeabur',
    affiliateCode: 'OpenClaw',
    affiliateDiscount: '10% off',
    features: [
      'One-click deployment',
      'Automatic HTTPS',
      'Global CDN',
      '24/7 monitoring',
      'OpenClaw optimized templates',
    ],
    screenshots: [],
    reviewVideo: '/videos/reviews/zeabur-review.mp4',
    tutorial: '/learn/zeabur',
    cta: {
      primary: 'Deploy Now (10% off)',
      primaryLink: 'https://zeabur.com?referralCode=openclaw&utm_source=canfly&utm_medium=web&utm_campaign=zeabur',
      secondary: 'View Tutorial',
      secondaryLink: '/learn/zeabur',
    },
  },
  {
    id: 'elevenlabs',
    icon: '/images/icons/elevenlabs.png',
    name: 'ElevenLabs',
    tagline: 'AI voice synthesis',
    category: 'skills',
    price: '$5/month',
    status: 'available',
    description: 'Add realistic voice capabilities to your OpenClaw agents. High-quality text-to-speech with multiple voice options.',
    affiliateLink: 'https://try.elevenlabs.io/clawhub?utm_source=canfly&utm_medium=web&utm_campaign=elevenlabs',
    commission: '22% recurring',
    features: [
      'Natural voices',
      'Multi-language',
      'Voice cloning',
      'API',
      'OpenClaw skill',
    ],
    screenshots: [],
    reviewVideo: '/videos/reviews/elevenlabs-review.mp4',
    tutorial: '/learn/elevenlabs-integration',
    cta: {
      primary: 'Try ElevenLabs',
      primaryLink: 'https://try.elevenlabs.io/clawhub?utm_source=canfly&utm_medium=web&utm_campaign=elevenlabs',
      secondary: 'View Tutorial',
      secondaryLink: '/learn/elevenlabs-integration',
    },
  },
  {
    id: 'heygen',
    icon: '/images/icons/heygen.png',
    name: 'HeyGen',
    tagline: 'AI video generation',
    category: 'skills',
    price: '$29/month',
    status: 'available',
    description: 'Create professional AI-generated videos with digital avatars. Perfect for content creation, marketing, and training materials.',
    affiliateLink: 'https://www.heygen.com/?sid=rewardful&via=clawhub&utm_source=canfly&utm_medium=web&utm_campaign=heygen',
    commission: '20% recurring',
    features: [
      'AI avatar videos',
      '100+ languages',
      'API integration',
      'Custom avatar training',
      'Works with OpenClaw',
    ],
    screenshots: [],
    reviewVideo: '/videos/reviews/heygen-review.mp4',
    tutorial: '/learn/heygen-video',
    cta: {
      primary: 'Try HeyGen',
      primaryLink: 'https://www.heygen.com/?sid=rewardful&via=clawhub&utm_source=canfly&utm_medium=web&utm_campaign=heygen',
      secondary: 'View Tutorial',
      secondaryLink: '/learn/heygen-video',
    },
  },
  {
    id: 'umbrel',
    icon: '/images/icons/umbrel.png',
    name: 'Umbrel',
    tagline: 'Self-hosted home server',
    category: 'hardware',
    price: '$299',
    status: 'available',
    description: 'Run your own personal cloud server at home. Host AI models, apps, and services with complete data sovereignty.',
    affiliateLink: 'https://umbrel.com?utm_source=canfly&utm_medium=web&utm_campaign=umbrel',
    features: [
      'Self-hosted home server',
      'Privacy-focused',
      'App store ecosystem',
      'Run your own AI',
      'No subscription',
    ],
    screenshots: [],
    reviewVideo: '/videos/reviews/umbrel-review.mp4',
    tutorial: '/learn/umbrel-setup',
    cta: {
      primary: 'Visit Umbrel',
      primaryLink: 'https://umbrel.com?utm_source=canfly&utm_medium=web&utm_campaign=umbrel',
      secondary: 'View Tutorial',
      secondaryLink: '/learn/umbrel-setup',
    },
  },
  {
    id: 'pinata',
    icon: '/images/icons/pinata.png',
    name: 'Pinata',
    tagline: 'IPFS & Web3 storage',
    category: 'hosting',
    price: 'Free tier',
    status: 'coming-soon',
    description: 'Decentralized file storage powered by IPFS. Store and retrieve files with content-addressable hashing. Perfect for Web3 apps, NFT metadata, and permanent data storage.',
    features: [
      'IPFS pinning service',
      'Content-addressable storage',
      'Web3-native file management',
      'Dedicated IPFS gateways',
      'API & SDK access',
    ],
    screenshots: [],
    tutorial: '',
    cta: {
      primary: 'Notify Me',
      primaryLink: '#notify',
      secondary: 'Visit Pinata',
      secondaryLink: 'https://pinata.cloud',
    },
  },
  {
    id: 'switchbot-ai-hub',
    icon: '/images/icons/switchbot-ai-hub.png',
    name: 'SwitchBot AI Hub',
    tagline: 'Smart home meets AI',
    category: 'hardware',
    price: 'TBD',
    status: 'coming-soon',
    description: 'Connect your smart home devices with AI capabilities. SwitchBot AI Hub bridges the gap between IoT hardware and intelligent automation, enabling voice and agent-controlled home environments.',
    features: [
      'AI-powered home automation',
      'Voice assistant integration',
      'Matter/Thread support',
      'Agent-controllable via API',
      'Compatible with 100+ SwitchBot devices',
    ],
    screenshots: [],
    tutorial: '',
    cta: {
      primary: 'Notify Me',
      primaryLink: '#notify',
      secondary: 'Visit SwitchBot',
      secondaryLink: 'https://www.switch-bot.com',
    },
  },
  {
    id: 'perplexity',
    icon: '/images/icons/perplexity.png',
    name: 'Perplexity',
    tagline: 'AI-powered search engine',
    category: 'skills',
    price: 'Free / $20/mo',
    status: 'available',
    description: 'AI-powered search engine that reads the web and gives you direct answers with citations. Perfect for research, learning, and staying up-to-date. OpenAI-compatible API available.',
    affiliateLink: 'https://perplexity.ai/?referral=canfly',
    commission: '$15 per referral',
    features: [
      'AI-synthesized answers with sources',
      'Pro search for deep research',
      'OpenAI-compatible API',
      'Collections & Pages for sharing',
      'Multiple focus modes (Academic, Writing, etc.)',
    ],
    screenshots: [],
    tutorial: '/learn/perplexity',
    cta: {
      primary: 'Try Perplexity (Free)',
      primaryLink: 'https://perplexity.ai/?referral=canfly',
      secondary: 'View Tutorial',
      secondaryLink: '/learn/perplexity',
    },
  },
  {
    id: 'brave-search',
    icon: '/images/icons/brave-search.png',
    name: 'Brave Search API',
    tagline: 'Free web search API',
    category: 'skills',
    price: 'Free (2K/mo)',
    status: 'available',
    description: 'Privacy-focused web search API with a generous free tier. Get structured search results to power your AI agents with real-time web knowledge. No credit card required.',
    features: [
      'Free tier: 2,000 queries/month',
      'Privacy-focused, no tracking',
      'Structured JSON results',
      'News, Images & Videos endpoints',
      'No credit card required',
    ],
    screenshots: [],
    tutorial: '/learn/brave-search',
    cta: {
      primary: 'Get Free API Key',
      primaryLink: 'https://brave.com/search/api/?utm_source=canfly&utm_medium=web&utm_campaign=brave-search',
      secondary: 'View Tutorial',
      secondaryLink: '/learn/brave-search',
    },
  },
  {
    id: 'utm',
    icon: '/images/icons/utm.png',
    name: 'UTM',
    tagline: 'Free virtual machines for Mac',
    category: 'vm',
    price: 'Free',
    status: 'available',
    description: 'Run Windows, Linux, or other operating systems safely inside your Mac. UTM lets you create isolated virtual machines — perfect for trying AI tools without affecting your main system. If something goes wrong, just delete the VM and start over.',
    features: [
      'Free & open source',
      'Run Linux/Windows on Mac',
      'Safe sandbox environment',
      'Easy snapshot & restore',
      'Apple Silicon optimized',
    ],
    screenshots: [],
    tutorial: '/learn/virtual-machine',
    cta: {
      primary: 'Free Tutorial',
      primaryLink: '/learn/virtual-machine',
      secondary: 'Download UTM',
      secondaryLink: 'https://mac.getutm.app',
    },
  },
  {
    id: 'virtual-buddy',
    icon: '/images/icons/virtual-buddy.png',
    name: 'Virtual Buddy',
    tagline: 'One-click Linux VM setup',
    category: 'vm',
    price: 'Free',
    status: 'available',
    description: 'The easiest way to get a Linux virtual machine on your Mac. Virtual Buddy sets up everything automatically — no technical knowledge needed. One click and you have a full Linux environment ready for Ollama and OpenClaw.',
    features: [
      'One-click Linux install',
      'No technical knowledge needed',
      'Automatic VM configuration',
      'Perfect for beginners',
      'macOS native app',
    ],
    screenshots: [],
    tutorial: '/learn/virtual-machine',
    cta: {
      primary: 'Free Tutorial',
      primaryLink: '/learn/virtual-machine',
      secondary: 'Get Virtual Buddy',
      secondaryLink: 'https://github.com/insidegui/VirtualBuddy',
    },
  },
]

export const productsBySlug = Object.fromEntries(products.map((p) => [p.id, p]))

export const categories = [
  { id: 'all', name: 'All Apps', count: products.length },
  { id: 'free', name: 'Free Tools', count: products.filter((p) => p.category === 'free').length },
  { id: 'vm', name: 'Virtual Machines', count: products.filter((p) => p.category === 'vm').length },
  { id: 'skills', name: 'AI Skills', count: products.filter((p) => p.category === 'skills').length },
  { id: 'hosting', name: 'Cloud Hosting', count: products.filter((p) => p.category === 'hosting').length },
  { id: 'hardware', name: 'Hardware', count: products.filter((p) => p.category === 'hardware').length },
]

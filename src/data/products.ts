export interface Product {
  id: string
  name: string
  tagline: string
  category: string
  price: string
  status: 'available' | 'coming-soon'
  description: string
  features: string[]
  screenshots: string[]
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
      '/images/ollama-terminal.jpg',
      '/images/ollama-models.jpg',
      '/images/ollama-openclaw.jpg',
    ],
    tutorial: '/learn/ollama-setup',
    cta: {
      primary: 'Start Free Tutorial',
      primaryLink: '/learn/ollama-setup',
      secondary: 'View on GitHub',
      secondaryLink: 'https://github.com/ollama/ollama',
    },
  },
  {
    id: 'zeabur',
    name: 'Zeabur',
    tagline: 'One-click cloud deployment',
    category: 'hosting',
    price: '$5/month',
    status: 'available',
    description: 'Deploy your OpenClaw agents to the cloud with zero configuration. Get started in minutes with our affiliate partnership.',
    affiliateLink: 'https://zeabur.com?referralCode=openclaw',
    affiliateCode: 'OpenClaw',
    affiliateDiscount: '10% off',
    features: [
      'One-click deployment',
      'Automatic HTTPS',
      'Global CDN',
      '24/7 monitoring',
      'OpenClaw optimized templates',
    ],
    screenshots: [
      '/images/zeabur-dashboard.jpg',
      '/images/zeabur-deploy.jpg',
      '/images/zeabur-logs.jpg',
    ],
    tutorial: '/learn/zeabur-deployment',
    cta: {
      primary: 'Deploy Now (10% off)',
      primaryLink: 'https://zeabur.com?referralCode=openclaw',
      secondary: 'View Tutorial',
      secondaryLink: '/learn/zeabur-deployment',
    },
  },
  {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    tagline: 'AI voice synthesis',
    category: 'skills',
    price: '$5/month',
    status: 'available',
    description: 'Add realistic voice capabilities to your OpenClaw agents. High-quality text-to-speech with multiple voice options.',
    affiliateLink: 'https://try.elevenlabs.io/clawhub',
    commission: '22% recurring',
    features: [
      'Natural-sounding voices',
      'Multi-language support',
      'Voice cloning capabilities',
      'API integration',
      'OpenClaw skill available',
    ],
    screenshots: [
      '/images/elevenlabs-interface.jpg',
      '/images/elevenlabs-voices.jpg',
      '/images/elevenlabs-openclaw.jpg',
    ],
    tutorial: '/learn/elevenlabs-integration',
    cta: {
      primary: 'Try ElevenLabs',
      primaryLink: 'https://try.elevenlabs.io/clawhub',
      secondary: 'View Tutorial',
      secondaryLink: '/learn/elevenlabs-integration',
    },
  },
  {
    id: 'heygen',
    name: 'HeyGen',
    tagline: 'AI video generation',
    category: 'skills',
    price: '$29/month',
    status: 'available',
    description: 'Create professional AI-generated videos with digital avatars. Perfect for content creation, marketing, and training materials.',
    affiliateLink: 'https://www.heygen.com/?sid=rewardful&via=clawhub',
    commission: '20% recurring',
    features: [
      'AI-powered video avatars',
      'Multi-language video creation',
      'Custom avatar training',
      'API integration for automation',
      'Template library included',
    ],
    screenshots: [
      '/images/heygen-studio.jpg',
      '/images/heygen-avatars.jpg',
      '/images/heygen-output.jpg',
    ],
    tutorial: '/learn/heygen-video',
    cta: {
      primary: 'Try HeyGen',
      primaryLink: 'https://www.heygen.com/?sid=rewardful&via=clawhub',
      secondary: 'View Tutorial',
      secondaryLink: '/learn/heygen-video',
    },
  },
  {
    id: 'umbrel',
    name: 'Umbrel',
    tagline: 'Self-hosted home server',
    category: 'hardware',
    price: '$299',
    status: 'available',
    description: 'Run your own personal cloud server at home. Host AI models, apps, and services with complete data sovereignty.',
    affiliateLink: 'https://umbrel.com',
    features: [
      'Personal home server',
      'One-click app installs',
      'Complete data sovereignty',
      'Bitcoin & Lightning node',
      'Self-hosted AI models',
    ],
    screenshots: [
      '/images/umbrel-home.jpg',
      '/images/umbrel-apps.jpg',
      '/images/umbrel-hardware.jpg',
    ],
    tutorial: '/learn/umbrel-setup',
    cta: {
      primary: 'Get Umbrel',
      primaryLink: 'https://umbrel.com',
      secondary: 'View Tutorial',
      secondaryLink: '/learn/umbrel-setup',
    },
  },
]

export const productsBySlug = Object.fromEntries(products.map((p) => [p.id, p]))

export const categories = [
  { id: 'all', name: 'All Apps', count: products.length },
  { id: 'free', name: 'Free Tools', count: products.filter((p) => p.category === 'free').length },
  { id: 'skills', name: 'AI Skills', count: products.filter((p) => p.category === 'skills').length },
  { id: 'hosting', name: 'Cloud Hosting', count: products.filter((p) => p.category === 'hosting').length },
  { id: 'hardware', name: 'Hardware', count: products.filter((p) => p.category === 'hardware').length },
]

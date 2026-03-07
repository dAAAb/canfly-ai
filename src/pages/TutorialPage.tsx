import { useParams, Link } from 'react-router-dom'
import { ChevronLeft, Clock, CheckCircle, Play, Copy, ExternalLink } from 'lucide-react'
import { useState } from 'react'

// Tutorial data - this would normally come from CMS or API
const getTutorialData = (slug: string) => {
  const tutorials: Record<string, any> = {
    ollama: {
      id: 'ollama',
      title: 'Setup Ollama with OpenClaw',
      subtitle: 'Run AI models locally without API keys',
      duration: '5 minutes',
      difficulty: 'Beginner',
      description: 'Learn how to install Ollama and connect it to OpenClaw for free local AI.',
      videoUrl: 'https://www.youtube.com/embed/placeholder',
      steps: [
        {
          title: 'Install Ollama',
          content: 'Download and install Ollama on your system.',
          commands: [
            '# macOS/Linux',
            'curl -fsSL https://ollama.ai/install.sh | sh',
            '',
            '# Windows: Download from https://ollama.ai/download'
          ],
          expectedResult: 'You should see "Ollama installed successfully" message.',
          tips: ['Make sure you have at least 8GB of RAM', 'The installation may take a few minutes']
        },
        {
          title: 'Start Ollama Service',
          content: 'Start the Ollama service in the background.',
          commands: [
            'ollama serve'
          ],
          expectedResult: 'Service starts on http://localhost:11434',
          tips: ['Keep this terminal window open', 'You can also run this as a system service']
        },
        {
          title: 'Download a Model',
          content: 'Download your first AI model to use with OpenClaw.',
          commands: [
            'ollama pull llama2',
            '',
            '# For faster, smaller model:',
            'ollama pull llama2:7b-chat-q4_0'
          ],
          expectedResult: 'Model downloads and becomes available (may take 5-10 minutes for first download).',
          tips: ['Llama2 is about 4GB', 'Smaller quantized models are faster on slower hardware']
        },
        {
          title: 'Test Your Setup',
          content: 'Verify everything is working correctly.',
          commands: [
            'ollama run llama2 "Hello! Please introduce yourself."'
          ],
          expectedResult: 'The AI model responds with an introduction.',
          tips: ['Try asking different questions to test the model', 'Press Ctrl+C to exit the chat']
        },
        {
          title: 'Connect to OpenClaw',
          content: 'Configure OpenClaw to use your local Ollama instance.',
          commands: [
            '# In OpenClaw configuration:',
            'export OLLAMA_HOST="http://localhost:11434"',
            'export AI_MODEL="llama2"',
            '',
            '# Or add to your .env file:',
            'OLLAMA_HOST=http://localhost:11434',
            'AI_MODEL=llama2'
          ],
          expectedResult: 'OpenClaw can now use Ollama for AI responses.',
          tips: ['Restart OpenClaw after changing configuration', 'You can switch models by changing AI_MODEL']
        }
      ],
      nextSteps: [
        { title: 'Deploy to Cloud', description: 'Host your setup on Zeabur', link: '/learn/zeabur' },
        { title: 'Add Voice', description: 'Connect ElevenLabs for speech', link: '/apps/elevenlabs' },
        { title: 'Create Videos', description: 'Generate content with HeyGen', link: '/apps/heygen' }
      ],
      troubleshooting: [
        {
          problem: 'Ollama command not found',
          solution: 'Make sure Ollama is installed and added to your PATH. Try restarting your terminal.'
        },
        {
          problem: 'Model download is slow',
          solution: 'Large models take time to download. Ensure you have a stable internet connection.'
        },
        {
          problem: 'OpenClaw cannot connect',
          solution: 'Check that Ollama service is running and accessible at localhost:11434'
        }
      ]
    },
    zeabur: {
      id: 'zeabur',
      title: 'Deploy OpenClaw to Zeabur',
      subtitle: 'One-click cloud deployment in 3 minutes',
      duration: '3 minutes',
      difficulty: 'Beginner',
      description: 'Deploy your OpenClaw agent to the cloud with zero configuration.',
      steps: [
        {
          title: 'Sign Up for Zeabur',
          content: 'Create a free Zeabur account with GitHub.',
          commands: ['# Visit https://zeabur.com and sign up with GitHub'],
          expectedResult: 'You have access to the Zeabur dashboard.'
        },
        {
          title: 'Connect Your Repository',
          content: 'Connect your OpenClaw repository to Zeabur.',
          expectedResult: 'Repository appears in your Zeabur projects.'
        },
        {
          title: 'Configure Environment',
          content: 'Set up your environment variables.',
          commands: [
            'OPENAI_API_KEY=your_api_key_here',
            'NODE_ENV=production'
          ],
          expectedResult: 'Environment variables are saved.'
        },
        {
          title: 'Deploy',
          content: 'Click deploy and watch your app go live.',
          expectedResult: 'Your OpenClaw agent is running in the cloud!'
        }
      ],
      nextSteps: [
        { title: 'Custom Domain', description: 'Set up your own domain', link: '/learn/zeabur-domain' },
        { title: 'Monitor Performance', description: 'Track your agent usage', link: '/learn/zeabur-monitoring' }
      ]
    }
  }

  return tutorials[slug] || null
}

export default function TutorialPage() {
  const { slug } = useParams()
  const tutorial = getTutorialData(slug!)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null)

  const toggleStepComplete = (stepIndex: number) => {
    setCompletedSteps(prev =>
      prev.includes(stepIndex)
        ? prev.filter(i => i !== stepIndex)
        : [...prev, stepIndex]
    )
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedCommand(text)
    setTimeout(() => setCopiedCommand(null), 2000)
  }

  if (!tutorial) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Tutorial not found</h1>
          <Link to="/apps" className="text-blue-400 hover:text-blue-300">
            ← Back to Apps
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Dark header */}
      <div className="bg-gray-950 border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link to={`/apps/${tutorial.id}`} className="flex items-center gap-2 text-gray-400 hover:text-white">
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm">Back to {tutorial.title.split(' ')[1]}</span>
          </Link>
        </div>
      </div>

      {/* Hero section */}
      <div className="bg-gradient-to-br from-gray-950 via-black to-gray-950 py-16">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">{tutorial.title}</h1>
            <p className="text-xl text-gray-300 mb-6">{tutorial.subtitle}</p>

            <div className="flex items-center justify-center gap-6 text-sm text-gray-400 mb-8">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {tutorial.duration}
              </div>
              <div>Difficulty: {tutorial.difficulty}</div>
              <div>
                {completedSteps.length}/{tutorial.steps.length} completed
              </div>
            </div>

            {/* Video placeholder */}
            <div className="aspect-video bg-gray-900 rounded-xl mb-8 flex items-center justify-center">
              <div className="text-center">
                <Play className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <div className="text-gray-500">Tutorial Video</div>
                <div className="text-sm text-gray-600">Coming Soon</div>
              </div>
            </div>

            <div className="text-left max-w-2xl mx-auto">
              <p className="text-gray-300 leading-relaxed">{tutorial.description}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tutorial steps */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="space-y-8">
          {tutorial.steps.map((step: any, index: number) => (
            <div
              key={index}
              className="bg-gray-950 border border-gray-800 rounded-xl p-6"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="flex-shrink-0">
                  <button
                    onClick={() => toggleStepComplete(index)}
                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${
                      completedSteps.includes(index)
                        ? 'bg-green-600 border-green-600'
                        : 'border-gray-600 hover:border-green-600'
                    }`}
                  >
                    {completedSteps.includes(index) && (
                      <CheckCircle className="w-5 h-5 text-white" />
                    )}
                  </button>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">
                    Step {index + 1}: {step.title}
                  </h3>
                  <p className="text-gray-300 mb-4">{step.content}</p>

                  {/* Commands */}
                  {step.commands && (
                    <div className="mb-4">
                      <div className="bg-gray-900 rounded-lg p-4 relative">
                        <button
                          onClick={() => copyToClipboard(step.commands.join('\n'))}
                          className="absolute top-3 right-3 p-2 text-gray-400 hover:text-white transition-colors"
                          title="Copy to clipboard"
                        >
                          {copiedCommand === step.commands.join('\n') ? (
                            <CheckCircle className="w-4 h-4 text-green-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                        <pre className="text-sm text-gray-300 font-mono overflow-x-auto pr-12">
                          {step.commands.join('\n')}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Expected result */}
                  {step.expectedResult && (
                    <div className="bg-green-900/20 border border-green-800/30 rounded-lg p-4 mb-4">
                      <h4 className="text-sm font-semibold text-green-400 mb-2">Expected Result:</h4>
                      <p className="text-sm text-gray-300">{step.expectedResult}</p>
                    </div>
                  )}

                  {/* Tips */}
                  {step.tips && (
                    <div className="bg-blue-900/20 border border-blue-800/30 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-blue-400 mb-2">Tips:</h4>
                      <ul className="text-sm text-gray-300 space-y-1">
                        {step.tips.map((tip: string, tipIndex: number) => (
                          <li key={tipIndex} className="flex items-start gap-2">
                            <span className="text-blue-400">•</span>
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Troubleshooting */}
        {tutorial.troubleshooting && (
          <div className="mt-12 bg-yellow-900/20 border border-yellow-800/30 rounded-xl p-6">
            <h3 className="text-xl font-semibold text-yellow-400 mb-4">Troubleshooting</h3>
            <div className="space-y-4">
              {tutorial.troubleshooting.map((item: any, index: number) => (
                <div key={index}>
                  <h4 className="font-medium text-white mb-2">{item.problem}</h4>
                  <p className="text-gray-300 text-sm">{item.solution}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Next steps */}
        {tutorial.nextSteps && (
          <div className="mt-12">
            <h3 className="text-2xl font-bold mb-6">What's Next?</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {tutorial.nextSteps.map((step: any, index: number) => (
                <Link
                  key={index}
                  to={step.link}
                  className="bg-gray-950 border border-gray-800 rounded-xl p-6 hover:border-gray-600 transition-colors group"
                >
                  <h4 className="font-semibold text-white group-hover:text-blue-400 transition-colors mb-2">
                    {step.title}
                  </h4>
                  <p className="text-gray-400 text-sm">{step.description}</p>
                  <ExternalLink className="w-4 h-4 text-gray-600 group-hover:text-blue-400 mt-3 transition-colors" />
                </Link>
              ))}
            </div>
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
            "description": tutorial.description,
            "totalTime": tutorial.duration,
            "supply": tutorial.steps.map((step: any) => step.title),
            "tool": tutorial.id,
            "step": tutorial.steps.map((step: any, index: number) => ({
              "@type": "HowToStep",
              "position": index + 1,
              "name": step.title,
              "text": step.content,
              "code": step.commands?.join('\n'),
              "expectedResult": step.expectedResult
            }))
          })}
        </script>

        {/* Full automation commands for AI agents */}
        <div className="automation-script">
          <h4>AI Agent Automation Script:</h4>
          <pre>{`# Complete ${tutorial.title} automation
${tutorial.steps.map((step: any, index: number) =>
  `# Step ${index + 1}: ${step.title}
${step.commands?.join('\n') || '# Manual step - see tutorial'}`
).join('\n\n')}

# Verification commands
${tutorial.id === 'ollama' ? `ollama list
curl http://localhost:11434/api/tags` : '# See tutorial for verification steps'}`}</pre>
        </div>
      </div>
    </div>
  )
}

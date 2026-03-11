import { useParams } from 'react-router-dom'
import Navbar from '../components/Navbar'

export default function BrandPage() {
  const { brandName } = useParams<{ brandName: string }>()

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-black page-enter">
        <div className="max-w-4xl mx-auto px-6 py-16 md:py-24 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            {brandName}
          </h1>
          <p className="text-gray-400 text-lg">Coming soon</p>
        </div>
      </main>
    </>
  )
}

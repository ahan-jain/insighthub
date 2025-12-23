'use client'


import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'


const MapContainer = dynamic(
  () => import('react-leaflet').then(mod => mod.MapContainer),
  { ssr: false }
)
const TileLayer = dynamic(
  () => import('react-leaflet').then(mod => mod.TileLayer),
  { ssr: false }
)
const Marker = dynamic(
  () => import('react-leaflet').then(mod => mod.Marker),
  { ssr: false }
)
const Popup = dynamic(
  () => import('react-leaflet').then(mod => mod.Popup),
  { ssr: false }
)

interface Detection {
  label: string
  confidence: number
  bbox: number[]
}

interface AnalysisData {
  analysis_id: string
  detections: Detection[]
  score: number
  summary: string
  latitude?: number
  longitude?: number
  location_accuracy?: number
  timestamp: string
}

export default function ResultsPage() {
  const params = useParams()
  const analysisId = params.id as string

  const [data, setData] = useState<AnalysisData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.25)
  
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const storedData = sessionStorage.getItem(`analysis_${analysisId}`)
        
        if (storedData) {
          setData(JSON.parse(storedData))
        } else {
          setError('Analysis data not found')
        }
        
        setLoading(false)
      } catch (err) {
        setError('Failed to load results')
        setLoading(false)
      }
    }

    fetchData()
  }, [analysisId])

  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => setOriginalImage(img)
    img.src = `http://localhost:8000/images/${analysisId}/original`
  }, [analysisId])

  useEffect(() => {
    if (!originalImage || !canvasRef.current || !data) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = originalImage.width
    canvas.height = originalImage.height

    ctx.drawImage(originalImage, 0, 0)

    const filteredDetections = data.detections.filter(
      (det) => det.confidence >= confidenceThreshold
    )

    filteredDetections.forEach((det) => {
      const [x1, y1, x2, y2] = det.bbox

      ctx.strokeStyle = '#00ff00'
      ctx.lineWidth = 3
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1)

      const label = `${det.label} ${(det.confidence * 100).toFixed(0)}%`
      ctx.font = '16px Arial'
      const textMetrics = ctx.measureText(label)
      const textHeight = 20

      ctx.fillStyle = '#00ff00'
      ctx.fillRect(x1, y1 - textHeight - 5, textMetrics.width + 10, textHeight + 5)

      ctx.fillStyle = '#000000'
      ctx.fillText(label, x1 + 5, y1 - 8)
    })
  }, [originalImage, data, confidenceThreshold])

  const filteredDetections = data?.detections.filter(
    (det) => det.confidence >= confidenceThreshold
  ) || []

  const getChartData = () => {
    if (!filteredDetections.length) return []

    const labelCounts: { [key: string]: number } = {}
    filteredDetections.forEach((det) => {
      labelCounts[det.label] = (labelCounts[det.label] || 0) + 1
    })

    return Object.entries(labelCounts).map(([label, count]) => ({
      label,
      count,
    }))
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading results...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'No data found'}</p>
          <Link href="/" className="text-blue-600 hover:underline">
            Back to Upload
          </Link>
        </div>
      </div>
    )
  }

  const hasLocation = data.latitude !== null && data.longitude !== null

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="text-blue-600 hover:underline mb-4 inline-block">
            ← Back to Upload
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Analysis Results
          </h1>
          <p className="text-gray-600">{data.summary}</p>
          
          {/* NEW: Timestamp */}
          <p className="text-sm text-gray-500 mt-2">
            📅 {new Date(data.timestamp).toLocaleString()}
          </p>
        </div>

        {/* NEW: Location Map */}
        {hasLocation && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Analysis Location</h2>
            <p className="text-sm text-gray-600 mb-4">
              📍 {data.latitude!.toFixed(6)}°, {data.longitude!.toFixed(6)}°
              {data.location_accuracy && (
                <span className="ml-2">
                  (±{data.location_accuracy.toFixed(0)}m accuracy)
                </span>
              )}
            </p>
            
            <div className="h-96 rounded-lg overflow-hidden border border-gray-200">
              <MapContainer
                center={[data.latitude!, data.longitude!]}
                zoom={15}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={[data.latitude!, data.longitude!]}>
                  <Popup>
                    <div className="text-center">
                      <p className="font-semibold">Analysis Location</p>
                      <p className="text-xs text-gray-600">
                        {data.latitude!.toFixed(6)}°, {data.longitude!.toFixed(6)}°
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(data.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              </MapContainer>
            </div>
          </div>
        )}

        {/* Score Card */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-2">Overall Score</h2>
          <div className="text-5xl font-bold text-blue-600">
            {(data.score * 100).toFixed(1)}%
          </div>
          <p className="text-gray-600 mt-2">
            Average confidence across all detections
          </p>
        </div>

        {/* Confidence Slider */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Confidence Threshold</h2>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={confidenceThreshold}
              onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <span className="text-lg font-semibold text-blue-600 min-w-[60px]">
              {(confidenceThreshold * 100).toFixed(0)}%
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Showing {filteredDetections.length} of {data.detections.length} detections
          </p>
        </div>

        {/* Images */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Original Image */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Original Image</h2>
            <div className="flex justify-center items-center bg-gray-50 rounded p-4">
              <img
                src={`http://localhost:8000/images/${analysisId}/original`}
                alt="Original"
                className="max-w-full max-h-[500px] w-auto h-auto object-contain rounded"
              />
            </div>
          </div>

          {/* Annotated Image */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Detected Objects</h2>
            <div className="flex justify-center items-center bg-gray-50 rounded p-4">
              <canvas
                ref={canvasRef}
                className="max-w-full max-h-[500px] w-auto h-auto object-contain rounded"
                style={{ display: 'block' }}
              />
            </div>
          </div>
        </div>

        {/* Detections Table */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">
            Detections ({filteredDetections.length})
          </h2>
          {filteredDetections.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No detections above {(confidenceThreshold * 100).toFixed(0)}% confidence
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Label
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Confidence
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bounding Box
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredDetections.map((det, idx) => (
                    <tr key={idx}>
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                        {det.label}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          {(det.confidence * 100).toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        [{det.bbox.map((v) => v.toFixed(0)).join(', ')}]
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Chart */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Detection Counts</h2>
          {getChartData().length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No data to display
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={getChartData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </main>
  )
}
'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
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
}

export default function ResultsPage() {
  const params = useParams()
  const analysisId = params.id as string

  const [data, setData] = useState<AnalysisData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.25)

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

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-blue-600 hover:underline mb-4 inline-block">
            ← Back to Upload
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Analysis Results
          </h1>
          <p className="text-gray-600">{data.summary}</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-2">Overall Score</h2>
          <div className="text-5xl font-bold text-blue-600">
            {(data.score * 100).toFixed(1)}%
          </div>
          <p className="text-gray-600 mt-2">
            Average confidence across all detections
          </p>
        </div>

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
              className="flex-1"
            />
            <span className="text-lg font-semibold text-blue-600 min-w-[60px]">
              {(confidenceThreshold * 100).toFixed(0)}%
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Showing {filteredDetections.length} of {data.detections.length} detections
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Original Image</h2>
            <img
              src={`http://localhost:8000/images/${analysisId}/original`}
              alt="Original"
              className="w-full h-auto rounded"
            />
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Detected Objects</h2>
            <img
              src={`http://localhost:8000/images/${analysisId}/annotated`}
              alt="Annotated"
              className="w-full h-auto rounded"
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Detections</h2>
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
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Detection Counts</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={getChartData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </main>
  )
}

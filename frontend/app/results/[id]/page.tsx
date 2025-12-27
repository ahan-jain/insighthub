'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
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

const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false })

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
  severity: string
  severity_reason: string
  tags: string[]
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(#f9fafb, #f3f4f6)',
    padding: 24,
  },
  container: {
    maxWidth: 1100,
    margin: '0 auto',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
    gap: 16,
    flexWrap: 'wrap',
  },
  backLink: {
    display: 'inline-block',
    color: '#2563eb',
    textDecoration: 'none',
    marginBottom: 16,
    fontWeight: 600,
  },
  h1: { fontSize: 36, fontWeight: 800, marginBottom: 8 },
  muted: { color: '#4b5563' },
  smallMuted: { color: '#6b7280', fontSize: 14 },
  downloadBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 20px',
    borderRadius: 12,
    border: 0,
    background: '#2563eb',
    color: '#fff',
    fontWeight: 900,
    fontSize: 14,
    cursor: 'pointer',
    transition: 'background 0.2s',
    flexShrink: 0,
  },
  downloadBtnDisabled: {
    background: '#9ca3af',
    cursor: 'not-allowed',
  },
  spinner: {
    width: 16,
    height: 16,
    border: '2px solid rgba(255,255,255,0.3)',
    borderTop: '2px solid #fff',
    borderRadius: '50%',
  },
  card: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  cardTitle: { fontSize: 18, fontWeight: 700, marginBottom: 12 },
  score: { fontSize: 48, fontWeight: 800, color: '#2563eb' },
  mapWrap: {
    height: 384,
    borderRadius: 12,
    overflow: 'hidden',
    border: '1px solid #e5e7eb',
  },
  viewer: {
    background: '#f9fafb',
    borderRadius: 10,
    padding: 16,
    border: '1px solid #eef2f7',
  },
  severityCard: {
    border: '2px solid',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  severityCardCritical: {
    background: '#fef2f2',
    borderColor: '#fca5a5',
  },
  severityCardHigh: {
    background: '#fff7ed',
    borderColor: '#fdba74',
  },
  severityCardMedium: {
    background: '#fefce8',
    borderColor: '#fde047',
  },
  severityCardLow: {
    background: '#f0fdf4',
    borderColor: '#86efac',
  },
  severityHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  severityIcon: {
    fontSize: 32,
  },
  severityTitle: {
    fontSize: 20,
    fontWeight: 900,
    margin: 0,
  },
  severityTitleCritical: {
    color: '#991b1b',
  },
  severityTitleHigh: {
    color: '#9a3412',
  },
  severityTitleMedium: {
    color: '#854d0e',
  },
  severityTitleLow: {
    color: '#166534',
  },
  severityReason: {
    fontSize: 14,
    margin: 0,
    lineHeight: 1.5,
  },
  severityReasonCritical: {
    color: '#7f1d1d',
  },
  severityReasonHigh: {
    color: '#7c2d12',
  },
  severityReasonMedium: {
    color: '#713f12',
  },
  severityReasonLow: {
    color: '#14532d',
  },
  tagsWrap: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 12px',
    borderRadius: 999,
    background: '#eff6ff',
    border: '1px solid #bfdbfe',
    color: '#1e40af',
    fontSize: 13,
    fontWeight: 700,
  },
}

function SeverityBadge({ severity, reason }: { severity: string; reason: string }) {
  const severityConfig = {
    CRITICAL: {
      card: { ...styles.severityCard, ...styles.severityCardCritical },
      title: { ...styles.severityTitle, ...styles.severityTitleCritical },
      reason: { ...styles.severityReason, ...styles.severityReasonCritical },
      icon: '🔴',
    },
    HIGH: {
      card: { ...styles.severityCard, ...styles.severityCardHigh },
      title: { ...styles.severityTitle, ...styles.severityTitleHigh },
      reason: { ...styles.severityReason, ...styles.severityReasonHigh },
      icon: '🟠',
    },
    MEDIUM: {
      card: { ...styles.severityCard, ...styles.severityCardMedium },
      title: { ...styles.severityTitle, ...styles.severityTitleMedium },
      reason: { ...styles.severityReason, ...styles.severityReasonMedium },
      icon: '🟡',
    },
    LOW: {
      card: { ...styles.severityCard, ...styles.severityCardLow },
      title: { ...styles.severityTitle, ...styles.severityTitleLow },
      reason: { ...styles.severityReason, ...styles.severityReasonLow },
      icon: '🟢',
    },
  }

  const config = severityConfig[severity as keyof typeof severityConfig] || severityConfig.LOW

  return (
    <div style={config.card}>
      <div style={styles.severityHeader}>
        <span style={styles.severityIcon}>{config.icon}</span>
        <h3 style={config.title}>{severity} SEVERITY</h3>
      </div>
      <p style={config.reason}>{reason}</p>
    </div>
  )
}

export default function ResultsPage() {
  const params = useParams()
  const analysisId = params.id as string

  const [data, setData] = useState<AnalysisData | null>(null)
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.25)
  const [isDownloading, setIsDownloading] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null)

  useEffect(() => {
    const L = require('leaflet')
    delete L.Icon.Default.prototype._getIconUrl
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    })
  }, [])

  useEffect(() => {
    const stored = sessionStorage.getItem(`analysis_${analysisId}`)
    if (stored) setData(JSON.parse(stored))
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

    const cssWidth = canvas.clientWidth || originalImage.width
    const scale = cssWidth / originalImage.width
    const cssHeight = Math.round(originalImage.height * scale)

    canvas.width = Math.round(cssWidth)
    canvas.height = cssHeight

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(originalImage, 0, 0, canvas.width, canvas.height)

    const dets = data.detections.filter((d) => d.confidence >= confidenceThreshold)

    ctx.strokeStyle = '#00ff00'
    ctx.lineWidth = Math.max(2, 3 * scale)

    dets.forEach((det) => {
      const [x1, y1, x2, y2] = det.bbox

      const sx1 = x1 * scale
      const sy1 = y1 * scale
      const sw = (x2 - x1) * scale
      const sh = (y2 - y1) * scale

      ctx.strokeRect(sx1, sy1, sw, sh)

      const label = `${det.label} ${(det.confidence * 100).toFixed(0)}%`

      const fontSize = Math.max(12, Math.round(16 * scale))
      ctx.font = `${fontSize}px Arial`

      const padX = Math.max(6, Math.round(6 * scale))
      const padY = Math.max(4, Math.round(4 * scale))
      const textW = ctx.measureText(label).width
      const boxH = Math.round(fontSize * 1.3) + padY
      const boxW = textW + padX * 2

      const ly = sy1 - boxH - 4
      const drawY = ly > 0 ? ly : sy1 + 4

      ctx.fillStyle = '#00ff00'
      ctx.fillRect(sx1, drawY, boxW, boxH)

      ctx.fillStyle = '#000000'
      ctx.fillText(label, sx1 + padX, drawY + Math.round(fontSize * 1.05))

      ctx.fillStyle = '#00ff00'
    })
  }, [originalImage, data, confidenceThreshold])

  const handleDownloadReport = async () => {
    setIsDownloading(true)
    
    try {
      const response = await fetch(
        `http://localhost:8000/analyze/${analysisId}/report`
      )
      
      if (!response.ok) {
        throw new Error('Failed to generate report')
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `analysis_${analysisId}_report.pdf`
      
      document.body.appendChild(link)
      link.click()
      
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
    } catch (error) {
      console.log('Download error:', error)
      alert('Failed to download report')
    } finally {
      setIsDownloading(false)
    }
  }

  const filteredDetections = data
    ? data.detections.filter((d) => d.confidence >= confidenceThreshold)
    : []

  const chartData = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const det of filteredDetections) counts[det.label] = (counts[det.label] || 0) + 1
    return Object.entries(counts).map(([label, count]) => ({ label, count }))
  }, [filteredDetections])

  if (!data) return null

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <div style={styles.headerRow}>
        <div style={{ flex: 1 }}>
            <div style={{ marginBottom: 16 }}>
              <Link href="/dashboard" style={styles.backLink}>
                ← Dashboard
              </Link>
              <span style={{ margin: '0 12px', color: '#d1d5db' }}>|</span>
              <Link href="/" style={styles.backLink}>
                Upload
              </Link>
            </div>
            <h1 style={styles.h1}>Analysis Results</h1>
            <p style={styles.muted}>{data.summary}</p>
          </div>
          
          <button
            onClick={handleDownloadReport}
            disabled={isDownloading}
            style={{
              ...styles.downloadBtn,
              ...(isDownloading ? styles.downloadBtnDisabled : {}),
            }}
            onMouseEnter={(e) => {
              if (!isDownloading) {
                e.currentTarget.style.background = '#1d4ed8'
              }
            }}
            onMouseLeave={(e) => {
              if (!isDownloading) {
                e.currentTarget.style.background = '#2563eb'
              }
            }}
          >
            {isDownloading ? (
              <>
                <div style={{
                  ...styles.spinner,
                  animation: 'spin 0.6s linear infinite',
                }} />
                Generating...
              </>
            ) : (
              <>
                <span style={{ fontSize: 18 }}>📄</span>
                Download PDF Report
              </>
            )}
          </button>
        </div>

        {data.severity && data.severity_reason && (
          <SeverityBadge severity={data.severity} reason={data.severity_reason} />
        )}

        {data.latitude && data.longitude && (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Analysis Location</h2>
            <div style={styles.mapWrap}>
              <MapContainer
                center={[data.latitude, data.longitude]}
                zoom={15}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Marker position={[data.latitude, data.longitude]}>
                  <Popup>Analysis Location</Popup>
                </Marker>
              </MapContainer>
            </div>
          </div>
        )}

        {data.tags && data.tags.length > 0 && (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Auto-Generated Tags</h2>
            <div style={styles.tagsWrap}>
              {data.tags.map((tag, idx) => (
                <span key={idx} style={styles.tag}>
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Overall Score</h2>
          <p style={styles.score}>{(data.score * 100).toFixed(1)}%</p>
        </div>

        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Confidence Threshold</h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={confidenceThreshold}
              onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
              style={{ width: '100%' }}
            />
            <span style={{ fontWeight: 700, color: '#2563eb', minWidth: 56 }}>
              {(confidenceThreshold * 100).toFixed(0)}%
            </span>
          </div>

          <p style={{ ...styles.smallMuted, marginTop: 10 }}>
            Showing {filteredDetections.length} of {data.detections.length} detections
          </p>
        </div>

        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Original Image</h2>
          <div style={styles.viewer}>
            <img
              src={`http://localhost:8000/images/${analysisId}/original`}
              alt="Original"
              style={{ width: '100%', height: 'auto', borderRadius: 10 }}
            />
          </div>
        </div>

        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Detected Objects</h2>
          <div style={styles.viewer}>
            <canvas
              ref={canvasRef}
              style={{ width: '100%', display: 'block', borderRadius: 10 }}
            />
          </div>
        </div>

        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Detections</h2>

          {filteredDetections.length === 0 ? (
            <p style={{ ...styles.smallMuted, textAlign: 'center', padding: 24 }}>
              No detections above {(confidenceThreshold * 100).toFixed(0)}% confidence
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 12, color: '#6b7280' }}>
                      Label
                    </th>
                    <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 12, color: '#6b7280' }}>
                      Confidence
                    </th>
                    <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 12, color: '#6b7280' }}>
                      Bounding Box
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDetections.map((det, idx) => (
                    <tr key={idx} style={{ borderTop: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '10px 12px' }}>{det.label}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '4px 10px',
                            borderRadius: 999,
                            background: '#ecfeff',
                            border: '1px solid #67e8f9',
                            color: '#0369a1',
                            fontWeight: 700,
                            fontSize: 13,
                          }}
                        >
                          {(det.confidence * 100).toFixed(1)}%
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span
                          style={{
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                            fontSize: 12,
                            color: '#6b7280',
                            background: '#f9fafb',
                            border: '1px solid #e5e7eb',
                            borderRadius: 6,
                            padding: '3px 6px',
                            display: 'inline-block',
                          }}
                        >
                          [{det.bbox.map((v) => v.toFixed(0)).join(', ')}]
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Detection Counts</h2>

          {chartData.length === 0 ? (
            <p style={{ ...styles.smallMuted, textAlign: 'center', padding: 24 }}>
              No data to display
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData}>
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
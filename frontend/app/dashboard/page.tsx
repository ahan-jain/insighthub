'use client'

import { useEffect, useState } from 'react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'
import { format } from 'date-fns'
import Link from 'next/link'

interface AnalyticsData {
  total_analyses: number
  time_series: Array<{ date: string; count: number }>
  top_detections: Array<{ label: string; count: number }>
  recent_analyses: Array<{
    analysis_id: string
    timestamp: string
    detection_count: number
    score: number
    severity: string
  }>
  severity_breakdown: Record<string, number>
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(#f9fafb, #f3f4f6)',
    padding: 24,
  },
  container: {
    maxWidth: 1400,
    margin: '0 auto',
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 42,
    fontWeight: 900,
    marginBottom: 8,
    color: '#111827',
  },
  subtitle: {
    color: '#4b5563',
    fontSize: 16,
  },
  grid: {
    display: 'grid',
    gap: 20,
    marginBottom: 20,
  },
  grid4: {
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  },
  grid2: {
    gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))',
  },
  grid3: {
    gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
  },
  card: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    padding: 20,
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 800,
    marginBottom: 16,
    color: '#111827',
  },
  metricValue: {
    fontSize: 40,
    fontWeight: 900,
    color: '#2563eb',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: 600,
  },
  metricHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricIcon: {
    fontSize: 28,
  },
  analysisItem: {
    display: 'block',
    padding: 12,
    borderRadius: 10,
    border: '1px solid #e5e7eb',
    marginBottom: 10,
    textDecoration: 'none',
    transition: 'all 0.2s',
  },
  analysisRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  analysisId: {
    fontFamily: 'ui-monospace, monospace',
    fontSize: 13,
    color: '#4b5563',
    fontWeight: 700,
  },
  analysisTime: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 4,
  },
  analysisStats: {
    textAlign: 'right' as const,
  },
  analysisCount: {
    fontSize: 13,
    fontWeight: 800,
    color: '#111827',
  },
  analysisScore: {
    fontSize: 11,
    color: '#6b7280',
  },
  severityBadge: {
    display: 'inline-block',
    padding: '3px 8px',
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 800,
    border: '1px solid',
  },
  severityCritical: {
    background: '#fef2f2',
    borderColor: '#fca5a5',
    color: '#991b1b',
  },
  severityHigh: {
    background: '#fff7ed',
    borderColor: '#fdba74',
    color: '#9a3412',
  },
  severityMedium: {
    background: '#fefce8',
    borderColor: '#fde047',
    color: '#854d0e',
  },
  severityLow: {
    background: '#f0fdf4',
    borderColor: '#86efac',
    color: '#166534',
  },
  uploadBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 10,
    padding: '14px 24px',
    borderRadius: 12,
    border: 0,
    background: '#2563eb',
    color: '#fff',
    fontWeight: 900,
    fontSize: 16,
    cursor: 'pointer',
    textDecoration: 'none',
    marginTop: 20,
  },
  centerText: {
    textAlign: 'center' as const,
    color: '#9ca3af',
    padding: 40,
    fontSize: 14,
  },
  listContainer: {
    maxHeight: 300,
    overflowY: 'auto' as const,
  },
  spinner: {
    width: 48,
    height: 48,
    border: '4px solid #e5e7eb',
    borderTop: '4px solid #2563eb',
    borderRadius: '50%',
    margin: '0 auto',
  },
}

function SeverityBadge({ severity }: { severity: string }) {
  const styleMap: Record<string, React.CSSProperties> = {
    CRITICAL: { ...styles.severityBadge, ...styles.severityCritical },
    HIGH: { ...styles.severityBadge, ...styles.severityHigh },
    MEDIUM: { ...styles.severityBadge, ...styles.severityMedium },
    LOW: { ...styles.severityBadge, ...styles.severityLow },
  }

  return (
    <span style={styleMap[severity] || styles.severityBadge}>
      {severity}
    </span>
  )
}

export default function DashboardPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('http://localhost:8000/analytics/overview')
      .then((res) => res.json())
      .then((data) => {
        setData(data)
        setLoading(false)
      })
      .catch((err) => {
        console.log('Failed to load analytics:', err)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div style={{ ...styles.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            ...styles.spinner,
            animation: 'spin 0.8s linear infinite',
          }} />
          <p style={{ marginTop: 16, color: '#6b7280' }}>Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div style={{ ...styles.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#6b7280' }}>Failed to load analytics</p>
      </div>
    )
  }

  const severityColors: Record<string, string> = {
    CRITICAL: '#dc2626',
    HIGH: '#ea580c',
    MEDIUM: '#ca8a04',
    LOW: '#16a34a'
  }

  const severityChartData = Object.entries(data.severity_breakdown).map(
    ([severity, count]) => ({
      name: severity,
      value: count,
      color: severityColors[severity] || '#6b7280'
    })
  )

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>Analytics Dashboard</h1>
          <p style={styles.subtitle}>Overview of detection analyses and trends</p>
        </div>

        <div style={{ ...styles.grid, ...styles.grid4 }}>
          <div style={styles.card}>
            <div style={styles.metricHeader}>
              <span style={styles.metricLabel}>Total Analyses</span>
              <span style={styles.metricIcon}>📊</span>
            </div>
            <div style={styles.metricValue}>{data.total_analyses}</div>
          </div>

          <div style={styles.card}>
            <div style={styles.metricHeader}>
              <span style={styles.metricLabel}>Last 7 Days</span>
              <span style={styles.metricIcon}>📅</span>
            </div>
            <div style={styles.metricValue}>
              {data.time_series.slice(-7).reduce((sum, d) => sum + d.count, 0)}
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.metricHeader}>
              <span style={styles.metricLabel}>Avg Detections</span>
              <span style={styles.metricIcon}>🎯</span>
            </div>
            <div style={styles.metricValue}>
              {data.total_analyses > 0
                ? (
                    data.recent_analyses.reduce((sum, a) => sum + a.detection_count, 0) /
                    data.recent_analyses.length
                  ).toFixed(1)
                : '0'}
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.metricHeader}>
              <span style={styles.metricLabel}>Critical Issues</span>
              <span style={styles.metricIcon}>🚨</span>
            </div>
            <div style={{ ...styles.metricValue, color: '#dc2626' }}>
              {data.severity_breakdown.CRITICAL || 0}
            </div>
          </div>
        </div>

        <div style={{ ...styles.grid, ...styles.grid2 }}>
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Analysis Trend (Last 30 Days)</h2>
            {data.time_series.length === 0 ? (
              <p style={styles.centerText}>No data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={data.time_series}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(date) => format(new Date(date), 'MMM dd')}
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      background: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    labelFormatter={(date) => format(new Date(date as string), 'PPP')}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#2563eb"
                    strokeWidth={3}
                    dot={{ fill: '#2563eb', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Top Detected Objects</h2>
            {data.top_detections.length === 0 ? (
              <p style={styles.centerText}>No data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.top_detections.slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      background: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="count" fill="#2563eb" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div style={{ ...styles.grid, ...styles.grid3 }}>
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Severity Breakdown</h2>
            {severityChartData.length === 0 ? (
              <p style={styles.centerText}>No data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={severityChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={70}
                    dataKey="value"
                  >
                    {severityChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div style={{ ...styles.card, gridColumn: 'span 2' }}>
            <h2 style={styles.cardTitle}>Recent Analyses</h2>
            {data.recent_analyses.length === 0 ? (
              <p style={styles.centerText}>No analyses yet</p>
            ) : (
              <div style={styles.listContainer}>
                {data.recent_analyses.map((analysis) => (
                  <Link
                    key={analysis.analysis_id}
                    href={`/results/${analysis.analysis_id}`}
                    style={styles.analysisItem}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#bfdbfe'
                      e.currentTarget.style.background = '#eff6ff'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e5e7eb'
                      e.currentTarget.style.background = 'transparent'
                    }}
                  >
                    <div style={styles.analysisRow}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={styles.analysisId}>
                            {analysis.analysis_id.slice(0, 8)}...
                          </span>
                          <SeverityBadge severity={analysis.severity} />
                        </div>
                        <p style={styles.analysisTime}>
                          {format(new Date(analysis.timestamp), 'PPpp')}
                        </p>
                      </div>
                      <div style={styles.analysisStats}>
                        <p style={styles.analysisCount}>
                          {analysis.detection_count} objects
                        </p>
                        <p style={styles.analysisScore}>
                          {(analysis.score * 100).toFixed(0)}% confidence
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <Link
            href="/"
            style={styles.uploadBtn}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#1d4ed8'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#2563eb'
            }}
          >
            <span style={{ fontSize: 20 }}>📷</span>
            Upload New Image
          </Link>
        </div>
      </div>
    </main>
  )
}
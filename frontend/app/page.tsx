'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { saveOfflineAnalysis, getPendingCount } from '../lib/offline-db'
import { syncPendingAnalyses } from '../lib/sync-manager'

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(#f9fafb, #f3f4f6)',
    padding: 24,
  },
  container: {
    maxWidth: 820,
    margin: '0 auto',
  },
  header: {
    textAlign: 'center',
    marginBottom: 18,
  },
  title: {
    fontSize: 42,
    fontWeight: 900,
    marginBottom: 6,
    color: '#111827',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: '#4b5563',
    fontSize: 16,
  },
  card: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 14,
    padding: 22,
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
    marginTop: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 800,
    marginBottom: 12,
    color: '#111827',
  },
  row: {
    display: 'flex',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  pill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 12px',
    borderRadius: 999,
    border: '1px solid #dbeafe',
    background: '#eff6ff',
    color: '#1e3a8a',
    fontSize: 13,
    fontWeight: 700,
    width: 'fit-content',
  },
  pillSub: {
    marginTop: 6,
    color: '#1d4ed8',
    fontSize: 12,
    fontWeight: 600,
  },
  grid2: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: 14,
    marginTop: 14,
  },
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 800,
    color: '#374151',
    marginBottom: 8,
  },
  inputWrap: {
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    padding: 14,
    background: '#ffffff',
  },
  fileRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  fileBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 14px',
    borderRadius: 12,
    border: '1px solid #e5e7eb',
    background: '#f9fafb',
    cursor: 'pointer',
    fontWeight: 800,
    color: '#111827',
  },
  fileHelp: {
    fontSize: 12,
    color: '#6b7280',
  },
  hiddenFile: { display: 'none' },
  error: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#b91c1c',
    padding: '10px 12px',
    borderRadius: 12,
    fontWeight: 700,
    fontSize: 13,
  },
  previewCard: {
    border: '1px solid #eef2f7',
    background: '#f9fafb',
    borderRadius: 12,
    padding: 14,
  },
  previewImg: {
    width: '100%',
    height: 'auto',
    borderRadius: 12,
    display: 'block',
  },
  button: {
    width: '100%',
    border: 0,
    borderRadius: 12,
    padding: '14px 16px',
    fontSize: 15,
    fontWeight: 900,
    cursor: 'pointer',
    background: '#2563eb',
    color: '#fff',
  },
  buttonDisabled: {
    background: '#9ca3af',
    cursor: 'not-allowed',
  },
  hint: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 10,
    textAlign: 'center',
  },

  statusBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
    flexWrap: 'wrap',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
  },
  statusOnline: {
    background: '#10b981',
  },
  statusOffline: {
    background: '#ef4444',
  },
  statusText: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 13,
    fontWeight: 700,
  },
  pendingBadge: {
    background: '#fef3c7',
    border: '1px solid #fbbf24',
    borderRadius: 999,
    padding: '6px 12px',
    fontSize: 12,
    fontWeight: 800,
    color: '#92400e',
  },
  offlineNotice: {
    background: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
  },
  offlineNoticeText: {
    fontSize: 13,
    color: '#1e40af',
    lineHeight: 1.5,
  },
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const [location, setLocation] = useState<{
    lat: number
    lon: number
    accuracy: number
  } | null>(null)
  const [locationStatus, setLocationStatus] = useState<string>('Detecting location...')

  // NEW: Online/Offline state
  const [isOnline, setIsOnline] = useState(true)
  const [pendingCount, setPendingCount] = useState(0)

  // Monitor online/offline status
  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine)
    }

    setIsOnline(navigator.onLine)
    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)

    return () => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
    }
  }, [])

  // Update pending count
  useEffect(() => {
    const updateCount = async () => {
      const count = await getPendingCount()
      setPendingCount(count)
    }

    updateCount()
    const interval = setInterval(updateCount, 5000) // Update every 5s

    return () => clearInterval(interval)
  }, [])

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      console.log('Device back online, syncing pending analyses...')
      syncPendingAnalyses().then(() => {
        getPendingCount().then(setPendingCount)
      })
    }
  }, [isOnline])

  // Existing GPS effect
  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setLocationStatus('GPS not supported on this device')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          accuracy: position.coords.accuracy,
        })
        setLocationStatus('Location detected')
        console.log('GPS:', position.coords)
      },
      (error) => {
        console.error('GPS error:', error)
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationStatus('Location permission denied')
            break
          case error.POSITION_UNAVAILABLE:
            setLocationStatus('Location unavailable')
            break
          case error.TIMEOUT:
            setLocationStatus('Location request timed out')
            break
          default:
            setLocationStatus('Location unavailable')
            break
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    )
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]

    if (selectedFile) {
      setFile(selectedFile)
      setError(null)

      const previewUrl = URL.createObjectURL(selectedFile)
      setPreview(previewUrl)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!file) {
      setError('Please select an image')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // If offline, save to IndexedDB
      if (!navigator.onLine) {
        const blob = new Blob([await file.arrayBuffer()], { type: file.type })

        await saveOfflineAnalysis({
          image: blob,
          imageFileName: file.name,
          latitude: location?.lat || null,
          longitude: location?.lon || null,
          locationAccuracy: location?.accuracy || null,
        })

        alert('📱 Saved offline! Will sync when connection returns.')
        setFile(null)
        setPreview(null)
        setLoading(false)

        // Update count
        const count = await getPendingCount()
        setPendingCount(count)

        return
      }

      // If online, upload normally
      const formData = new FormData()
      formData.append('file', file)

      if (location) {
        formData.append('latitude', location.lat.toString())
        formData.append('longitude', location.lon.toString())
        formData.append('location_accuracy', location.accuracy.toString())
        console.log('Uploading with GPS:', location)
      } else {
        console.log('Uploading without GPS')
      }

      const response = await axios.post('http://localhost:8000/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      sessionStorage.setItem(
        `analysis_${response.data.analysis_id}`,
        JSON.stringify(response.data)
      )

      router.push(`/results/${response.data.analysis_id}`)
    } catch (err: any) {
      console.error('Upload error:', err)

      // If upload fails, save offline as fallback
      const blob = new Blob([await file.arrayBuffer()], { type: file.type })

      await saveOfflineAnalysis({
        image: blob,
        imageFileName: file.name,
        latitude: location?.lat || null,
        longitude: location?.lon || null,
        locationAccuracy: location?.accuracy || null,
      })

      setError('Upload failed. Saved offline for later sync.')

      const count = await getPendingCount()
      setPendingCount(count)

      setLoading(false)
    }
  }

  const locationPillText = location ? 'Location detected' : locationStatus
  const isReady = !!file && !loading

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>InsightHub</h1>
          <p style={styles.subtitle}>
            Geo-tagged Field Inspection Platform
            {!isOnline && ' • Offline Mode'}
          </p>

          {/* Status bar with online/offline and pending count */}
          <div style={styles.statusBar}>
            <div style={styles.statusText}>
              <div style={{
                ...styles.statusDot,
                ...(isOnline ? styles.statusOnline : styles.statusOffline),
              }} />
              <span>{isOnline ? 'Online' : 'Offline'}</span>
            </div>

            {pendingCount > 0 && (
              <div style={styles.pendingBadge}>
                📦 {pendingCount} pending sync
              </div>
            )}
          </div>

          <div style={{ marginTop: 14, display: 'flex', justifyContent: 'center' }}>
            <div style={styles.pill}>
              <span>📍</span>
              <span>{locationPillText}</span>
            </div>
          </div>

          {location && (
            <div style={{ textAlign: 'center' }}>
              <div style={styles.pillSub}>
                {location.lat.toFixed(4)}°, {location.lon.toFixed(4)}° • ±
                {location.accuracy.toFixed(0)}m
              </div>
            </div>
          )}
        </div>

        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Upload an image</h2>

          <form onSubmit={handleSubmit}>
            <label style={styles.label}>Select Image</label>

            <div style={styles.inputWrap}>
              <div style={styles.fileRow}>
                <label style={styles.fileBtn}>
                  <span>📷</span>
                  <span>{file ? 'Change image' : 'Choose an image'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    style={styles.hiddenFile}
                  />
                </label>

                <div style={styles.fileHelp}>
                  {file ? file.name : '.png, .jpg, .jpeg, .webp or .gif'}
                </div>
              </div>
            </div>

            {preview && (
              <div style={{ marginTop: 14 }}>
                <div style={styles.previewCard}>
                  <img src={preview} alt="Preview" style={styles.previewImg} />
                </div>
              </div>
            )}

            {error && <div style={{ marginTop: 14, ...styles.error }}>{error}</div>}

            <button
              type="submit"
              disabled={!file || loading}
              style={{
                ...styles.button,
                ...(isReady ? {} : styles.buttonDisabled),
                marginTop: 16,
              }}
            >
              {loading 
                ? (isOnline ? 'Analyzing...' : 'Saving offline...') 
                : (isOnline ? 'Analyze Image' : 'Save Offline')}
            </button>

            {/* Offline notice */}
            {!isOnline && (
              <div style={styles.offlineNotice}>
                <p style={styles.offlineNoticeText}>
                  <strong>💡 Offline Mode:</strong> Your images will be saved locally
                  and automatically uploaded when you reconnect.
                </p>
              </div>
            )}

            <div style={styles.hint}>
              Tip: for best detections, use a clear photo with the subject centered
            </div>
          </form>
        </div>
      </div>
    </main>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'

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
          accuracy: position.coords.accuracy
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
        }
      },
      {
        enableHighAccuracy: true,  // Use GPS (not WiFi)
        timeout: 10000,            // Wait max 10 seconds
        maximumAge: 0              // Don't use cached location
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

      const response = await axios.post(
        'http://localhost:8000/analyze',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      )

      sessionStorage.setItem(
        `analysis_${response.data.analysis_id}`,
        JSON.stringify(response.data)
      )

      router.push(`/results/${response.data.analysis_id}`)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Upload failed')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            InsightHub
          </h1>
          <p className="text-gray-600">
            Geo-tagged Field Inspection Platform
          </p>
          
          {/* Location status indicator */}
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm font-medium text-blue-900">
              {locationStatus}
            </p>
            {location && (
              <p className="text-xs text-blue-700 mt-1">
                📍 {location.lat.toFixed(4)}°N, {location.lon.toFixed(4)}°E
                <span className="ml-2">±{location.accuracy.toFixed(0)}m</span>
              </p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Image
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-lg file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100
                  cursor-pointer"
              />
            </div>

            {preview && (
              <div className="border-2 border-gray-200 rounded-lg p-4">
                <img
                  src={preview}
                  alt="Preview"
                  className="max-w-full h-auto rounded"
                />
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!file || loading}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg
                hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed
                font-semibold transition-colors"
            >
              {loading ? 'Analyzing...' : 'Analyze Image'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
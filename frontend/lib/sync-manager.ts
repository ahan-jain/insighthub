import { getPendingAnalyses, deleteOfflineAnalysis, incrementRetryCount } from './offline-db'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

async function uploadPendingAnalysis(entry: any): Promise<boolean> {
  try {
    const formData = new FormData()
    formData.append('file', entry.image, entry.imageFileName)
    
    if (entry.latitude !== null) {
      formData.append('latitude', entry.latitude.toString())
    }
    if (entry.longitude !== null) {
      formData.append('longitude', entry.longitude.toString())
    }
    if (entry.locationAccuracy !== null) {
      formData.append('location_accuracy', entry.locationAccuracy.toString())
    }

    const response = await fetch(`${API_BASE_URL}/analyze`, {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`)
    }

    const result = await response.json()
    console.log(`Successfully synced analysis ${entry.id}:`, result.analysis_id)
    
    return true
  } catch (error) {
    console.error(`Failed to sync analysis ${entry.id}:`, error)
    return false
  }
}

export async function syncPendingAnalyses(): Promise<{
  synced: number
  failed: number
  total: number
}> {
  const pending = await getPendingAnalyses()
  let synced = 0
  let failed = 0

  console.log(`Starting sync of ${pending.length} pending analyses...`)

  for (const entry of pending) {
    const success = await uploadPendingAnalysis(entry)

    if (success) {
      await deleteOfflineAnalysis(entry.id!)
      synced++
    } else {
      await incrementRetryCount(entry.id!)
      failed++
    }
  }

  console.log(`Sync complete: ${synced} synced, ${failed} failed`)

  return {
    synced,
    failed,
    total: pending.length
  }
}

export async function checkAndSync() {
  if (!navigator.onLine) {
    console.log('Device is offline, skipping sync')
    return
  }

  console.log('Device is online, starting sync...')
  await syncPendingAnalyses()
}

export function startPeriodicSync() {
  const interval = setInterval(checkAndSync, 5 * 60 * 1000) 
  
  checkAndSync()

  return () => clearInterval(interval)
}
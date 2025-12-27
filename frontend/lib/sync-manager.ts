import { openDB } from './offline-db'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export async function syncPendingAnalyses() {
  const db = await openDB()
  const pending = await db.getAll('pending-analyses')
  
  console.log(`Syncing ${pending.length} pending analyses...`)
  
  for (const item of pending) {
    try {
      const formData = new FormData()
      formData.append('file', item.image, item.imageFileName)
      
      if (item.latitude) formData.append('latitude', item.latitude.toString())
      if (item.longitude) formData.append('longitude', item.longitude.toString())
      if (item.locationAccuracy) formData.append('location_accuracy', item.locationAccuracy.toString())
      
      const response = await fetch(`${API_BASE_URL}/analyze`, {
        method: 'POST',
        body: formData
      })
      
      if (response.ok) {
        await db.delete('pending-analyses', item.id)
        console.log(`Synced and deleted: ${item.imageFileName}`)
      }
    } catch (error) {
      console.log(`Sync failed for ${item.imageFileName}, will retry later`)
    }
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
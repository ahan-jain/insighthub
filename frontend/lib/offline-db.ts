import { openDB, DBSchema, IDBPDatabase } from 'idb'

interface OfflineDB extends DBSchema {
  'pending-analyses': {
    key: number
    value: {
      id: number
      image: Blob
      imageFileName: string
      latitude: number | null
      longitude: number | null
      locationAccuracy: number | null
      timestamp: string
      retryCount: number
    }
  }
}

const DB_NAME = 'insighthub-offline'
const DB_VERSION = 1
const STORE_NAME = 'pending-analyses'

let dbInstance: IDBPDatabase<OfflineDB> | null = null

async function getDB(): Promise<IDBPDatabase<OfflineDB>> {
  if (dbInstance) return dbInstance

  dbInstance = await openDB<OfflineDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { 
          keyPath: 'id', 
          autoIncrement: true 
        })
      }
    }
  })

  return dbInstance
}

export async function saveOfflineAnalysis(data: {
  image: Blob
  imageFileName: string
  latitude: number | null
  longitude: number | null
  locationAccuracy: number | null
}) {
  const db = await getDB()
  
  const entry = {
    ...data,
    timestamp: new Date().toISOString(),
    retryCount: 0
  }

  const id = await db.add(STORE_NAME, entry as any)
  console.log(`Saved offline analysis with ID: ${id}`)
  
  return id
}

export async function getPendingAnalyses() {
  const db = await getDB()
  return await db.getAll(STORE_NAME)
}


export async function deleteOfflineAnalysis(id: number) {
  const db = await getDB()
  await db.delete(STORE_NAME, id)
  console.log(`Deleted offline analysis: ${id}`)
}

export async function incrementRetryCount(id: number) {
  const db = await getDB()
  const entry = await db.get(STORE_NAME, id)
  
  if (entry) {
    entry.retryCount += 1
    await db.put(STORE_NAME, entry)
  }
}

export async function getPendingCount(): Promise<number> {
  const db = await getDB()
  return await db.count(STORE_NAME)
}

export async function clearAllPending() {
  const db = await getDB()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  await tx.store.clear()
  await tx.done
}
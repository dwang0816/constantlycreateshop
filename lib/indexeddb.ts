const DB_NAME = 'CartFilesDB'
const STORE_NAME = 'cartFiles'
const TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

function openCartDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = e => {
      ;(e.target as IDBOpenDBRequest).result.createObjectStore(STORE_NAME, {
        keyPath: 'cartItemId',
      })
    }
    req.onsuccess = e => resolve((e.target as IDBOpenDBRequest).result)
    req.onerror = () => reject(req.error)
  })
}

export async function saveFileToIndexedDB(
  file: File,
  cartItemId: string
): Promise<void> {
  const db = await openCartDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put({
      cartItemId,
      file,
      expiresAt: Date.now() + TTL_MS,
    })
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getFileFromIndexedDB(
  cartItemId: string
): Promise<File | null> {
  const db = await openCartDB()
  return new Promise(resolve => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).get(cartItemId)
    req.onsuccess = e => {
      const record = (e.target as IDBRequest).result
      if (!record || record.expiresAt < Date.now()) return resolve(null)
      resolve(record.file as File)
    }
    req.onerror = () => resolve(null)
  })
}

export async function deleteFileFromIndexedDB(cartItemId: string): Promise<void> {
  const db = await openCartDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(cartItemId)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function clearCartFilesFromIndexedDB(): Promise<void> {
  const db = await openCartDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).clear()
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

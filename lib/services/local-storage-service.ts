import fs from "fs"
import path from "path"

const bolCache = new Map<string, any>()
const localBolsFile = path.join(process.cwd(), ".local-bols.json")
let isInitialized = false

async function loadLocalBols(): Promise<void> {
  if (isInitialized) return
  isInitialized = true

  try {
    if (fs.existsSync(localBolsFile)) {
      const fileContents = await fs.promises.readFile(localBolsFile, "utf-8")
      const parsed = JSON.parse(fileContents)
      if (Array.isArray(parsed)) {
        parsed.forEach((bol) => {
          if (bol && bol.id) {
            bolCache.set(bol.id, bol)
          }
        })
      }
      console.log(`[v0] Loaded ${bolCache.size} local BOL(s) from disk`)
    }
  } catch (error) {
    console.error("[v0] Failed to load local BOLs from disk:", error)
  }
}

async function persistLocalBols(): Promise<void> {
  try {
    const data = Array.from(bolCache.values())
    await fs.promises.writeFile(localBolsFile, JSON.stringify(data, null, 2), "utf-8")
    console.log(`[v0] Persisted ${data.length} local BOL(s) to disk`)
  } catch (error) {
    console.error("[v0] Failed to persist local BOLs to disk:", error)
  }
}

/**
 * Store BOL locally when Supabase is unavailable
 */
export async function storeLocalBOL(bolNumber: string, data: any): Promise<void> {
  await loadLocalBols()
  bolCache.set(bolNumber, {
    ...data,
    id: bolNumber,
    created_at: new Date().toISOString(),
  })
  await persistLocalBols()
  console.log(`[v0] Stored BOL locally: ${bolNumber}`)
}

/**
 * Retrieve locally stored BOL
 */
export async function getLocalBOL(bolNumber: string): Promise<any | null> {
  await loadLocalBols()
  const bol = bolCache.get(bolNumber)
  if (bol) {
    console.log(`[v0] Retrieved local BOL: ${bolNumber}`)
  }
  return bol || null
}

/**
 * Get all locally stored BOLs
 */
export async function getAllLocalBOLs(): Promise<any[]> {
  await loadLocalBols()
  const bols = Array.from(bolCache.values())
  console.log(`[v0] Retrieved ${bols.length} local BOLs`)
  return bols
}

/**
 * Update locally stored BOL
 */
export async function updateLocalBOL(bolNumber: string, data: any): Promise<void> {
  await loadLocalBols()
  const existing = bolCache.get(bolNumber)
  if (existing) {
    bolCache.set(bolNumber, {
      ...existing,
      ...data,
      updated_at: new Date().toISOString(),
    })
    await persistLocalBols()
    console.log(`[v0] Updated local BOL: ${bolNumber}`)
  }
}

/**
 * Delete locally stored BOL
 */
export async function deleteLocalBOL(bolNumber: string): Promise<void> {
  await loadLocalBols()
  bolCache.delete(bolNumber)
  await persistLocalBols()
  console.log(`[v0] Deleted local BOL: ${bolNumber}`)
}

/**
 * Clear all local BOLs
 */
export async function clearLocalBOLs(): Promise<void> {
  bolCache.clear()
  await persistLocalBols()
  console.log(`[v0] Cleared all local BOLs`)
}

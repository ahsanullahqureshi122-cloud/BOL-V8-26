import fs from "fs"
import path from "path"
import { put, list } from "@vercel/blob"

export async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  const fileName = path.basename(filePath)
  const blobName = `databases/${fileName.replace(/^\.+/, '')}`

  if (token) {
    try {
      const blobs = await list({ prefix: blobName, token })
      const file = blobs.blobs.find(b => b.pathname === blobName)
      if (file) {
        const response = await fetch(file.url, { cache: "no-store" })
        if (response.ok) {
          return await response.json() as T
        }
      }
    } catch (error) {
      console.error(`[blob-db] Failed to read ${fileName} from Vercel Blob:`, error)
      // fallback to local fs if blob fails
    }
  }

  try {
    if (!fs.existsSync(filePath)) return fallback
    return JSON.parse(await fs.promises.readFile(filePath, "utf-8")) as T
  } catch (error) {
    console.error(`[blob-db] Failed to read ${fileName} from local database:`, error)
    return fallback
  }
}

export async function writeJsonFile<T>(filePath: string, value: T): Promise<void> {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  const fileName = path.basename(filePath)
  const blobName = `databases/${fileName.replace(/^\.+/, '')}`
  const jsonStr = JSON.stringify(value, null, 2)

  // Always write locally so `npm run dev` works locally and tests pass
  try {
    await fs.promises.writeFile(filePath, jsonStr, "utf-8")
  } catch (error) {
    console.error(`[blob-db] Failed to write ${fileName} to local database:`, error)
  }

  if (token) {
    try {
      await put(blobName, jsonStr, {
        access: "public",
        addRandomSuffix: false, // ensures it overwrites the same file
        token,
        contentType: "application/json"
      })
    } catch (error) {
      console.error(`[blob-db] Failed to write ${fileName} to Vercel Blob:`, error)
    }
  }
}

import fs from "fs"
import path from "path"

export type BolAccountLedgerDatabase = {
  customCompanies: string[]
  ledgerRecords: Record<string, any[]>
  updated_at?: string
}

const bolAccountLedgerFile = path.join(process.cwd(), ".local-bol-account-ledgers.json")

const emptyDatabase: BolAccountLedgerDatabase = {
  customCompanies: [],
  ledgerRecords: {},
}

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    if (!fs.existsSync(filePath)) return fallback
    return JSON.parse(await fs.promises.readFile(filePath, "utf-8")) as T
  } catch (error) {
    console.error("[bol-account-ledgers] Failed to read local database:", error)
    return fallback
  }
}

async function writeJsonFile<T>(filePath: string, value: T) {
  await fs.promises.writeFile(filePath, JSON.stringify(value, null, 2), "utf-8")
}

export async function getBolAccountLedgerDatabase() {
  const database = await readJsonFile<BolAccountLedgerDatabase>(bolAccountLedgerFile, emptyDatabase)

  return {
    customCompanies: Array.isArray(database.customCompanies) ? database.customCompanies : [],
    ledgerRecords: database.ledgerRecords && typeof database.ledgerRecords === "object" ? database.ledgerRecords : {},
    updated_at: database.updated_at || null,
  }
}

export async function saveBolAccountLedgerDatabase(data: Partial<BolAccountLedgerDatabase>) {
  const next: BolAccountLedgerDatabase = {
    customCompanies: Array.isArray(data.customCompanies) ? data.customCompanies : [],
    ledgerRecords: data.ledgerRecords && typeof data.ledgerRecords === "object" ? data.ledgerRecords : {},
    updated_at: new Date().toISOString(),
  }

  await writeJsonFile(bolAccountLedgerFile, next)
  return next
}

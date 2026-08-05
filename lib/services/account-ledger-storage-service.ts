import fs from "fs"
import path from "path"

export type AccountLedgerDatabase = {
  accounts: any[]
  ledgerEntries: Record<string, any[]>
  ledgerProfiles: Record<string, any>
  receipts: Record<string, any>
  updated_at?: string
}

const ledgerDatabaseFile = path.join(process.cwd(), ".local-account-ledgers.json")

const emptyDatabase: AccountLedgerDatabase = {
  accounts: [],
  ledgerEntries: {},
  ledgerProfiles: {},
  receipts: {},
}

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    if (!fs.existsSync(filePath)) return fallback
    return JSON.parse(await fs.promises.readFile(filePath, "utf-8")) as T
  } catch (error) {
    console.error("[account-ledgers] Failed to read local database:", error)
    return fallback
  }
}

async function writeJsonFile<T>(filePath: string, value: T) {
  await fs.promises.writeFile(filePath, JSON.stringify(value, null, 2), "utf-8")
}

export async function getAccountLedgerDatabase() {
  const database = await readJsonFile<AccountLedgerDatabase>(ledgerDatabaseFile, emptyDatabase)

  return {
    accounts: Array.isArray(database.accounts) ? database.accounts : [],
    ledgerEntries: database.ledgerEntries && typeof database.ledgerEntries === "object" ? database.ledgerEntries : {},
    ledgerProfiles: database.ledgerProfiles && typeof database.ledgerProfiles === "object" ? database.ledgerProfiles : {},
    receipts: database.receipts && typeof database.receipts === "object" ? database.receipts : {},
    updated_at: database.updated_at || null,
  }
}

export async function saveAccountLedgerDatabase(data: Partial<AccountLedgerDatabase>) {
  const next: AccountLedgerDatabase = {
    accounts: Array.isArray(data.accounts) ? data.accounts : [],
    ledgerEntries: data.ledgerEntries && typeof data.ledgerEntries === "object" ? data.ledgerEntries : {},
    ledgerProfiles: data.ledgerProfiles && typeof data.ledgerProfiles === "object" ? data.ledgerProfiles : {},
    receipts: data.receipts && typeof data.receipts === "object" ? data.receipts : {},
    updated_at: new Date().toISOString(),
  }

  await writeJsonFile(ledgerDatabaseFile, next)
  return next
}

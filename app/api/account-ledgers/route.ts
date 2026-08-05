import { NextResponse } from "next/server"
import { getAccountLedgerDatabase, saveAccountLedgerDatabase } from "@/lib/services/account-ledger-storage-service"
import { tryPythonBackend } from "@/lib/services/python-backend-proxy"

export async function GET() {
  try {
    const pythonData = await tryPythonBackend("/api/account-ledgers")
    if (pythonData) return NextResponse.json(pythonData)

    const data = await getAccountLedgerDatabase()
    return NextResponse.json({ success: true, data, source: "local-file" })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to load account ledger data" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const pythonData = await tryPythonBackend("/api/account-ledgers", {
      method: "POST",
      body: JSON.stringify(body),
    })
    if (pythonData) return NextResponse.json(pythonData)

    const data = await saveAccountLedgerDatabase({
      accounts: Array.isArray(body.accounts) ? body.accounts : [],
      ledgerEntries: body.ledgerEntries && typeof body.ledgerEntries === "object" ? body.ledgerEntries : {},
      ledgerProfiles: body.ledgerProfiles && typeof body.ledgerProfiles === "object" ? body.ledgerProfiles : {},
      receipts: body.receipts && typeof body.receipts === "object" ? body.receipts : {},
    })

    return NextResponse.json({ success: true, data, source: "local-file" })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to save account ledger data" },
      { status: 400 }
    )
  }
}

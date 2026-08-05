import { NextResponse } from "next/server"
import { getAllAccounts, saveAccounts } from "@/lib/services/invoice-storage-service"

export async function GET() {
  return NextResponse.json({ data: await getAllAccounts(), source: "local" })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const accounts = Array.isArray(body.accounts) ? body.accounts : []
    const saved = await saveAccounts(accounts)
    return NextResponse.json({ success: true, data: saved })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to save accounts" },
      { status: 400 }
    )
  }
}

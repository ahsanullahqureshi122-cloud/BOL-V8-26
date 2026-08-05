import { NextResponse } from "next/server"
import { deleteInvoice, getInvoice, saveInvoice } from "@/lib/services/invoice-storage-service"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const invoice = await getInvoice(id)

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
  }

  return NextResponse.json({ data: invoice })
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await request.json()
  const existing = await getInvoice(id)
  const invoice = await saveInvoice({ ...existing, ...body, id: existing?.id || id })

  return NextResponse.json({ success: true, data: invoice })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await deleteInvoice(id)
  return NextResponse.json({ success: true })
}

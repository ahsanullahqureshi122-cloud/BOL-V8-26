import { mkdir, unlink, writeFile } from "node:fs/promises"
import path from "node:path"
import { NextResponse } from "next/server"

export const runtime = "nodejs"

const uploadDir = path.join(process.cwd(), "uploads", "ledger-pdfs")

const cleanLedgerId = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, "")

const safeStoredPath = (value: FormDataEntryValue | null) => {
  if (typeof value !== "string") return null
  const fileName = path.basename(value)
  if (!/^ledger_[a-zA-Z0-9_-]+_\d+\.pdf$/.test(fileName)) return null
  return path.join(uploadDir, fileName)
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ledgerId = cleanLedgerId(id)

  if (!ledgerId) {
    return NextResponse.json({ error: "Invalid ledger row" }, { status: 400 })
  }

  const formData = await request.formData()
  const file = formData.get("pdf")

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose a PDF file first" }, { status: 400 })
  }

  if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
    return NextResponse.json({ error: "Only PDF files are allowed" }, { status: 400 })
  }

  const bytes = Buffer.from(await file.arrayBuffer())
  if (bytes.subarray(0, 4).toString("utf8") !== "%PDF") {
    return NextResponse.json({ error: "Only valid PDF files are allowed" }, { status: 400 })
  }

  await mkdir(uploadDir, { recursive: true })

  const oldFile = safeStoredPath(formData.get("oldPath"))
  if (oldFile) {
    await unlink(oldFile).catch(() => undefined)
  }

  const timestamp = Math.floor(Date.now() / 1000)
  const fileName = `ledger_${ledgerId}_${timestamp}.pdf`
  const absolutePath = path.join(uploadDir, fileName)

  await writeFile(absolutePath, bytes)

  return NextResponse.json({
    success: true,
    pdf_file: `uploads/ledger-pdfs/${fileName}`,
  })
}

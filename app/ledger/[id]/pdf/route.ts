import { readFile, stat, unlink } from "node:fs/promises"
import path from "node:path"
import { NextResponse } from "next/server"

export const runtime = "nodejs"

const uploadDir = path.join(process.cwd(), "uploads", "ledger-pdfs")

const cleanLedgerId = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, "")

const resolvePdfPath = (ledgerId: string, value: string | null) => {
  if (!value) return null

  const fileName = path.basename(value)
  if (!/^ledger_[a-zA-Z0-9_-]+_\d+\.pdf$/.test(fileName)) return null

  const absolutePath = path.join(uploadDir, fileName)
  const relativeUploadDir = path.relative(uploadDir, absolutePath)
  if (relativeUploadDir.startsWith("..") || path.isAbsolute(relativeUploadDir)) return null

  return absolutePath
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ledgerId = cleanLedgerId(id)
  const url = new URL(request.url)
  const pdfPath = resolvePdfPath(ledgerId, url.searchParams.get("path"))

  if (!ledgerId || !pdfPath) {
    return NextResponse.json({ error: "PDF not found" }, { status: 404 })
  }

  try {
    const fileStats = await stat(pdfPath)
    const range = request.headers.get("range")

    if (range) {
      const match = range.match(/bytes=(\d*)-(\d*)/)
      const start = match?.[1] ? Number(match[1]) : 0
      const end = match?.[2] ? Number(match[2]) : fileStats.size - 1

      if (
        !Number.isFinite(start) ||
        !Number.isFinite(end) ||
        start < 0 ||
        end < start ||
        start >= fileStats.size
      ) {
        return new NextResponse(null, {
          status: 416,
          headers: {
            "Content-Range": `bytes */${fileStats.size}`,
          },
        })
      }

      const file = await readFile(pdfPath)
      const chunk = file.subarray(start, Math.min(end, fileStats.size - 1) + 1)

      return new NextResponse(chunk, {
        status: 206,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="${path.basename(pdfPath)}"`,
          "Content-Length": String(chunk.byteLength),
          "Content-Range": `bytes ${start}-${start + chunk.byteLength - 1}/${fileStats.size}`,
          "Cache-Control": "no-store",
          "Accept-Ranges": "bytes",
          "X-Content-Type-Options": "nosniff",
        },
      })
    }

    const file = await readFile(pdfPath)
    return new NextResponse(file, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${path.basename(pdfPath)}"`,
        "Content-Length": String(file.byteLength),
        "Cache-Control": "no-store",
        "Accept-Ranges": "bytes",
        "X-Content-Type-Options": "nosniff",
      },
    })
  } catch {
    return NextResponse.json({ error: "PDF not found" }, { status: 404 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ledgerId = cleanLedgerId(id)
  const body = await request.json().catch(() => ({}))
  const pdfPath = resolvePdfPath(ledgerId, typeof body.path === "string" ? body.path : null)

  if (!ledgerId || !pdfPath) {
    return NextResponse.json({ error: "PDF not found" }, { status: 404 })
  }

  await unlink(pdfPath).catch(() => undefined)

  return NextResponse.json({ success: true })
}

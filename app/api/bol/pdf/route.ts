import { NextRequest, NextResponse } from "next/server"
import { put, list, del } from "@vercel/blob"
import { createClient } from "@/lib/supabase/server"
import * as localStorage from "@/lib/services/local-storage-service"
import fs from "fs"
import path from "path"

const LOCAL_PDF_UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "bol-pdfs")
const LOCAL_PDF_PUBLIC_PREFIX = "/uploads/bol-pdfs"

function getBlobToken() {
  return process.env.BLOB_READ_WRITE_TOKEN?.trim()
}

function sanitizePathPart(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "BOL"
}

async function storePDFLocally(pdfFile: File, bolNumber: string, fileName: string) {
  await fs.promises.mkdir(LOCAL_PDF_UPLOAD_DIR, { recursive: true })
  const safeBolNumber = sanitizePathPart(bolNumber)
  const safeFileName = sanitizePathPart(fileName)
  const localFileName = `${safeBolNumber}-${safeFileName}`
  const localPath = path.join(LOCAL_PDF_UPLOAD_DIR, localFileName)
  const bytes = Buffer.from(await pdfFile.arrayBuffer())
  await fs.promises.writeFile(localPath, bytes)
  return `${LOCAL_PDF_PUBLIC_PREFIX}/${localFileName}`
}

async function removeLocalPDF(pdfUrl: string) {
  if (!pdfUrl.startsWith(LOCAL_PDF_PUBLIC_PREFIX)) return false
  const relativeFileName = decodeURIComponent(pdfUrl.slice(LOCAL_PDF_PUBLIC_PREFIX.length + 1))
  const localPath = path.resolve(LOCAL_PDF_UPLOAD_DIR, relativeFileName)
  const uploadRoot = path.resolve(LOCAL_PDF_UPLOAD_DIR)

  if (!localPath.startsWith(uploadRoot)) return false
  await fs.promises.rm(localPath, { force: true })
  return true
}

// POST: Store a PDF document
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const pdfFile = formData.get("pdf") as File
    const bolId = formData.get("bolId") as string
    const bolNumber = formData.get("bolNumber") as string

    if (!pdfFile || !bolId || !bolNumber) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: pdf, bolId, or bolNumber",
        },
        { status: 400 }
      )
    }

    if (!pdfFile.type.includes("pdf")) {
      return NextResponse.json(
        {
          success: false,
          error: "File must be a PDF",
        },
        { status: 400 }
      )
    }

    // Generate unique path for PDF storage
    const timestamp = Date.now()
    const fileName = `${bolNumber}-${timestamp}.pdf`
    const blobPath = `bol-documents/${bolNumber}/${fileName}`

    let pdfUrl: string
    let storageTarget: "vercel-blob" | "local" = "vercel-blob"

    const blobToken = getBlobToken()

    if (blobToken) {
      const blob = await put(blobPath, pdfFile, {
        access: "private",
        addRandomSuffix: false,
        token: blobToken,
      })
      pdfUrl = blob.url
    } else {
      storageTarget = "local"
      pdfUrl = await storePDFLocally(pdfFile, bolNumber, fileName)
    }

    // Update the BOL record in database with PDF URL
    let updated = null
    let updateError = null
    try {
      const supabase = await createClient()
      const result = await supabase
        .from("bill_of_lading")
        .update({
          pdf_url: pdfUrl,
          pdf_uploaded_at: new Date().toISOString(),
        })
        .eq("id", bolId)
        .select()
        .single()

      updated = result.data
      updateError = result.error
    } catch (supabaseErr) {
      updateError = supabaseErr instanceof Error ? supabaseErr.message : String(supabaseErr)
      console.error("Supabase error updating BOL with PDF URL:", updateError)
    }

    if (updateError || !updated) {
      console.error("Error updating BOL with PDF URL, falling back to local storage:", updateError)
      try {
        await localStorage.updateLocalBOL(bolId, {
          pdf_url: pdfUrl,
          pdf_uploaded_at: new Date().toISOString(),
        })
      } catch (localError) {
        console.error("Failed to update local BOL with PDF metadata:", localError)
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        id: updated?.id ?? bolId,
        bolNumber: updated?.bol_number ?? bolNumber,
        pdfUrl,
        uploadedAt: updated?.pdf_uploaded_at ?? new Date().toISOString(),
        storage: storageTarget,
      },
    })
  } catch (error) {
    console.error("Error storing PDF:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to store PDF",
      },
      { status: 500 }
    )
  }
}

// GET: List all PDF documents
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get("action")
    const bolId = searchParams.get("bolId")

    if (action === "list") {
      const blobToken = getBlobToken()

      if (!blobToken) {
        let localFiles: string[] = []
        try {
          localFiles = await fs.promises.readdir(LOCAL_PDF_UPLOAD_DIR)
        } catch {
          localFiles = []
        }

        return NextResponse.json({
          success: true,
          data: localFiles.map((fileName) => ({
            pathname: `${LOCAL_PDF_PUBLIC_PREFIX}/${fileName}`,
            url: `${LOCAL_PDF_PUBLIC_PREFIX}/${fileName}`,
          })),
        })
      }

      const blobs = await list({
        prefix: "bol-documents/",
        token: blobToken,
      })

      return NextResponse.json({
        success: true,
        data: blobs.blobs,
      })
    }

    if (action === "download" && bolId) {
      // Get specific BOL's PDF URL from database
      const supabase = await createClient()
      const { data, error } = await supabase
        .from("bill_of_lading")
        .select("id, bol_number, pdf_url")
        .eq("id", bolId)
        .single()

      if (error || !data?.pdf_url) {
        const localBol = await localStorage.getLocalBOL(bolId)
        if (localBol?.pdf_url) {
          return NextResponse.json({
            success: true,
            data: {
              bolNumber: localBol.bol_number || localBol.id || bolId,
              pdfUrl: localBol.pdf_url,
            },
          })
        }
      }

      if (error || !data) {
        return NextResponse.json(
          {
            success: false,
            error: "PDF not found for this document",
          },
          { status: 404 }
        )
      }

      return NextResponse.json({
        success: true,
        data: {
          bolNumber: data.bol_number,
          pdfUrl: data.pdf_url,
        },
      })
    }

    return NextResponse.json({
      success: false,
      error: "Invalid action parameter",
    })
  } catch (error) {
    console.error("Error fetching PDFs:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch PDFs",
      },
      { status: 500 }
    )
  }
}

// DELETE: Remove a PDF document
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const bolId = searchParams.get("bolId")

    if (!bolId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing bolId parameter",
        },
        { status: 400 }
      )
    }

    // Get the PDF URL from database
    const supabase = await createClient()
    const { data, error: fetchError } = await supabase
      .from("bill_of_lading")
      .select("pdf_url")
      .eq("id", bolId)
      .single()

    let pdfUrl = data?.pdf_url
    if (fetchError || !pdfUrl) {
      const localBol = await localStorage.getLocalBOL(bolId)
      pdfUrl = localBol?.pdf_url || null
    }

    if (!pdfUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "PDF not found for this document",
        },
        { status: 404 }
      )
    }

    const deletedLocal = await removeLocalPDF(pdfUrl)
    if (!deletedLocal) {
      const blobToken = getBlobToken()
      if (!blobToken) {
        return NextResponse.json(
          {
            success: false,
            error: "Cannot delete a Vercel Blob PDF because BLOB_READ_WRITE_TOKEN is not configured.",
          },
          { status: 500 }
        )
      }

      await del(pdfUrl, { token: blobToken })
    }

    // Clear the PDF URL from database
    const { error: updateError } = await supabase
      .from("bill_of_lading")
      .update({
        pdf_url: null,
        pdf_uploaded_at: null,
      })
      .eq("id", bolId)

    if (updateError) {
      console.error("Error clearing PDF URL from Supabase:", updateError)
    }

    if (!fetchError && pdfUrl && !data?.pdf_url) {
      // If Supabase row had no pdf_url but local storage did, clear local metadata.
      try {
        await localStorage.updateLocalBOL(bolId, {
          pdf_url: null,
          pdf_uploaded_at: null,
        })
      } catch (localUpdateError) {
        console.error("Failed to clear local PDF metadata:", localUpdateError)
      }
    }

    if (fetchError) {
      try {
        await localStorage.updateLocalBOL(bolId, {
          pdf_url: null,
          pdf_uploaded_at: null,
        })
      } catch (localUpdateError) {
        console.error("Failed to clear local PDF metadata after Supabase fetch error:", localUpdateError)
      }
    }

    if (updateError) {
      console.error("Error updating BOL:", updateError)
    }

    return NextResponse.json({
      success: true,
      message: "PDF deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting PDF:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete PDF",
      },
      { status: 500 }
    )
  }
}

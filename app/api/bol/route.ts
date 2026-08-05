import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import * as localStorage from "@/lib/services/local-storage-service"
import * as fs from "fs"
import * as path from "path"
import { tryPythonBackend } from "@/lib/services/python-backend-proxy"

// In-memory counter for BOL number sequence
let bolSequenceCounter: number | null = null

// Helper to get the counter value (persisted in a file)
function getSequenceCounter(): number {
  if (bolSequenceCounter !== null) {
    return bolSequenceCounter
  }
  
  // Try to read from a file to persist across server restarts
  try {
    const counterFile = path.join(process.cwd(), ".bol-counter")
    if (fs.existsSync(counterFile)) {
      const content = fs.readFileSync(counterFile, "utf-8")
      bolSequenceCounter = parseInt(content.trim(), 10) || 1
    } else {
      bolSequenceCounter = 1
    }
  } catch (e) {
    bolSequenceCounter = 1
  }
  
  return bolSequenceCounter
}

// Helper to persist the counter value
function saveSequenceCounter(value: number) {
  bolSequenceCounter = value
  try {
    const counterFile = path.join(process.cwd(), ".bol-counter")
    fs.writeFileSync(counterFile, String(value), "utf-8")
  } catch (e) {
    console.error("[v0] Error saving BOL counter:", e)
  }
}

// Helper function to generate BOL number in format: BOL-2026-NSA001
function generateBOLNumber(): string {
  const currentYear = new Date().getFullYear()
  const counter = getSequenceCounter()
  const sequenceNumber = String(counter).padStart(3, "0")
  saveSequenceCounter(counter + 1)
  return `BOL-${currentYear}-NSA${sequenceNumber}`
}

// GET: Fetch all BOLs or get next BOL number
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get("action")
  
  if (action === "next-number") {
    const pythonNumber = await tryPythonBackend("/api/bol/tools/next-number")
    if (pythonNumber) return NextResponse.json({ bolNumber: pythonNumber.bolNumber, source: "python-fastapi" })

    // Generate the next BOL number locally
    const bolNumber = generateBOLNumber()
    return NextResponse.json({ bolNumber })
  }
  
  // Default: List all BOLs - try Supabase first, fallback to local storage
  try {
    const pythonBols = await tryPythonBackend("/api/bol")
    if (pythonBols) return NextResponse.json(pythonBols)

    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from("bill_of_lading")
      .select("*")
      .order("created_at", { ascending: false })
    
    const localBols = await localStorage.getAllLocalBOLs()

    if (error) {
      console.error("[v0] Supabase error, using local BOLs:", error.message)
      return NextResponse.json({ data: localBols, source: "local" })
    }

    const mergedByNumber = new Map<string, any>()
    for (const bol of localBols) {
      const key = bol.bol_number || bol.id
      if (key) mergedByNumber.set(key, bol)
    }
    for (const bol of data || []) {
      const key = bol.bol_number || bol.id
      if (key) mergedByNumber.set(key, bol)
    }

    return NextResponse.json({ data: Array.from(mergedByNumber.values()), source: localBols.length ? "merged" : "supabase" })
  } catch (err) {
    console.error("[v0] Error fetching BOLs:", err instanceof Error ? err.message : String(err))
    // Fallback to local storage on any error
    const localBols = await localStorage.getAllLocalBOLs()
    return NextResponse.json({ 
      data: localBols, 
      source: "local",
      notice: "Using locally cached BOLs"
    })
  }
}

// POST: Create a new BOL
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const pythonBol = await tryPythonBackend("/api/bol", {
      method: "POST",
      body: JSON.stringify(body),
    })
    if (pythonBol) return NextResponse.json(pythonBol)
    
    // Use the BOL number from the body if provided, otherwise generate a new one
    const bolNumber = body.bol_number || generateBOLNumber()
    
    console.log("[v0] Creating BOL with number:", bolNumber)
    
    const bolData = {
      bol_number: bolNumber,
      issue_date: body.issue_date || new Date().toISOString().split("T")[0],
      ...body,
    }
    
    // Try to save to Supabase first
    let savedData = null
    let savedToSupabase = false
    
    try {
      const supabase = await createClient()
      
      const { data, error } = await supabase
        .from("bill_of_lading")
        .insert(bolData)
        .select()
        .single()
      
      if (error) {
        console.error("[v0] Supabase error, saving locally:", error.message)
      } else if (data) {
        savedData = data
        savedToSupabase = true
        console.log("[v0] BOL saved to Supabase:", data.id)
      }
    } catch (supabaseErr) {
      console.error("[v0] Supabase connection failed, saving locally:", 
        supabaseErr instanceof Error ? supabaseErr.message : String(supabaseErr))
    }
    
    // If Supabase failed, save locally
    if (!savedToSupabase) {
      await localStorage.storeLocalBOL(bolNumber, bolData)
      savedData = {
        id: bolNumber,
        ...bolData,
        created_at: new Date().toISOString(),
      }
    }
    
    return NextResponse.json({ 
      success: true,
      data: savedData,
      saved_to: savedToSupabase ? "supabase" : "local",
      notice: savedToSupabase ? undefined : "Document saved locally. It will sync when Supabase is available."
    })
  } catch (err) {
    console.error("[v0] Error in BOL creation:", err instanceof Error ? err.message : String(err))
    return NextResponse.json({ 
      success: false,
      error: err instanceof Error ? err.message : "Failed to create BOL" 
    }, { status: 400 })
  }
}

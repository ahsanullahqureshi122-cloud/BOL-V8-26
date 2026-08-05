import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import * as localStorage from "@/lib/services/local-storage-service"

// GET: Fetch a single BOL by ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from("bill_of_lading")
      .select("*")
      .eq("id", id)
      .single()
    
    if (error) {
      console.error("[v0] Error fetching BOL from Supabase:", error.message)
      // Try local storage
      const localBol = await localStorage.getLocalBOL(id)
      if (localBol) {
        return NextResponse.json({ data: localBol, source: "local" })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ data, source: "supabase" })
  } catch (err) {
    console.error("[v0] Unexpected error fetching BOL:", err)
    // Try local storage as fallback
    const localBol = await localStorage.getLocalBOL(id)
    if (localBol) {
      return NextResponse.json({ data: localBol, source: "local" })
    }
    return NextResponse.json({ error: "Failed to fetch BOL" }, { status: 500 })
  }
}

// PUT: Update a BOL
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  try {
    const body = await request.json()
    
    let savedData = null
    let savedToSupabase = false
    
    try {
      const supabase = await createClient()
      
      const { data, error } = await supabase
        .from("bill_of_lading")
        .update({
          ...body,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single()
      
      if (error) {
        console.error("[v0] Error updating BOL in Supabase:", error.message)
      } else if (data) {
        savedData = data
        savedToSupabase = true
        console.log("[v0] BOL updated in Supabase:", id)
      }
    } catch (supabaseErr) {
      console.error("[v0] Supabase connection failed, updating locally:", 
        supabaseErr instanceof Error ? supabaseErr.message : String(supabaseErr))
    }
    
    // If Supabase failed, update locally
    if (!savedToSupabase) {
      await localStorage.updateLocalBOL(id, body)
      savedData = {
        id,
        ...body,
        updated_at: new Date().toISOString(),
      }
    }
    
    return NextResponse.json({ 
      success: true,
      data: savedData,
      saved_to: savedToSupabase ? "supabase" : "local"
    })
  } catch (err) {
    console.error("[v0] Error in BOL update:", err)
    return NextResponse.json({ 
      error: err instanceof Error ? err.message : "Failed to update BOL" 
    }, { status: 400 })
  }
}

// DELETE: Delete a BOL
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  try {
    let deletedFromSupabase = false
    
    try {
      const supabase = await createClient()
      
      const { error } = await supabase
        .from("bill_of_lading")
        .delete()
        .eq("id", id)
      
      if (error) {
        console.error("[v0] Error deleting BOL from Supabase:", error.message)
      } else {
        deletedFromSupabase = true
        console.log("[v0] BOL deleted from Supabase:", id)
      }
    } catch (supabaseErr) {
      console.error("[v0] Supabase connection failed, deleting locally:", 
        supabaseErr instanceof Error ? supabaseErr.message : String(supabaseErr))
    }
    
    // Also delete from local storage
    await localStorage.deleteLocalBOL(id)
    
    return NextResponse.json({ 
      success: true,
      deleted_from: deletedFromSupabase ? "supabase" : "local"
    })
  } catch (err) {
    console.error("[v0] Error in BOL deletion:", err)
    return NextResponse.json({ 
      error: err instanceof Error ? err.message : "Failed to delete BOL" 
    }, { status: 500 })
  }
}

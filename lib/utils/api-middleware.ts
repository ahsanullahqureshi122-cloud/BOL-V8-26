import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Middleware to check authentication on API routes
 */
export async function withAuth(request: NextRequest, handler: (req: NextRequest, user: any) => Promise<NextResponse>) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    return handler(request, user)
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Parse request body safely
 */
export async function parseRequestBody(request: NextRequest) {
  try {
    const body = await request.json()
    return body
  } catch {
    throw new Error('Invalid request body')
  }
}

/**
 * Get query parameter from request
 */
export function getQueryParam(request: NextRequest, param: string): string | null {
  const { searchParams } = new URL(request.url)
  return searchParams.get(param)
}

/**
 * Get all query parameters from request
 */
export function getQueryParams(request: NextRequest): Record<string, string> {
  const { searchParams } = new URL(request.url)
  const params: Record<string, string> = {}
  
  searchParams.forEach((value, key) => {
    params[key] = value
  })
  
  return params
}

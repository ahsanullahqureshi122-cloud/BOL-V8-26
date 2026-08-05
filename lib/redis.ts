import { Redis } from '@upstash/redis'

let redis: Redis | null = null

function getRedis(): Redis {
  if (!redis) {
    if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
      throw new Error('Missing Upstash Redis environment variables: KV_REST_API_URL and KV_REST_API_TOKEN')
    }
    redis = new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    })
  }
  return redis
}

// Cache management functions
export async function cacheDocument(docId: string, data: any, expirationSeconds = 86400) {
  try {
    await getRedis().set(`bol:${docId}`, JSON.stringify(data), { ex: expirationSeconds })
    console.log(`[v0] Cached BOL document: ${docId}`)
  } catch (error) {
    console.error(`[v0] Error caching document ${docId}:`, error)
    throw error
  }
}

export async function getCachedDocument(docId: string) {
  try {
    const cached = await getRedis().get(`bol:${docId}`)
    if (cached) {
      console.log(`[v0] Retrieved cached BOL document: ${docId}`)
      return JSON.parse(cached as string)
    }
    return null
  } catch (error) {
    console.error(`[v0] Error retrieving cached document ${docId}:`, error)
    return null
  }
}

export async function invalidateDocumentCache(docId: string) {
  try {
    await getRedis().del(`bol:${docId}`)
    console.log(`[v0] Invalidated cache for BOL document: ${docId}`)
  } catch (error) {
    console.error(`[v0] Error invalidating cache for ${docId}:`, error)
    throw error
  }
}

// Session management
export async function setSession(sessionId: string, userData: any, expirationSeconds = 3600) {
  try {
    await getRedis().set(`session:${sessionId}`, JSON.stringify(userData), { ex: expirationSeconds })
    console.log(`[v0] Session created: ${sessionId}`)
  } catch (error) {
    console.error(`[v0] Error creating session:`, error)
    throw error
  }
}

export async function getSession(sessionId: string) {
  try {
    const session = await getRedis().get(`session:${sessionId}`)
    if (session) {
      console.log(`[v0] Session retrieved: ${sessionId}`)
      return JSON.parse(session as string)
    }
    return null
  } catch (error) {
    console.error(`[v0] Error retrieving session:`, error)
    return null
  }
}

export async function deleteSession(sessionId: string) {
  try {
    await getRedis().del(`session:${sessionId}`)
    console.log(`[v0] Session deleted: ${sessionId}`)
  } catch (error) {
    console.error(`[v0] Error deleting session:`, error)
    throw error
  }
}

// Rate limiting
export async function checkRateLimit(identifier: string, limit: number, windowSeconds: number) {
  try {
    const key = `ratelimit:${identifier}`
    const current = await getRedis().incr(key)
    
    if (current === 1) {
      await getRedis().expire(key, windowSeconds)
    }
    
    return current <= limit
  } catch (error) {
    console.error(`[v0] Error checking rate limit:`, error)
    return true // Allow on error
  }
}

// Export getRedis for direct usage if needed
export { getRedis }

/**
 * Simple cache system for APIs
 * Avoids repeated calls and improves performance
 */

interface CacheEntry {
  data: any
  timestamp: number
  expiresIn: number
}

class APICache {
  private cache: Map<string, CacheEntry> = new Map()

  /**
   * Fetches data from the cache or makes the request
   * @param url API URL
   * @param expiresIn Expiration time in milliseconds (default: 60 seconds)
   */
  async fetch(url: string, expiresIn: number = 60000): Promise<any> {
    const now = Date.now()
    const cached = this.cache.get(url)

    // If there is a valid cache entry, return it
    if (cached && (now - cached.timestamp) < cached.expiresIn) {
      console.log(`📦 Cache hit for ${url}`)
      return cached.data
    }

    // Otherwise, make the request
    console.log(`🌐 Fetching ${url}`)
    try {
      const response = await fetch(url)
      const data = await response.json()

      // Save to the cache
      this.cache.set(url, {
        data,
        timestamp: now,
        expiresIn,
      })

      return data
    } catch (error) {
      console.error(`❌ Error fetching ${url}:`, error)
      
      // If there is an expired cache entry, return it anyway
      if (cached) {
        console.log(`⚠️ Using stale cache for ${url}`)
        return cached.data
      }
      
      throw error
    }
  }

  /**
   * Clears the cache for a specific URL
   */
  invalidate(url: string) {
    this.cache.delete(url)
  }

  /**
   * Clears the entire cache
   */
  clear() {
    this.cache.clear()
  }

  /**
   * Removes expired entries from the cache
   */
  cleanup() {
    const now = Date.now()
    for (const [url, entry] of this.cache.entries()) {
      if ((now - entry.timestamp) >= entry.expiresIn) {
        this.cache.delete(url)
      }
    }
  }
}

// Singleton instance
export const apiCache = new APICache()

// Clear expired cache entries every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    apiCache.cleanup()
  }, 5 * 60 * 1000)
}

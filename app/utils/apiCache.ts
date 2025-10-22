/**
 * Sistema de cache simples para APIs
 * Evita chamadas repetidas e melhora performance
 */

interface CacheEntry {
  data: any
  timestamp: number
  expiresIn: number
}

class APICache {
  private cache: Map<string, CacheEntry> = new Map()

  /**
   * Busca dados do cache ou faz a requisição
   * @param url URL da API
   * @param expiresIn Tempo de expiração em milissegundos (padrão: 60 segundos)
   */
  async fetch(url: string, expiresIn: number = 60000): Promise<any> {
    const now = Date.now()
    const cached = this.cache.get(url)

    // Se existe cache válido, retornar
    if (cached && (now - cached.timestamp) < cached.expiresIn) {
      console.log(`📦 Cache hit for ${url}`)
      return cached.data
    }

    // Caso contrário, fazer a requisição
    console.log(`🌐 Fetching ${url}`)
    try {
      const response = await fetch(url)
      const data = await response.json()

      // Salvar no cache
      this.cache.set(url, {
        data,
        timestamp: now,
        expiresIn,
      })

      return data
    } catch (error) {
      console.error(`❌ Error fetching ${url}:`, error)
      
      // Se tiver cache expirado, retornar mesmo assim
      if (cached) {
        console.log(`⚠️ Using stale cache for ${url}`)
        return cached.data
      }
      
      throw error
    }
  }

  /**
   * Limpa o cache de uma URL específica
   */
  invalidate(url: string) {
    this.cache.delete(url)
  }

  /**
   * Limpa todo o cache
   */
  clear() {
    this.cache.clear()
  }

  /**
   * Remove entradas expiradas do cache
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

// Instância singleton
export const apiCache = new APICache()

// Limpar cache expirado a cada 5 minutos
if (typeof window !== 'undefined') {
  setInterval(() => {
    apiCache.cleanup()
  }, 5 * 60 * 1000)
}

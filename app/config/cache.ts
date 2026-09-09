/**
 * ⚙️ GLOBAL CACHE CONFIGURATION
 * 
 * Adjust this value to control the cache duration of ALL dashboard
 * APIs in a single place.
 */

// Cache duration in seconds
// 60 = 1 minute
// 300 = 5 minutes
// 600 = 10 minutes
// 1800 = 30 minutes
export const CACHE_DURATION_SECONDS = 1800; // 30 minutes

// Cache duration in milliseconds (for client-side use)
export const CACHE_DURATION_MS = CACHE_DURATION_SECONDS * 1000;

// Cache configuration for different data types
export const CACHE_CONFIG = {
  // Data that changes frequently (1 minute)
  REALTIME: 60,
  
  // Default data (10 minutes)
  DEFAULT: CACHE_DURATION_SECONDS,
  
  // Stable data (30 minutes)
  STABLE: 1800,
  
  // No cache (for real-time transactions)
  NO_CACHE: 0,
} as const;

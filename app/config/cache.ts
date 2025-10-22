/**
 * ⚙️ CONFIGURAÇÃO GLOBAL DE CACHE
 * 
 * Ajuste este valor para controlar o tempo de cache de TODAS as APIs
 * do dashboard em um único lugar.
 */

// Tempo de cache em segundos
// 60 = 1 minuto
// 300 = 5 minutos
// 600 = 10 minutos
// 1800 = 30 minutos
export const CACHE_DURATION_SECONDS = 600; // 10 minutos

// Tempo de cache em milissegundos (para uso no cliente)
export const CACHE_DURATION_MS = CACHE_DURATION_SECONDS * 1000;

// Configuração de cache para diferentes tipos de dados
export const CACHE_CONFIG = {
  // Dados que mudam frequentemente (1 minuto)
  REALTIME: 60,
  
  // Dados padrão (10 minutos)
  DEFAULT: CACHE_DURATION_SECONDS,
  
  // Dados estáveis (30 minutos)
  STABLE: 1800,
  
  // Sem cache (para transações em tempo real)
  NO_CACHE: 0,
} as const;

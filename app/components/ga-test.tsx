"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function GoogleAnalyticsTest() {
  const [diagnostics, setDiagnostics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function testGA() {
      try {
        const response = await fetch('/api/test-ga')
        const data = await response.json()
        setDiagnostics(data)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    testGA()
  }, [])

  if (loading) {
    return (
      <div className="p-8">
        <Card>
          <CardHeader>
            <CardTitle>🧪 Probando Google Analytics...</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="animate-pulse">Cargando diagnósticos...</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">❌ Error de conexión</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Error: {error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold">🧪 Diagnóstico Google Analytics</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>📋 Configuración</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span>Property ID:</span>
            <span>{diagnostics?.configuration?.propertyId}</span>
          </div>
          <div className="flex justify-between">
            <span>Credenciales Path:</span>
            <span>{diagnostics?.configuration?.credentialsPath}</span>
          </div>
          <div className="flex justify-between">
            <span>Archivo de credenciales:</span>
            <span>{diagnostics?.configuration?.credentialsFound ? 'Encontrado ✅' : 'No encontrado ❌'}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>🔧 Pruebas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span>Creación del cliente:</span>
            <span>{diagnostics?.tests?.clientCreation}</span>
          </div>
          <div className="flex justify-between">
            <span>Conexión API:</span>
            <span>{diagnostics?.tests?.apiConnection}</span>
          </div>
        </CardContent>
      </Card>

      {diagnostics?.errors && diagnostics.errors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">🚨 Errores</CardTitle>
          </CardHeader>
          <CardContent>
            {diagnostics.errors.map((error: string, index: number) => (
              <div key={index} className="text-red-600 bg-red-50 p-2 rounded mb-2">
                {error}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>🔗 Pruebas manuales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>Prueba estos endpoints manualmente:</p>
          <div className="space-y-2">
            <div>
              <a 
                href="/api/test-ga" 
                target="_blank" 
                className="text-blue-600 hover:underline"
              >
                📊 /api/test-ga - Diagnóstico completo
              </a>
            </div>
            <div>
              <a 
                href="/api/metrics/active-users-30min" 
                target="_blank" 
                className="text-blue-600 hover:underline"
              >
                👥 /api/metrics/active-users-30min
              </a>
            </div>
            <div>
              <a 
                href="/api/metrics/registered-users" 
                target="_blank" 
                className="text-blue-600 hover:underline"
              >
                📝 /api/metrics/registered-users
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>⚙️ Cómo configurar (si hay errores)</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p><strong>1. APIs a habilitar en Google Cloud:</strong></p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Google Analytics Reporting API</li>
            <li>Google Analytics Data API</li>
          </ul>
          
          <p className="mt-4"><strong>2. Archivo .env.local debe contener:</strong></p>
          <div className="bg-gray-100 p-2 rounded font-mono text-xs">
            GA_PROPERTY_ID=tu_property_id<br/>
            GOOGLE_APPLICATION_CREDENTIALS=./credentials/service-account-key.json
          </div>
          
          <p className="mt-4"><strong>3. Service Account debe tener acceso a Google Analytics</strong></p>
        </CardContent>
      </Card>
    </div>
  )
} 
'use client'

import { useEffect, useState } from 'react'

type SwaggerRequest = { headers: Record<string, string> }
type SwaggerResponse = { url?: string; body?: unknown }
type SwaggerConfiguration = {
  url: string
  dom_id: string
  presets: unknown[]
  layout: string
  deepLinking: boolean
  docExpansion: string
  filter: boolean
  tryItOutEnabled: boolean
  requestInterceptor: (request: SwaggerRequest) => SwaggerRequest
  responseInterceptor: (response: SwaggerResponse) => SwaggerResponse
}
type SwaggerFactory = ((configuration: SwaggerConfiguration) => unknown) & {
  presets: { apis: unknown }
}

declare global {
  interface Window {
    SwaggerUIBundle?: SwaggerFactory
    SwaggerUIStandalonePreset?: unknown
  }
}

let swaggerUiLoading: Promise<void> | undefined

function loadScript(id: string, src: string): Promise<void> {
  const current = document.getElementById(id) as HTMLScriptElement | null
  if (current?.dataset.loaded === 'true') return Promise.resolve()

  return new Promise((resolve, reject) => {
    const script = current || document.createElement('script')
    script.id = id
    script.src = src
    script.async = true
    script.onload = () => {
      script.dataset.loaded = 'true'
      resolve()
    }
    script.onerror = () => reject(new Error(`Unable to load Swagger UI from ${src}`))
    if (!current) document.body.appendChild(script)
  })
}

function loadSwaggerUi(): Promise<void> {
  if (!swaggerUiLoading) {
    swaggerUiLoading = loadScript(
      'cloudpay-swagger-bundle',
      'https://unpkg.com/swagger-ui-dist@5.18.2/swagger-ui-bundle.js'
    )
      .then(() => loadScript(
        'cloudpay-swagger-preset',
        'https://unpkg.com/swagger-ui-dist@5.18.2/swagger-ui-standalone-preset.js'
      ))
      .catch(error => {
        swaggerUiLoading = undefined
        throw error
      })
  }
  return swaggerUiLoading
}

export function SwaggerExplorer() {
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const stylesheetId = 'cloudpay-swagger-styles'
    if (!document.getElementById(stylesheetId)) {
      const stylesheet = document.createElement('link')
      stylesheet.id = stylesheetId
      stylesheet.rel = 'stylesheet'
      stylesheet.href = 'https://unpkg.com/swagger-ui-dist@5.18.2/swagger-ui.css'
      document.head.appendChild(stylesheet)
    }

    loadSwaggerUi()
      .then(() => {
        if (cancelled) return
        const swagger = window.SwaggerUIBundle
        if (!swagger || !window.SwaggerUIStandalonePreset) {
          throw new Error('Swagger UI loaded without its required components')
        }

        swagger({
          url: '/api/openapi.json',
          dom_id: '#swagger-ui',
          presets: [swagger.presets.apis, window.SwaggerUIStandalonePreset],
          layout: 'StandaloneLayout',
          deepLinking: true,
          docExpansion: 'list',
          filter: true,
          tryItOutEnabled: true,
          requestInterceptor: request => {
            const token = window.localStorage.getItem('cloudpay.accessToken')
            if (token && !request.headers.Authorization) {
              request.headers.Authorization = `Bearer ${token}`
            }
            return request
          },
          responseInterceptor: response => {
            if (
              response.url &&
              /\/api\/auth\/(login|register|firebase|google)$/.test(response.url) &&
              response.body
            ) {
              try {
                const body = typeof response.body === 'string'
                  ? JSON.parse(response.body) as { accessToken?: string; refreshToken?: string }
                  : response.body as { accessToken?: string; refreshToken?: string }
                if (body.accessToken) {
                  window.localStorage.setItem('cloudpay.accessToken', body.accessToken)
                  if (body.refreshToken) {
                    window.localStorage.setItem('cloudpay.refreshToken', body.refreshToken)
                  }
                }
              } catch {
                console.error('[Swagger] Could not read the authentication response token')
              }
            }
            return response
          },
        })
      })
      .catch(error => {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : 'Unable to load Swagger UI')
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <>
      {loadError ? (
        <div role="alert" className="swagger-load-error">
          <strong>Swagger UI could not be loaded.</strong>
          <span>{loadError}</span>
          <a href="/api/openapi.json">Open the API specification directly</a>
        </div>
      ) : (
        <div className="swagger-loading" aria-live="polite">
          <div className="spinner" />
          <span>Loading API documentation…</span>
        </div>
      )}
      <div id="swagger-ui" />
    </>
  )
}

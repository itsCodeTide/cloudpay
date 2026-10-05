export default function DocsPage() {
  return (
    <html lang="en">
      <head>
        <title>CloudPay API Docs</title>
        <meta name="description" content="Interactive API documentation for CloudPay — test all endpoints directly in the browser." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.18.2/swagger-ui.css" />
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }

          body {
            background: #0f1117;
            font-family: 'Inter', 'Segoe UI', sans-serif;
            min-height: 100vh;
          }

          /* Top header bar */
          .docs-header {
            background: linear-gradient(135deg, #1a1f2e 0%, #12151f 100%);
            border-bottom: 1px solid rgba(139, 92, 246, 0.3);
            padding: 16px 32px;
            display: flex;
            align-items: center;
            gap: 16px;
            position: sticky;
            top: 0;
            z-index: 1000;
            backdrop-filter: blur(10px);
          }

          .docs-logo {
            display: flex;
            align-items: center;
            gap: 10px;
            text-decoration: none;
          }

          .docs-logo-icon {
            width: 36px;
            height: 36px;
            background: linear-gradient(135deg, #8b5cf6, #06b6d4);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            font-weight: 900;
            color: white;
          }

          .docs-logo-text {
            font-size: 20px;
            font-weight: 700;
            background: linear-gradient(135deg, #8b5cf6, #06b6d4);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }

          .docs-badge {
            background: rgba(139, 92, 246, 0.15);
            border: 1px solid rgba(139, 92, 246, 0.4);
            color: #a78bfa;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
          }

          .docs-links {
            margin-left: auto;
            display: flex;
            align-items: center;
            gap: 12px;
          }

          .docs-link {
            color: #94a3b8;
            text-decoration: none;
            font-size: 13px;
            padding: 6px 12px;
            border-radius: 6px;
            transition: all 0.2s;
          }

          .docs-link:hover {
            color: #a78bfa;
            background: rgba(139, 92, 246, 0.1);
          }

          .docs-link.active {
            color: #a78bfa;
            background: rgba(139, 92, 246, 0.15);
            border: 1px solid rgba(139, 92, 246, 0.3);
          }

          .swagger-wrapper {
            max-width: 1400px;
            margin: 0 auto;
            padding: 24px 16px;
          }

          .backend-notice {
            background: linear-gradient(135deg, rgba(6,182,212,0.1), rgba(139,92,246,0.1));
            border: 1px solid rgba(6,182,212,0.3);
            border-radius: 12px;
            padding: 16px 24px;
            margin-bottom: 24px;
            display: flex;
            align-items: flex-start;
            gap: 12px;
          }

          .backend-notice .icon { font-size: 20px; }

          .backend-notice-text { color: #94a3b8; font-size: 13px; line-height: 1.6; }
          .backend-notice-text strong { color: #e2e8f0; }
          .backend-notice-text a { color: #06b6d4; text-decoration: none; }
          .backend-notice-text a:hover { text-decoration: underline; }

          /* ---- Swagger UI Dark Theme overrides ---- */
          #swagger-ui { background: transparent; }

          #swagger-ui .swagger-ui {
            font-family: 'Inter', 'Segoe UI', sans-serif !important;
          }

          #swagger-ui .swagger-ui .info { margin: 0 0 20px 0; }
          #swagger-ui .swagger-ui .info .title { color: #e2e8f0 !important; font-size: 28px !important; font-weight: 700 !important; }
          #swagger-ui .swagger-ui .info .description p { color: #94a3b8 !important; }
          #swagger-ui .swagger-ui .info hgroup.main { background: none !important; }
          #swagger-ui .swagger-ui .info .version { background: rgba(139,92,246,0.2) !important; color: #a78bfa !important; }

          /* Top bar / scheme selector */
          #swagger-ui .swagger-ui .topbar { display: none !important; }
          #swagger-ui .swagger-ui .scheme-container {
            background: rgba(26,31,46,0.9) !important;
            box-shadow: none !important;
            border-bottom: 1px solid rgba(139,92,246,0.2) !important;
          }

          /* Operations */
          #swagger-ui .swagger-ui .opblock {
            background: rgba(26,31,46,0.6) !important;
            border: 1px solid rgba(255,255,255,0.08) !important;
            border-radius: 10px !important;
            margin-bottom: 12px !important;
          }
          #swagger-ui .swagger-ui .opblock:hover {
            border-color: rgba(139,92,246,0.4) !important;
          }
          #swagger-ui .swagger-ui .opblock .opblock-summary {
            border: none !important;
          }
          #swagger-ui .swagger-ui .opblock .opblock-summary-description { color: #94a3b8 !important; }
          #swagger-ui .swagger-ui .opblock .opblock-summary-path { color: #e2e8f0 !important; }

          /* Method colors */
          #swagger-ui .swagger-ui .opblock.opblock-get { border-left: 3px solid #22c55e !important; }
          #swagger-ui .swagger-ui .opblock.opblock-post { border-left: 3px solid #3b82f6 !important; }
          #swagger-ui .swagger-ui .opblock.opblock-put { border-left: 3px solid #f59e0b !important; }
          #swagger-ui .swagger-ui .opblock.opblock-delete { border-left: 3px solid #ef4444 !important; }
          #swagger-ui .swagger-ui .opblock.opblock-patch { border-left: 3px solid #8b5cf6 !important; }

          #swagger-ui .swagger-ui .opblock.opblock-get .opblock-summary-method { background: #22c55e !important; }
          #swagger-ui .swagger-ui .opblock.opblock-post .opblock-summary-method { background: #3b82f6 !important; }
          #swagger-ui .swagger-ui .opblock.opblock-put .opblock-summary-method { background: #f59e0b !important; }
          #swagger-ui .swagger-ui .opblock.opblock-delete .opblock-summary-method { background: #ef4444 !important; }

          /* Opblock body */
          #swagger-ui .swagger-ui .opblock-body { background: rgba(15,17,23,0.5) !important; }
          #swagger-ui .swagger-ui section.models { background: rgba(26,31,46,0.6) !important; border: 1px solid rgba(255,255,255,0.08) !important; border-radius: 10px !important; }
          #swagger-ui .swagger-ui .model-container { background: rgba(15,17,23,0.4) !important; border-radius: 8px !important; }

          /* Tags */
          #swagger-ui .swagger-ui .opblock-tag { color: #e2e8f0 !important; border-bottom: 1px solid rgba(255,255,255,0.08) !important; }
          #swagger-ui .swagger-ui .opblock-tag:hover { background: rgba(139,92,246,0.05) !important; }

          /* Buttons */
          #swagger-ui .swagger-ui button.btn { border-radius: 6px !important; font-weight: 600 !important; }
          #swagger-ui .swagger-ui button.btn.authorize {
            background: linear-gradient(135deg, #8b5cf6, #06b6d4) !important;
            border-color: transparent !important;
            color: white !important;
          }
          #swagger-ui .swagger-ui button.execute {
            background: linear-gradient(135deg, #8b5cf6, #06b6d4) !important;
            border: none !important;
            color: white !important;
          }
          #swagger-ui .swagger-ui button.try-out__btn {
            background: rgba(139,92,246,0.15) !important;
            color: #a78bfa !important;
            border-color: rgba(139,92,246,0.4) !important;
          }
          #swagger-ui .swagger-ui button.cancel { color: #ef4444 !important; border-color: #ef4444 !important; }

          /* Inputs */
          #swagger-ui .swagger-ui input, #swagger-ui .swagger-ui textarea, #swagger-ui .swagger-ui select {
            background: rgba(15,17,23,0.8) !important;
            border: 1px solid rgba(255,255,255,0.1) !important;
            color: #e2e8f0 !important;
            border-radius: 6px !important;
          }
          #swagger-ui .swagger-ui input:focus, #swagger-ui .swagger-ui textarea:focus {
            border-color: rgba(139,92,246,0.6) !important;
            outline: none !important;
          }

          /* Response codes */
          #swagger-ui .swagger-ui .response-col_status { color: #a78bfa !important; }
          #swagger-ui .swagger-ui table.responses-table { background: transparent !important; }
          #swagger-ui .swagger-ui .response { color: #e2e8f0 !important; }
          #swagger-ui .swagger-ui .response-body pre { background: rgba(15,17,23,0.8) !important; color: #a5d6a7 !important; }

          /* Text */
          #swagger-ui .swagger-ui .markdown p, #swagger-ui .swagger-ui .markdown li { color: #94a3b8 !important; }
          #swagger-ui .swagger-ui label { color: #cbd5e1 !important; }
          #swagger-ui .swagger-ui .parameter__name { color: #e2e8f0 !important; }
          #swagger-ui .swagger-ui .parameter__type { color: #a78bfa !important; }
          #swagger-ui .swagger-ui table thead tr th { color: #94a3b8 !important; border-bottom: 1px solid rgba(255,255,255,0.08) !important; }
          #swagger-ui .swagger-ui .model { color: #e2e8f0 !important; }
          #swagger-ui .swagger-ui .model-title { color: #a78bfa !important; }
          #swagger-ui .swagger-ui span.model-title__text { color: #e2e8f0 !important; }
          #swagger-ui .swagger-ui .prop-type { color: #06b6d4 !important; }

          /* Auth modal */
          #swagger-ui .swagger-ui .dialog-ux .modal-ux {
            background: #1a1f2e !important;
            border: 1px solid rgba(139,92,246,0.3) !important;
            border-radius: 12px !important;
          }
          #swagger-ui .swagger-ui .dialog-ux .modal-ux-header { background: rgba(139,92,246,0.1) !important; border-bottom: 1px solid rgba(139,92,246,0.2) !important; }
          #swagger-ui .swagger-ui .dialog-ux .modal-ux-header h3 { color: #e2e8f0 !important; }

          /* Loading */
          .swagger-loading {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 300px;
            color: #94a3b8;
            flex-direction: column;
            gap: 16px;
          }

          .spinner {
            width: 40px; height: 40px;
            border: 3px solid rgba(139,92,246,0.2);
            border-top-color: #8b5cf6;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }

          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </head>
      <body>
        <div className="docs-header">
          <a href="/" className="docs-logo">
            <div className="docs-logo-icon">₹</div>
            <span className="docs-logo-text">CloudPay</span>
          </a>
          <span className="docs-badge">API Docs</span>
          <div className="docs-links">
            <a href="/docs" className="docs-link active">Next.js API</a>
            <a href="http://localhost:8080/swagger-ui.html" target="_blank" className="docs-link">
              Spring Boot API ↗
            </a>
            <a href="/" className="docs-link">← Dashboard</a>
          </div>
        </div>

        <div className="swagger-wrapper">
          <div className="backend-notice">
            <span className="icon">ℹ️</span>
            <div className="backend-notice-text">
              <strong>Two API layers:</strong> This page documents the <strong>Next.js API routes</strong> (port 3000).
              The Spring Boot backend (port 8080) has its own Swagger UI at{" "}
              <a href="http://localhost:8080/swagger-ui.html" target="_blank" rel="noreferrer">
                http://localhost:8080/swagger-ui.html
              </a>.
              {" "}Use the <strong>Authorize 🔒</strong> button below to paste your JWT token for authenticated endpoints.
            </div>
          </div>

          <div id="swagger-ui">
            <div className="swagger-loading">
              <div className="spinner"></div>
              <span>Loading API documentation…</span>
            </div>
          </div>
        </div>

        <script src="https://unpkg.com/swagger-ui-dist@5.18.2/swagger-ui-bundle.js"></script>
        <script src="https://unpkg.com/swagger-ui-dist@5.18.2/swagger-ui-standalone-preset.js"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.addEventListener('load', function() {
                SwaggerUIBundle({
                  url: '/api/openapi.json',
                  dom_id: '#swagger-ui',
                  presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
                  layout: 'StandaloneLayout',
                  deepLinking: true,
                  displayOperationId: false,
                  defaultModelsExpandDepth: 1,
                  defaultModelExpandDepth: 2,
                  docExpansion: 'list',
                  filter: true,
                  showExtensions: false,
                  tryItOutEnabled: true,
                  requestInterceptor: function(req) {
                    // Auto-inject token from localStorage if available
                    var token = localStorage.getItem('cloudpay_token');
                    if (token && !req.headers['Authorization']) {
                      req.headers['Authorization'] = 'Bearer ' + token;
                    }
                    return req;
                  },
                  onComplete: function() {
                    // Auto-fill token from localStorage if present
                    var token = localStorage.getItem('cloudpay_token');
                    if (token) {
                      window.ui = window.ui || {};
                    }
                  }
                });
              });
            `,
          }}
        />
      </body>
    </html>
  );
}

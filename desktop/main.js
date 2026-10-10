'use strict'

// Hoqooq desktop — Electron main process.
//
// Security model
// - The UI is served from inside app.asar over a private app://hoqooq origin.
//   The page never talks to the network directly: /api and /health are
//   proxied here to BACKEND, so there is no CORS and the backend address
//   lives only in this file.
// - The page runs sandboxed with context isolation, no Node, a strict CSP,
//   no new windows, no outside navigation and no device permissions.
// - Login tokens are encrypted with the OS keystore (Windows DPAPI) before
//   they touch disk; case data is never cached to disk.
// - Build-time Electron fuses (see package.json) block RunAsNode, NODE_OPTIONS,
//   --inspect, and refuse to start if app.asar has been modified.
// All permissions are still enforced by the backend for every request; this
// client holds no secrets and cannot grant itself access.

const { app, BrowserWindow, Menu, ipcMain, net, protocol, safeStorage, session, shell } = require('electron')
const fs = require('node:fs')
const fsp = require('node:fs/promises')
const path = require('node:path')

// Production backend. Switch to the https:// address once TLS is set up.
const BACKEND = 'http://13.50.240.246:3006'

const SCHEME = 'app'
const HOST = 'hoqooq'
const ORIGIN = `${SCHEME}://${HOST}`
const RENDERER_DIR = path.join(__dirname, 'app', 'renderer')
const INDEX_FILE = path.join(RENDERER_DIR, 'index.html')
const SESSION_FILE = () => path.join(app.getPath('userData'), 'session.bin')
const PROXY_TIMEOUT_MS = 10 * 60_000

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "media-src 'self' blob:",
  "frame-src 'self' blob:",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ')

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
}

// Hop-by-hop / encoding headers that must not be copied: net.fetch already
// decoded the body, so passing these on would corrupt it.
const STRIP_RESPONSE_HEADERS = ['content-encoding', 'content-length', 'transfer-encoding', 'connection', 'set-cookie']
const STRIP_REQUEST_HEADERS = ['origin', 'referer', 'cookie', 'host']

protocol.registerSchemesAsPrivileged([
  { scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, codeCache: true } },
])
app.enableSandbox()

if (!app.requestSingleInstanceLock()) {
  app.quit()
}

let mainWindow = null

function isTrustedUrl(url) {
  try {
    const parsed = new URL(url)
    return parsed.protocol === `${SCHEME}:` && parsed.host === HOST
  } catch {
    return false
  }
}

// ---------------------------------------------------------------- protocol

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}

async function proxyToBackend(request, url) {
  const headers = new Headers(request.headers)
  for (const name of STRIP_REQUEST_HEADERS) headers.delete(name)
  const init = { method: request.method, headers, signal: AbortSignal.timeout(PROXY_TIMEOUT_MS) }
  if (request.method !== 'GET' && request.method !== 'HEAD') init.body = await request.arrayBuffer()

  let upstream
  try {
    upstream = await net.fetch(`${BACKEND}${url.pathname}${url.search}`, init)
  } catch {
    return jsonResponse(503, { success: false, statusCode: 503, code: 'BACKEND_UNREACHABLE', message: 'Backend unreachable' })
  }

  const out = new Headers(upstream.headers)
  for (const name of STRIP_RESPONSE_HEADERS) out.delete(name)
  // Legal case data must never be written to the on-disk HTTP cache.
  out.set('Cache-Control', 'no-store')
  const noBody = upstream.status === 204 || upstream.status === 304 || request.method === 'HEAD'
  return new Response(noBody ? null : upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: out })
}

async function serveStatic(pathname) {
  let file
  try {
    file = path.normalize(path.join(RENDERER_DIR, decodeURIComponent(pathname)))
  } catch {
    file = INDEX_FILE
  }
  // Never serve anything outside the bundled UI folder.
  if (file !== RENDERER_DIR && !file.startsWith(RENDERER_DIR + path.sep)) file = INDEX_FILE
  let stat = null
  try {
    stat = fs.statSync(file)
  } catch {
    stat = null
  }
  // SPA fallback: client-side routes like /cases/123 load index.html.
  if (!stat || stat.isDirectory()) file = INDEX_FILE

  const data = await fsp.readFile(file)
  const type = MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream'
  return new Response(data, {
    status: 200,
    headers: {
      'Content-Type': type,
      'Content-Security-Policy': CSP,
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'Cache-Control': file === INDEX_FILE ? 'no-cache' : 'public, max-age=31536000, immutable',
    },
  })
}

function registerAppProtocol() {
  protocol.handle(SCHEME, async (request) => {
    const url = new URL(request.url)
    if (url.host !== HOST) return new Response('Not found', { status: 404 })
    if (url.pathname === '/health' || url.pathname === '/api' || url.pathname.startsWith('/api/')) {
      return proxyToBackend(request, url)
    }
    return serveStatic(url.pathname)
  })
}

// ---------------------------------------------------------------- session store

function fromTrustedPage(event) {
  return isTrustedUrl(event.senderFrame?.url ?? '')
}

function registerSessionIpc() {
  ipcMain.on('hoqooq:session-load', (event) => {
    event.returnValue = null
    if (!fromTrustedPage(event) || !safeStorage.isEncryptionAvailable()) return
    try {
      const tokens = JSON.parse(safeStorage.decryptString(fs.readFileSync(SESSION_FILE())))
      if (typeof tokens?.accessToken === 'string' && typeof tokens?.refreshToken === 'string') event.returnValue = tokens
    } catch {
      // missing, corrupted, or encrypted for another Windows user
    }
  })

  ipcMain.on('hoqooq:session-save', (event, tokens) => {
    event.returnValue = false
    if (!fromTrustedPage(event) || !tokens) return
    // Without OS encryption the session stays in memory only.
    if (!safeStorage.isEncryptionAvailable()) return
    try {
      const target = SESSION_FILE()
      const tmp = `${target}.tmp`
      fs.writeFileSync(tmp, safeStorage.encryptString(JSON.stringify(tokens)), { mode: 0o600 })
      fs.renameSync(tmp, target)
      event.returnValue = true
    } catch {
      // keep running with the in-memory session
    }
  })

  ipcMain.on('hoqooq:session-clear', (event) => {
    event.returnValue = false
    if (!fromTrustedPage(event)) return
    try {
      fs.rmSync(SESSION_FILE(), { force: true })
      event.returnValue = true
    } catch {
      // ignore
    }
  })
}

// ---------------------------------------------------------------- hardening

function hardenSession() {
  const ses = session.defaultSession
  // Only clipboard writes (copy buttons) are allowed; camera, mic,
  // location, notifications, USB, etc. are all refused.
  const allowed = new Set(['clipboard-sanitized-write'])
  ses.setPermissionRequestHandler((_wc, permission, callback) => callback(allowed.has(permission)))
  ses.setPermissionCheckHandler((_wc, permission) => allowed.has(permission))
}

app.on('web-contents-created', (_event, contents) => {
  const blockForeign = (event, url) => {
    if (!isTrustedUrl(url)) event.preventDefault()
  }
  contents.on('will-navigate', blockForeign)
  contents.on('will-redirect', blockForeign)
  contents.on('will-attach-webview', (event) => event.preventDefault())
  contents.setWindowOpenHandler(({ url }) => {
    // External https/mail links open in the user's browser; nothing opens inside the app.
    if (/^(https:|mailto:)/i.test(url)) shell.openExternal(url)
    return { action: 'deny' }
  })
})

// ---------------------------------------------------------------- window

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 880,
    minWidth: 1024,
    minHeight: 640,
    show: false,
    title: 'Hoqooq',
    backgroundColor: '#FBFAF6',
    icon: path.join(__dirname, 'app', 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      nodeIntegrationInWorker: false,
      nodeIntegrationInSubFrames: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      webviewTag: false,
      navigateOnDragDrop: false,
      spellcheck: false,
      safeDialogs: true,
      devTools: !app.isPackaged,
    },
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize()
    mainWindow.show()
  })

  const contents = mainWindow.webContents

  // Stability: a crashed or frozen page reloads instead of staying white.
  // The encrypted session survives, so the user stays logged in.
  let crashes = 0
  contents.on('render-process-gone', (_event, details) => {
    if (details.reason === 'clean-exit' || crashes >= 5) return
    crashes += 1
    setTimeout(() => !mainWindow?.isDestroyed() && mainWindow.loadURL(`${ORIGIN}/`), 1000)
  })
  let freezeTimer = null
  mainWindow.on('unresponsive', () => {
    freezeTimer = setTimeout(() => !mainWindow?.isDestroyed() && contents.reload(), 15_000)
  })
  mainWindow.on('responsive', () => clearTimeout(freezeTimer))
  contents.on('did-fail-load', (_event, _code, _desc, url, isMainFrame) => {
    if (isMainFrame && isTrustedUrl(url)) setTimeout(() => !mainWindow?.isDestroyed() && mainWindow.loadURL(`${ORIGIN}/`), 2000)
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.loadURL(`${ORIGIN}/`)
}

app.on('second-instance', () => {
  if (!mainWindow) return
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.focus()
})

app.whenReady().then(() => {
  app.setAppUserModelId('com.ethereal.hoqooq')
  Menu.setApplicationMenu(null)
  hardenSession()
  registerAppProtocol()
  registerSessionIpc()
  createWindow()
})

app.on('window-all-closed', () => app.quit())

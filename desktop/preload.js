// Runs sandboxed. Exposes only an encrypted session store to the page — no
// Node, no filesystem, no generic IPC. Token encryption happens in the main
// process with the OS keystore (Windows DPAPI via safeStorage).
const { contextBridge, ipcRenderer } = require('electron')

function tokensOnly(tokens) {
  if (!tokens || typeof tokens.accessToken !== 'string' || typeof tokens.refreshToken !== 'string') return null
  return { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }
}

contextBridge.exposeInMainWorld('hoqooqSecure', {
  load: () => ipcRenderer.sendSync('hoqooq:session-load'),
  save: (tokens) => ipcRenderer.sendSync('hoqooq:session-save', tokensOnly(tokens)),
  clear: () => ipcRenderer.sendSync('hoqooq:session-clear'),
})

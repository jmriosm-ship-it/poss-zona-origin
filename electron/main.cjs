// Ventana de escritorio de Zona Originals POS (Windows)
const { app, BrowserWindow, Menu } = require('electron')
const path = require('path')

function crearVentana() {
  const ventana = new BrowserWindow({
    width: 1366,
    height: 820,
    minWidth: 1100,
    minHeight: 650,
    backgroundColor: '#f3f3f4',
    title: 'Zona Originals · Punto de venta',
    icon: path.join(__dirname, '..', 'public', 'logo.png'),
    webPreferences: { contextIsolation: true },
  })
  Menu.setApplicationMenu(null)
  ventana.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
}

// Una sola ventana abierta a la vez
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.whenReady().then(crearVentana)
  app.on('window-all-closed', () => app.quit())
}

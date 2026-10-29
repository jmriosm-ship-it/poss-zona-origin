// Ventana de escritorio de Zona Originals POS (Windows)
const { app, BrowserWindow, Menu, ipcMain, shell } = require('electron')
const path = require('path')
const fs = require('fs')

// Copias de seguridad automáticas: Documentos\Zona Originals\Copias (una por día, se guardan 30)
const carpetaCopias = () => path.join(app.getPath('documents'), 'Zona Originals', 'Copias')
const NOMBRE_COPIA = /^copia-\d{4}-\d{2}-\d{2}\.json$/

ipcMain.handle('copias:guardar', (_e, texto) => {
  try {
    const dir = carpetaCopias()
    fs.mkdirSync(dir, { recursive: true })
    const dia = new Date().toLocaleDateString('en-CA')
    const archivo = path.join(dir, 'copia-' + dia + '.json')
    fs.writeFileSync(archivo + '.tmp', String(texto))
    fs.renameSync(archivo + '.tmp', archivo)
    const viejas = fs.readdirSync(dir).filter((n) => NOMBRE_COPIA.test(n)).sort().reverse().slice(30)
    for (const n of viejas) fs.unlinkSync(path.join(dir, n))
    return { ok: true, archivo, carpeta: dir }
  } catch (err) {
    return { ok: false, error: String(err.message || err) }
  }
})
ipcMain.handle('copias:listar', () => {
  try {
    const dir = carpetaCopias()
    return {
      carpeta: dir,
      copias: fs
        .readdirSync(dir)
        .filter((n) => NOMBRE_COPIA.test(n))
        .sort()
        .reverse()
        .map((n) => ({ nombre: n, fecha: fs.statSync(path.join(dir, n)).mtime.toISOString(), tamano: fs.statSync(path.join(dir, n)).size })),
    }
  } catch {
    return { carpeta: carpetaCopias(), copias: [] }
  }
})
ipcMain.handle('copias:leer', (_e, nombre) => (NOMBRE_COPIA.test(String(nombre)) ? fs.readFileSync(path.join(carpetaCopias(), nombre), 'utf8') : null))
ipcMain.handle('copias:abrir', () => {
  fs.mkdirSync(carpetaCopias(), { recursive: true })
  return shell.openPath(carpetaCopias())
})

function crearVentana() {
  const ventana = new BrowserWindow({
    width: 1366,
    height: 820,
    minWidth: 1100,
    minHeight: 650,
    backgroundColor: '#f3f3f4',
    title: 'Zona Originals · Punto de venta',
    icon: path.join(__dirname, '..', 'public', 'logo.png'),
    webPreferences: { contextIsolation: true, preload: path.join(__dirname, 'preload.cjs') },
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

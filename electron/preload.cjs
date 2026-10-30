// Puente seguro entre la pantalla y el disco: solo permite las copias de seguridad
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('zoImpresora', {
  listar: () => ipcRenderer.invoke('impresion:listar'),
  imprimir: (nombre) => ipcRenderer.invoke('impresion:imprimir', nombre),
})

contextBridge.exposeInMainWorld('zoCopias', {
  guardar: (texto) => ipcRenderer.invoke('copias:guardar', texto),
  listar: () => ipcRenderer.invoke('copias:listar'),
  leer: (nombre) => ipcRenderer.invoke('copias:leer', nombre),
  abrirCarpeta: () => ipcRenderer.invoke('copias:abrir'),
})

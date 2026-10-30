import { datosEquipo } from './equipo.js'

// Impresión: en la aplicación de escritorio puede mandar directo a la impresora elegida (sin ventana); si no, abre la ventana normal
export const hayImpresora = () => typeof window !== 'undefined' && Boolean(window.zoImpresora)

export async function imprimir() {
  const e = datosEquipo()
  if (hayImpresora() && e.impresionDirecta && e.impresora) {
    const r = await window.zoImpresora.imprimir(e.impresora)
    if (r?.ok) return
    alert('No se pudo imprimir directo (' + (r?.error || 'error') + '). Se abre la ventana de impresión.')
  }
  window.print()
}

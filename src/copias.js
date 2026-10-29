import { exportarTodo } from './almacen.js'

// Copia de seguridad automática (solo en la aplicación de escritorio): guarda todo en Documentos\Zona Originals\Copias
export const hayCopias = () => typeof window !== 'undefined' && Boolean(window.zoCopias)

let ultimoTexto = ''
export async function hacerCopia(forzar = false) {
  if (!hayCopias()) return null
  const datos = JSON.stringify(exportarTodo().datos)
  if (!forzar && datos === ultimoTexto) return null // nada cambió desde la última copia
  const r = await window.zoCopias.guardar(JSON.stringify(exportarTodo()))
  if (r?.ok) ultimoTexto = datos
  return r
}

// Primera copia a los 15 segundos de abrir y luego cada 10 minutos si hubo cambios
export function iniciarCopiaAutomatica() {
  if (!hayCopias()) return () => {}
  const espera = setTimeout(() => hacerCopia(), 15000)
  const ciclo = setInterval(() => hacerCopia(), 10 * 60 * 1000)
  return () => {
    clearTimeout(espera)
    clearInterval(ciclo)
  }
}

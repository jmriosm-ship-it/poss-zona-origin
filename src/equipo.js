import { useSyncExternalStore } from 'react'

// Datos de ESTE computador (no se comparten con los demás): el nombre de su caja, por ejemplo "Caja 1" y "Caja 2".
// Cada caja lleva sus propios números de ticket y su propia caja del día.
const CLAVE = 'zo_equipo'

function leer() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE)) || {}
  } catch {
    return {}
  }
}

function guardar(d) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(d))
  } catch {
    /* sin espacio: sigue en memoria */
  }
}

const guardado = leer()
let datos = { nombreCaja: 'Caja 1', ...guardado }
// versiones anteriores guardaban el nombre de la caja en la configuración compartida
if (!guardado.nombreCaja) {
  try {
    const c = JSON.parse(localStorage.getItem('zo_config'))
    if (c?.nombreCaja) datos.nombreCaja = c.nombreCaja
  } catch {
    /* sin configuración previa */
  }
}
// identificador de este computador: sirve para detectar dos computadores con el mismo nombre de caja
if (!datos.idEquipo) datos.idEquipo = Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
if (!guardado.nombreCaja || !guardado.idEquipo) guardar(datos)

const oyentes = new Set()

export const nombreCajaActual = () => datos.nombreCaja
export const idEquipo = () => datos.idEquipo

export function guardarNombreCaja(nombre) {
  datos = { ...datos, nombreCaja: String(nombre || '').trim() || 'Caja 1' }
  guardar(datos)
  oyentes.forEach((f) => f())
}

export const datosEquipo = () => datos
export function guardarEquipo(parcial) {
  datos = { ...datos, ...parcial }
  guardar(datos)
  oyentes.forEach((f) => f())
}
export const useEquipo = () =>
  useSyncExternalStore(
    (f) => {
      oyentes.add(f)
      return () => oyentes.delete(f)
    },
    () => datos,
  )

export const useCajaActual = () =>
  useSyncExternalStore(
    (f) => {
      oyentes.add(f)
      return () => oyentes.delete(f)
    },
    () => datos.nombreCaja,
  )

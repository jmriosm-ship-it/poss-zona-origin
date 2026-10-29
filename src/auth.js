import { useSyncExternalStore } from 'react'
import { useUsuarios, almacenUsuarios, fijarActor, registrarAccion } from './almacen.js'

// Sesión del usuario: vive mientras la ventana siga abierta
let sesionId = null
try {
  sesionId = sessionStorage.getItem('zo_sesion')
} catch {
  /* sin sessionStorage */
}
const oyentes = new Set()
fijarActor(almacenUsuarios.leer().find((u) => u.id === sesionId))

export function iniciarSesion(id) {
  sesionId = id
  fijarActor(almacenUsuarios.leer().find((u) => u.id === id))
  if (id) registrarAccion('Inició sesión')
  try {
    if (id) sessionStorage.setItem('zo_sesion', id)
    else sessionStorage.removeItem('zo_sesion')
  } catch {
    /* ignorar */
  }
  oyentes.forEach((f) => f())
}
export const cerrarSesion = () => iniciarSesion(null)

const useSesionId = () =>
  useSyncExternalStore(
    (f) => {
      oyentes.add(f)
      return () => oyentes.delete(f)
    },
    () => sesionId,
  )

export function useUsuario() {
  const usuarios = useUsuarios()
  const id = useSesionId()
  return usuarios.find((u) => u.id === id) || null
}

export async function hashPin(pin) {
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('zo:' + pin))
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  } catch {
    return 'plano:' + pin
  }
}

// El trabajador solo ve estas pantallas; el administrador ve todas
const PANTALLAS_VENDEDOR = ['inicio', 'caja', 'inventario']
export const nombreRol = (rol) => (rol === 'admin' ? 'Administrador' : 'Trabajador')
// El administrador puede darle más permisos a cada trabajador (pantallas extra, anular/devolver, descuento más alto)
export const puede = (usuario, pantalla) => usuario?.rol === 'admin' || PANTALLAS_VENDEDOR.includes(pantalla) || Boolean(usuario?.permisos?.pantallas?.includes(pantalla))
export const puedeHacer = (usuario, accion) => usuario?.rol === 'admin' || Boolean(usuario?.permisos?.[accion])
// Descuento máximo (en %) que el trabajador puede dar solo; más que eso pide el PIN del administrador
export const descuentoMaximo = (usuario) => (usuario?.rol === 'admin' ? 100 : Number(usuario?.permisos?.descuentoMax ?? 10))
export async function verificarPinAdmin(pin) {
  const h = await hashPin(String(pin).trim())
  return almacenUsuarios.leer().some((u) => u.rol === 'admin' && u.pinHash === h)
}

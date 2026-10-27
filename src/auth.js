import { useSyncExternalStore } from 'react'
import { useUsuarios } from './almacen.js'

// Sesión del usuario: vive mientras la ventana siga abierta
let sesionId = null
try {
  sesionId = sessionStorage.getItem('zo_sesion')
} catch {
  /* sin sessionStorage */
}
const oyentes = new Set()

export function iniciarSesion(id) {
  sesionId = id
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

// El vendedor solo ve estas pantallas; el administrador ve todas
const PANTALLAS_VENDEDOR = ['caja', 'inventario', 'ventas', 'clientes']
export const puede = (usuario, pantalla) => usuario?.rol === 'admin' || PANTALLAS_VENDEDOR.includes(pantalla)

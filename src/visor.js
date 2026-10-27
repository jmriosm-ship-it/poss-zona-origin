import { useSyncExternalStore } from 'react'

// Qué se está leyendo encima de la pantalla: la guía de uso o un documento legal
let estado = null // { tipo: 'ayuda' } | { tipo: 'legal', doc: 'privacidad' | ... }
const oyentes = new Set()

export function abrirVisor(tipo, doc) {
  estado = { tipo, doc }
  oyentes.forEach((f) => f())
}
export function cerrarVisor() {
  estado = null
  oyentes.forEach((f) => f())
}

export const useVisor = () =>
  useSyncExternalStore(
    (f) => {
      oyentes.add(f)
      return () => oyentes.delete(f)
    },
    () => estado,
  )

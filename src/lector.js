import { useEffect, useRef } from 'react'

// Lector de códigos de barras USB ("pistola"): el computador lo ve como un teclado que escribe muy rápido
// el código y termina con Enter. Este gancho detecta esas ráfagas aunque el cursor no esté en la búsqueda.
//  - alLeer(codigo): se llama con cada código leído; debe devolver true si lo reconoció (suena un pitido bueno)
//    o false si no lo encontró (pitido de error).
//  - Si el cursor está escribiendo en un campo de texto, no se intercepta: ese campo recibe el código normal.
const MAX_ENTRE_TECLAS = 60 // ms; una persona tecleando es mucho más lenta
const MIN_LARGO = 4

let contexto
let sonidoActivo = true
export const activarSonido = (activo) => {
  sonidoActivo = activo
}

function pitar(bueno) {
  if (!sonidoActivo) return
  try {
    contexto ||= new (window.AudioContext || window.webkitAudioContext)()
    const o = contexto.createOscillator()
    const g = contexto.createGain()
    o.type = 'square'
    o.frequency.value = bueno ? 1500 : 320
    g.gain.value = 0.06
    o.connect(g)
    g.connect(contexto.destination)
    o.start()
    o.stop(contexto.currentTime + (bueno ? 0.08 : 0.28))
  } catch {
    /* sin audio: no pasa nada */
  }
}
export { pitar }

const esCampo = (el) => el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)

export function useLector(alLeer, activo = true) {
  const guardado = useRef(alLeer)
  guardado.current = alLeer

  useEffect(() => {
    if (!activo) return
    let buffer = ''
    let ultima = 0

    function tecla(e) {
      if (esCampo(e.target) || e.ctrlKey || e.metaKey || e.altKey) return
      const ahora = performance.now()
      if (ahora - ultima > MAX_ENTRE_TECLAS) buffer = ''
      ultima = ahora

      if (e.key === 'Enter') {
        if (buffer.length >= MIN_LARGO) {
          e.preventDefault()
          const codigo = buffer
          buffer = ''
          pitar(Boolean(guardado.current(codigo)))
        }
        buffer = ''
        return
      }
      if (e.key.length === 1) buffer += e.key
    }

    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [activo])
}

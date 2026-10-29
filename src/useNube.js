import { useCallback, useEffect, useRef, useState } from 'react'
import { almacenesNube } from './almacen.js'
import { backendSupabase, supabase } from './nube.js'
import { sincronizar } from './sync.js'
import { fusionarTres } from './fusion.js'

// colecciones donde, si los dos computadores cambian el mismo registro a la vez, se combinan los cambios
const MEZCLABLES = { productos: fusionarTres, creditos: fusionarTres, compras: fusionarTres, clientes: fusionarTres }

const CLAVE = 'zo_nube_estado'

function leerEstado() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE)) || {}
  } catch {
    return {}
  }
}

function guardarEstado(estado) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(estado))
  } catch {
    // sin espacio: se vuelve a calcular en la próxima sincronización
  }
}

// Borra lo que recuerda la sincronización (se usa al cerrar la sesión de la nube)
export function olvidarEstadoNube() {
  try {
    localStorage.removeItem(CLAVE)
  } catch {
    // nada que hacer
  }
}

// Mantiene los datos al día con la nube: al iniciar sesión, al volver a la ventana, al recuperar internet,
// cada minuto y 2 segundos después de cada cambio.
export function useNube(sesion) {
  const usuario = sesion?.user?.id
  const [estado, setEstado] = useState('inactivo') // inactivo | sincronizando | ok | sinconexion | error
  const [ultima, setUltima] = useState(() => (leerEstado().usuario === usuario ? leerEstado().ultima || null : null))
  const [mensaje, setMensaje] = useState('')
  const corriendo = useRef(false)
  const repetir = useRef(false)
  const aplicando = useRef(false)

  const sincronizarAhora = useCallback(async () => {
    if (!supabase || !usuario) return
    if (corriendo.current) {
      repetir.current = true
      return
    }
    corriendo.current = true
    aplicando.current = true
    setEstado('sincronizando')
    setMensaje('')

    let guardado = leerEstado()
    if (guardado.usuario !== usuario) guardado = { usuario, cursor: {}, enviado: {} }

    try {
      const r = await sincronizar({ backend: backendSupabase(supabase), almacenes: almacenesNube, estado: guardado, mezclables: MEZCLABLES })
      if (r.reintentar) repetir.current = true // otro computador guardó algo al mismo tiempo: se vuelve a combinar enseguida
      guardado.ultima = new Date().toISOString()
      setUltima(guardado.ultima)
      setEstado('ok')
    } catch (e) {
      const texto = String(e?.message || e)
      setEstado(!navigator.onLine || /fetch|network|failed to/i.test(texto) ? 'sinconexion' : 'error')
      setMensaje(texto)
    } finally {
      guardarEstado(guardado)
      aplicando.current = false
      corriendo.current = false
      if (repetir.current) {
        repetir.current = false
        setTimeout(sincronizarAhora, 500)
      }
    }
  }, [usuario])

  useEffect(() => {
    if (!usuario) {
      setEstado('inactivo')
      return
    }
    sincronizarAhora()

    let temporizador
    // cada cambio en cualquier colección programa una sincronización en 2 segundos
    const alCambiar = () => {
      if (aplicando.current) {
        repetir.current = true
        return
      }
      clearTimeout(temporizador)
      temporizador = setTimeout(sincronizarAhora, 2000)
    }
    const bajas = Object.values(almacenesNube).map((a) => a.subscribe(alCambiar))
    const alVolver = () => document.visibilityState === 'visible' && sincronizarAhora()

    window.addEventListener('online', sincronizarAhora)
    document.addEventListener('visibilitychange', alVolver)
    const intervalo = setInterval(sincronizarAhora, 15000) // con dos computadores, los cambios del otro se ven en segundos

    return () => {
      clearTimeout(temporizador)
      clearInterval(intervalo)
      bajas.forEach((baja) => baja())
      window.removeEventListener('online', sincronizarAhora)
      document.removeEventListener('visibilitychange', alVolver)
    }
  }, [usuario, sincronizarAhora])

  return { estado, ultima, mensaje, sincronizarAhora }
}

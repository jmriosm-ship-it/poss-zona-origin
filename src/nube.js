// Conexión con Supabase: el cliente, la sesión de la cuenta del negocio y el "backend" que usa el motor de sincronización.
import { createClient } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'

const URL_NUBE = import.meta.env.VITE_SUPABASE_URL
const LLAVE_NUBE = import.meta.env.VITE_SUPABASE_ANON_KEY

// Si no hay datos de conexión (archivo .env), el sistema funciona igual, solo en este computador
export const nubeConfigurada = Boolean(URL_NUBE && LLAVE_NUBE && !URL_NUBE.includes('TU-PROYECTO'))

export const supabase = nubeConfigurada
  ? createClient(URL_NUBE, LLAVE_NUBE, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: 'zo-auth' },
    })
  : null

// La sesión: undefined = todavía cargando, null = sin iniciar sesión, objeto = sesión iniciada
export function useSesionNube() {
  const [sesion, setSesion] = useState(nubeConfigurada ? undefined : null)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setSesion(data.session))
    const { data } = supabase.auth.onAuthStateChange((_evento, nueva) => setSesion(nueva))
    return () => data.subscription.unsubscribe()
  }, [])

  return sesion
}

const PAGINA = 1000

// Cómo se habla con la tabla "registros" de Supabase
export function backendSupabase(cliente) {
  return {
    // todo lo que cambió en la nube desde "desde" (o todo, la primera vez)
    async traer(coleccion, desde) {
      const salida = []
      for (let inicio = 0; ; inicio += PAGINA) {
        let consulta = cliente
          .from('registros')
          .select('id,data,t,borrado,actualizado')
          .eq('coleccion', coleccion)
          .order('actualizado', { ascending: true })
          .order('id', { ascending: true })
          .range(inicio, inicio + PAGINA - 1)
        if (desde) consulta = consulta.gte('actualizado', desde)
        const { data, error } = await consulta
        if (error) throw error
        salida.push(...data)
        if (data.length < PAGINA) break
      }
      return salida
    },
    // sube registros; la función de la base de datos no pisa versiones más nuevas
    async subir(filas) {
      const { error } = await cliente.rpc('subir_registros', {
        filas: filas.map((f) => ({ coleccion: f.coleccion, id: f.id, data: f.data, t: f.t, borrado: f.borrado })),
      })
      if (error) throw error
    },
  }
}

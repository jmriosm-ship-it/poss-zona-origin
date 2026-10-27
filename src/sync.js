// Motor de sincronización con la nube. No sabe nada de React ni de Supabase: recibe las colecciones
// y un "backend" con dos funciones (traer y subir), así se puede probar sin internet.
//
// Reglas:
//  - Cada registro tiene una marca de tiempo "_t". Gana siempre la versión con la marca más reciente.
//  - Un registro borrado deja una "lápida" (id + hora) para que los demás computadores también lo borren.
//  - Primero se baja lo nuevo de la nube, luego se sube lo que cambió aquí.

// Registros que hay que subir: los nuevos o cambiados desde el último envío, más los borrados pendientes
export function pendientesDeEnvio(local, borrados, enviado) {
  const subir = local
    .filter((r) => (r._t || 1) > (enviado[r.id] || 0))
    .map((r) => {
      const { _t, ...data } = r
      return { id: r.id, t: _t || 1, borrado: false, data }
    })
  const borrar = borrados
    .filter((b) => b._t > (enviado[b.id] || 0))
    .map((b) => ({ id: b.id, t: b._t, borrado: true, data: null }))
  return [...subir, ...borrar]
}

// Une lo que llegó de la nube con lo que hay aquí. Modifica "enviado" con lo que la nube ya tiene.
export function fusionarRemotos(local, borrados, filas, enviado) {
  const mapa = new Map(local.map((r) => [r.id, r]))
  const lapidas = new Map(borrados.map((b) => [b.id, b]))
  const nuevos = []
  let cambio = false

  for (const fila of filas) {
    const actual = mapa.get(fila.id)
    const lapida = lapidas.get(fila.id)
    const tLocal = actual ? actual._t || 1 : lapida ? lapida._t : 0

    if (fila.t > tLocal) {
      if (fila.borrado) {
        if (actual) {
          mapa.delete(fila.id)
          cambio = true
        }
      } else {
        const registro = { ...fila.data, _t: fila.t }
        if (actual) mapa.set(fila.id, registro)
        else nuevos.push(registro)
        cambio = true
      }
      lapidas.delete(fila.id)
      enviado[fila.id] = fila.t
    } else if (fila.t === tLocal) {
      enviado[fila.id] = fila.t // ya estamos iguales
    }
  }

  if (!cambio) return { local, borrados: [...lapidas.values()], cambio: false }

  // los registros nuevos que llegan van al principio, del más reciente al más viejo
  nuevos.sort((a, b) => b._t - a._t)
  let lista = [...nuevos, ...mapa.values()]
  // las colecciones con fecha (ventas, compras, gastos) se muestran de la más nueva a la más vieja
  if (lista.length > 0 && lista.every((r) => r.fecha)) {
    lista = lista.map((r, i) => [r, i]).sort((a, b) => new Date(b[0].fecha) - new Date(a[0].fecha) || a[1] - b[1]).map((x) => x[0])
  }
  return { local: lista, borrados: [...lapidas.values()], cambio: true }
}

const TAMANO_LOTE = 200

// Un ciclo completo: baja lo nuevo, lo une con lo local y sube lo que cambió.
//  - almacenes: { productos: almacen, ventas: almacen, ... }
//  - estado: { cursor: { coleccion: "fecha" }, enviado: { coleccion: { id: t } } }  (se va modificando)
//  - backend: { traer(coleccion, desde) -> filas, subir(filas) }
export async function sincronizar({ backend, almacenes, estado }) {
  estado.cursor ||= {}
  estado.enviado ||= {}
  const nombres = Object.keys(almacenes)
  let bajados = 0

  // 1) Bajar lo nuevo de la nube
  const traidos = {}
  for (const nombre of nombres) traidos[nombre] = await backend.traer(nombre, estado.cursor[nombre] || null)

  // 2) Unirlo con lo de este computador (todo seguido, sin esperas, para no pisar cambios que se hagan mientras tanto)
  for (const nombre of nombres) {
    const filas = traidos[nombre]
    if (filas.length === 0) continue
    const almacen = almacenes[nombre]
    estado.enviado[nombre] ||= {}
    const resultado = fusionarRemotos(almacen.get(), almacen.borrados(), filas, estado.enviado[nombre])
    if (resultado.cambio) {
      almacen.setRemoto(resultado.local)
      bajados += filas.length
    }
    almacen.guardarBorrados(resultado.borrados)
    for (const f of filas) if (!estado.cursor[nombre] || f.actualizado > estado.cursor[nombre]) estado.cursor[nombre] = f.actualizado
  }

  // 3) Subir lo que cambió aquí
  const pendientes = []
  for (const nombre of nombres) {
    const almacen = almacenes[nombre]
    estado.enviado[nombre] ||= {}
    pendientesDeEnvio(almacen.get(), almacen.borrados(), estado.enviado[nombre]).forEach((f) =>
      pendientes.push({ ...f, coleccion: nombre }),
    )
  }
  for (let i = 0; i < pendientes.length; i += TAMANO_LOTE) {
    const lote = pendientes.slice(i, i + TAMANO_LOTE)
    await backend.subir(lote)
    lote.forEach((f) => (estado.enviado[f.coleccion][f.id] = f.t))
  }

  // 4) Las lápidas que la nube ya recibió no hace falta guardarlas
  for (const nombre of nombres) {
    const almacen = almacenes[nombre]
    almacen.guardarBorrados(almacen.borrados().filter((b) => (estado.enviado[nombre][b.id] || 0) < b._t))
  }

  return { subidos: pendientes.length, bajados }
}

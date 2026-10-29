// Motor de sincronización con la nube. No sabe nada de React ni de Supabase: recibe las colecciones
// y un "backend" con funciones (traer, subir y, opcionalmente, verificar), así se puede probar sin internet.
//
// Reglas:
//  - Cada registro tiene una marca de tiempo "_t". Si solo uno de los computadores lo cambió, gana ese cambio.
//  - Si los DOS lo cambiaron desde la última sincronización (por ejemplo, vendieron el mismo producto a la vez),
//    en las colecciones "mezclables" se combinan los cambios (el stock suma lo que hizo cada uno).
//    En las demás gana siempre el cambio más reciente.
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

// Une lo que llegó de la nube con lo que hay aquí. Modifica "enviado" (y "base", si se usa) con lo que la nube ya tiene.
//  opciones.base: { id: datos } la última versión que ambos computadores tenían (se actualiza aquí)
//  opciones.mezclar: (base, local, remoto, localMasNueva) => datos combinados
export function fusionarRemotos(local, borrados, filas, enviado, opciones = {}) {
  const { base = null, mezclar = null } = opciones
  const mapa = new Map(local.map((r) => [r.id, r]))
  const lapidas = new Map(borrados.map((b) => [b.id, b]))
  const nuevos = []
  let cambio = false

  for (const fila of filas) {
    const actual = mapa.get(fila.id)
    const lapida = lapidas.get(fila.id)
    const tLocal = actual ? actual._t || 1 : lapida ? lapida._t : 0
    const visto = enviado[fila.id] || 0

    // los dos lo cambiaron desde la última sincronización: se combinan los cambios
    if (mezclar && base && actual && !fila.borrado && (actual._t || 1) > visto && fila.t > visto && fila.t !== tLocal && base[fila.id]) {
      const { _t, ...datosLocal } = actual
      const mezclado = mezclar(base[fila.id], datosLocal, fila.data, tLocal >= fila.t)
      mapa.set(fila.id, { ...mezclado, _t: Math.max(tLocal, fila.t) + 1 }) // queda pendiente de subir
      base[fila.id] = fila.data // desde aquí lo "visto" es la versión de la nube
      enviado[fila.id] = fila.t
      lapidas.delete(fila.id)
      cambio = true
      continue
    }

    if (fila.t > tLocal) {
      if (fila.borrado) {
        if (actual) {
          mapa.delete(fila.id)
          cambio = true
        }
        if (base) delete base[fila.id]
      } else {
        const registro = { ...fila.data, _t: fila.t }
        if (actual) mapa.set(fila.id, registro)
        else nuevos.push(registro)
        if (base) base[fila.id] = fila.data
        cambio = true
      }
      lapidas.delete(fila.id)
      enviado[fila.id] = fila.t
    } else if (fila.t === tLocal) {
      enviado[fila.id] = fila.t // ya estamos iguales
      if (base && !fila.borrado) base[fila.id] = fila.data
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
//  - estado: { cursor, enviado, base }  (se va modificando)
//  - backend: { traer(coleccion, desde) -> filas, subir(filas), verificar?(coleccion, ids) -> [{id, t}] }
//  - mezclables: { coleccion: funcionDeMezcla } colecciones donde se combinan cambios simultáneos
export async function sincronizar({ backend, almacenes, estado, mezclables = {} }) {
  estado.cursor ||= {}
  estado.enviado ||= {}
  estado.base ||= {}
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
    const mezclar = mezclables[nombre] || null
    if (mezclar) estado.base[nombre] ||= {}
    const resultado = fusionarRemotos(almacen.get(), almacen.borrados(), filas, estado.enviado[nombre], {
      base: mezclar ? estado.base[nombre] : null,
      mezclar,
    })
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
  let reintentar = false
  for (let i = 0; i < pendientes.length; ) {
    // lotes de hasta 200 filas o ~1 MB (las fotos de facturas pesan)
    let peso = 0
    let fin = i
    while (fin < pendientes.length && fin - i < TAMANO_LOTE && (fin === i || peso < 1_000_000)) peso += JSON.stringify(pendientes[fin++]).length
    const lote = pendientes.slice(i, fin)
    i = fin
    await backend.subir(lote)

    // en las colecciones que se combinan, se comprueba que la nube aceptó lo subido: si otro computador
    // guardó algo más nuevo en ese instante, se deja pendiente para combinarlo en el siguiente ciclo
    const rechazados = new Set()
    if (backend.verificar) {
      for (const nombre of Object.keys(mezclables)) {
        const delLote = lote.filter((f) => f.coleccion === nombre)
        if (delLote.length === 0) continue
        const enNube = await backend.verificar(nombre, delLote.map((f) => f.id))
        for (const fila of enNube) {
          const subida = delLote.find((f) => f.id === fila.id)
          if (subida && fila.t > subida.t) rechazados.add(nombre + '|' + fila.id)
        }
      }
    }
    for (const f of lote) {
      if (rechazados.has(f.coleccion + '|' + f.id)) {
        reintentar = true
        continue
      }
      estado.enviado[f.coleccion][f.id] = f.t
      if (mezclables[f.coleccion]) {
        estado.base[f.coleccion] ||= {}
        if (f.borrado) delete estado.base[f.coleccion][f.id]
        else estado.base[f.coleccion][f.id] = f.data
      }
    }
  }

  // 4) Las lápidas que la nube ya recibió no hace falta guardarlas
  for (const nombre of nombres) {
    const almacen = almacenes[nombre]
    almacen.guardarBorrados(almacen.borrados().filter((b) => (estado.enviado[nombre][b.id] || 0) < b._t))
  }

  return { subidos: pendientes.length, bajados, reintentar }
}

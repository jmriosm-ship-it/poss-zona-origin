import { etiquetaVenta, itemsNetos } from './utils.js'

// Equipos (IMEI / serial) que figuran vendidos en más de una venta vigente.
// Puede pasar si dos cajas venden el mismo equipo antes de sincronizar: hay que revisarlo y anular una de las ventas.
export function imeisVendidosDosVeces(ventas) {
  const porImei = new Map()
  for (const v of ventas) {
    for (const i of itemsNetos(v)) {
      for (const m of i.imeis || []) {
        if (!porImei.has(m)) porImei.set(m, [])
        porImei.get(m).push({ id: v.id, etiqueta: etiquetaVenta(v), nombre: i.nombre })
      }
    }
  }
  return [...porImei.entries()].filter(([, lista]) => lista.length > 1).map(([imei, lista]) => ({ imei, ventas: lista }))
}

// Nombres de caja que usan dos computadores distintos (los números de ticket se podrían repetir)
export function cajasRepetidas(ventas) {
  const equipos = new Map()
  for (const v of ventas) {
    if (!v.equipo) continue
    const nombre = v.caja || 'Caja 1'
    if (!equipos.has(nombre)) equipos.set(nombre, new Set())
    equipos.get(nombre).add(v.equipo)
  }
  return [...equipos.entries()].filter(([, e]) => e.size > 1).map(([nombre]) => nombre)
}

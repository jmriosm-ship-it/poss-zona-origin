import { itemsNetos } from './utils.js'

const DIA = 864e5

// Inventario inteligente: mira lo vendido en los últimos 30 días y avisa qué se acabó, qué está bajo
// y qué se acabará pronto (menos de 7 días de venta), con una sugerencia de cuánto pedir para ~30 días.
export function analizarInventario(productos, ventas, ahora = Date.now()) {
  const desde = ahora - 30 * DIA
  const vendidas = new Map() // varianteId -> unidades vendidas en 30 días
  for (const v of ventas) {
    if (v.estado === 'anulada' || new Date(v.fecha).getTime() < desde) continue
    for (const i of itemsNetos(v)) vendidas.set(i.varianteId, (vendidas.get(i.varianteId) || 0) + i.cantidad)
  }

  const filas = []
  for (const p of productos) {
    for (const v of p.variantes) {
      const vend = vendidas.get(v.id) || 0
      const ritmo = vend / 30 // unidades por día
      const dias = ritmo > 0 ? v.stock / ritmo : null
      let nivel = null
      if (v.stock <= 0) nivel = 'agotado'
      else if (v.stock <= (v.minimo || 0)) nivel = 'bajo'
      else if (dias !== null && dias < 7) nivel = 'pronto'
      if (!nivel) continue
      // un producto agotado que nunca se vende no es urgente
      if (nivel === 'agotado' && vend === 0 && !(v.minimo > 0)) continue
      filas.push({
        productoId: p.id,
        nombre: p.nombre + ([v.talla, v.color].filter(Boolean).length ? ' · ' + [v.talla, v.color].filter(Boolean).join(' ') : ''),
        categoria: p.categoria,
        stock: v.stock,
        minimo: v.minimo || 0,
        vendidas30: vend,
        dias: dias === null ? null : Math.floor(dias),
        nivel,
        pedir: Math.max(Math.ceil(ritmo * 30) - v.stock, (v.minimo || 0) * 2 - v.stock, 1),
      })
    }
  }
  const orden = { agotado: 0, bajo: 1, pronto: 2 }
  return filas.sort((a, b) => orden[a.nivel] - orden[b.nivel] || b.vendidas30 - a.vendidas30)
}

export const TEXTO_NIVEL = { agotado: 'Agotado', bajo: 'Stock bajo', pronto: 'Se acaba pronto' }

// Historial de movimientos: junta en una sola lista todo lo que ha pasado en el negocio
// (ventas, devoluciones, anulaciones, compras, pagos, gastos y movimientos de caja), de lo más nuevo a lo más viejo.

export const TIPOS = {
  venta: 'Venta',
  devolucion: 'Devolución',
  anulacion: 'Anulación',
  compra: 'Compra',
  pagoProveedor: 'Pago a proveedor',
  abono: 'Abono de cliente',
  pagoCredito: 'Pago de crédito',
  gasto: 'Gasto',
  ingreso: 'Ingreso a caja',
  egreso: 'Egreso de caja',
  apertura: 'Apertura de caja',
  cierre: 'Cierre de caja',
}

export const GRUPOS = [
  ['todos', 'Todos'],
  ['ventas', 'Ventas'],
  ['compras', 'Compras y pagos'],
  ['cobros', 'Cobros'],
  ['gastos', 'Gastos'],
  ['caja', 'Caja'],
]

const GRUPO_DE = {
  venta: 'ventas',
  devolucion: 'ventas',
  anulacion: 'ventas',
  compra: 'compras',
  pagoProveedor: 'compras',
  abono: 'cobros',
  pagoCredito: 'cobros',
  gasto: 'gastos',
  ingreso: 'caja',
  egreso: 'caja',
  apertura: 'caja',
  cierre: 'caja',
}

// +1 = dinero que entra, -1 = dinero que sale, 0 = solo informa
const SIGNO_DE = { venta: 1, devolucion: -1, anulacion: -1, compra: 0, pagoProveedor: -1, abono: 1, pagoCredito: 1, gasto: -1, ingreso: 1, egreso: -1, apertura: 0, cierre: 0 }

const resumen = (items) => items.map((i) => `${i.cantidad} ${i.nombre}${i.detalle ? ' ' + i.detalle : ''}`).join(', ')

import { etiquetaNumero } from './utils.js'

export function construirMovimientos({ ventas, compras, abonos, creditos, gastos, movimientos, turnos, clientes }) {
  const lista = []
  const agregar = (tipo, id, fecha, detalle, valor, extra = {}) =>
    lista.push({ clave: tipo + ':' + id, tipo, grupo: GRUPO_DE[tipo], signo: SIGNO_DE[tipo], fecha, detalle, valor, ...extra })
  const nombreCliente = (id) => clientes.find((c) => c.id === id)?.nombre || 'Cliente'
  const num = (n, caja) => etiquetaNumero(n, caja)

  for (const v of ventas) {
    const anulada = v.estado === 'anulada'
    agregar('venta', v.id, v.fecha, `${num(v.numero, v.caja)} · ${resumen(v.items)}${v.clienteNombre ? ' · ' + v.clienteNombre : ''} · ${v.pagos.map((p) => p.medio).join(' + ')}`, v.total, {
      quien: [v.vendedorNombre, v.caja].filter(Boolean).join(' · '),
      numero: v.numero,
      estado: anulada ? 'Anulada' : '',
      ref: { tipo: 'venta', id: v.id },
    })
    if (anulada) agregar('anulacion', v.id, v.fechaAnulacion || v.fecha, `Se anuló la venta ${num(v.numero, v.caja)}`, v.total, { numero: v.numero, ref: { tipo: 'venta', id: v.id } })
    for (const d of v.devoluciones || []) {
      agregar('devolucion', d.id, d.fecha, `Venta ${num(v.numero, v.caja)} · ${resumen(d.items.map((i) => ({ ...i, nombre: v.items.find((x) => x.varianteId === i.varianteId)?.nombre || '', detalle: '' })))} · por ${d.medio}`, d.valor, {
        numero: v.numero,
        ref: { tipo: 'venta', id: v.id },
      })
    }
  }

  for (const c of compras) {
    agregar('compra', c.id, c.fecha, `${c.proveedor} · ${resumen(c.items)}`, c.total, { quien: '' })
    for (const p of c.pagos) agregar('pagoProveedor', p.id, p.fecha, `${c.proveedor} · ${p.medio}`, p.valor)
  }

  for (const a of abonos) agregar('abono', a.id, a.fecha, `${nombreCliente(a.clienteId)} · ${a.medio}`, a.valor)
  for (const c of creditos) {
    for (const p of c.pagos) agregar('pagoCredito', p.id, p.fecha, `${c.clienteNombre} · crédito de la venta ${c.ventaEtiqueta || num(c.ventaNumero)} · ${p.medio}`, p.valor)
  }
  for (const g of gastos) agregar('gasto', g.id, g.fecha, g.concepto && g.concepto !== g.categoria ? `${g.categoria} · ${g.concepto}` : g.categoria, g.valor)
  for (const m of movimientos) agregar(m.tipo === 'ingreso' ? 'ingreso' : 'egreso', m.id, m.fecha, m.motivo, m.valor)

  for (const t of turnos) {
    agregar('apertura', t.id, t.fechaApertura, 'Efectivo inicial', t.inicial, { ref: t.resumen ? { tipo: 'turno', id: t.id } : undefined })
    if (t.fechaCierre) {
      const dif = (t.contado || 0) - (t.esperado || 0)
      agregar('cierre', t.id, t.fechaCierre, `Esperado ${Math.round(t.esperado || 0).toLocaleString('es-CO')} · contado ${Math.round(t.contado || 0).toLocaleString('es-CO')} · ${dif === 0 ? 'cuadra' : dif > 0 ? 'sobran ' + dif : 'faltan ' + -dif}`, t.contado || 0, {
        ref: t.resumen ? { tipo: 'turno', id: t.id } : undefined,
      })
    }
  }

  return lista.sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0))
}

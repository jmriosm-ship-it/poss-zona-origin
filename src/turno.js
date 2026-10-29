import { cajaDe } from './utils.js'

// Cuentas de un turno de caja (desde que se abre hasta que se cierra, o hasta ahora si sigue abierta)
const suma = (lista, campo = 'valor') => lista.reduce((s, x) => s + x[campo], 0)

export function resumenTurno(turno, ventas, abonos, compras, movimientos, creditos = []) {
  const desde = turno.fechaApertura
  const hasta = turno.fechaCierre || '9999'
  const dentro = (fecha) => fecha >= desde && fecha <= hasta

  // cada caja (computador) cuenta solo lo suyo
  const mia = (x) => cajaDe(x) === cajaDe(turno)
  const delTurno = ventas.filter((v) => dentro(v.fecha) && mia(v))
  const vigentes = delTurno.filter((v) => v.estado !== 'anulada')
  const todasVigentes = ventas.filter((v) => v.estado !== 'anulada')

  const porMedio = { Efectivo: 0, Transferencia: 0, Tarjeta: 0, Fiado: 0 }
  for (const v of vigentes) for (const p of v.pagos) porMedio[p.medio] = (porMedio[p.medio] || 0) + p.valor

  const cambio = suma(vigentes, 'cambio')
  const efectivoVentas = porMedio.Efectivo - cambio
  porMedio.Efectivo = efectivoVentas // en el reporte, el efectivo es lo que realmente quedó (sin el cambio devuelto)
  const devoluciones = todasVigentes.flatMap((v) => v.devoluciones || []).filter((d) => dentro(d.fecha) && mia(d))
  const devEfectivo = suma(devoluciones.filter((d) => d.medio === 'Efectivo'))
  const pagosCredito = creditos.flatMap((c) => c.pagos)
  const abonosEfectivo = suma([...abonos, ...pagosCredito].filter((a) => dentro(a.fecha) && mia(a) && a.medio === 'Efectivo'))
  const pagoProveedores = suma(compras.flatMap((c) => c.pagos).filter((p) => dentro(p.fecha) && mia(p) && p.medio === 'Efectivo'))
  const movs = movimientos.filter((m) => dentro(m.fecha) && mia(m))
  const ingresos = suma(movs.filter((m) => m.tipo === 'ingreso'))
  const egresos = suma(movs.filter((m) => m.tipo === 'egreso'))
  const esperado = turno.inicial + efectivoVentas + abonosEfectivo - devEfectivo - pagoProveedores + ingresos - egresos

  const vendedores = {}
  for (const v of vigentes) {
    const n = v.vendedorNombre || 'Sin asignar'
    vendedores[n] ||= { ventas: 0, total: 0 }
    vendedores[n].ventas += 1
    vendedores[n].total += v.total
  }

  return {
    desde,
    inicial: turno.inicial,
    nVentas: vigentes.length,
    anuladas: delTurno.length - vigentes.length,
    unidades: vigentes.reduce((s, v) => s + v.items.reduce((a, i) => a + i.cantidad, 0), 0),
    vendido: suma(vigentes, 'total'),
    porMedio,
    efectivoVentas,
    devTotal: suma(devoluciones),
    devEfectivo,
    abonosEfectivo,
    pagoProveedores,
    ingresos,
    egresos,
    movs,
    esperado,
    vendedores: Object.entries(vendedores).map(([nombre, d]) => ({ nombre, ...d })),
  }
}

// Lo que se guarda al cerrar (sin las listas largas)
export const instantanea = ({ movs, ...resto }) => resto

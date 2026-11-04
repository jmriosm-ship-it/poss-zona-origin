import { costoVenta, enRango, itemsNetos, netoVenta, proporcionIntereses, valorFinanciera } from './utils.js'

const claveDia = (iso) => new Date(iso).toLocaleDateString('en-CA')

function acumular(mapa, clave, campos) {
  const fila = mapa.get(clave) || { nombre: clave, ingresos: 0, costos: 0, ventas: 0, cantidad: 0 }
  for (const [k, v] of Object.entries(campos)) fila[k] += v
  mapa.set(clave, fila)
}

// Resumen de ventas, costos y gastos dentro de un rango de fechas
export function calcular(ventas, gastos, rango, creditos = [], cobrosFin = []) {
  const vigentes = ventas.filter((v) => v.estado !== 'anulada' && enRango(v.fecha, rango))
  const dias = new Map()
  const categorias = new Map()
  const vendedores = new Map()
  const productos = new Map()
  let ingresos = 0
  let costos = 0
  let unidades = 0

  // Suma una parte de una venta: `cobrado` es la plata que entró y `fraccion` la parte del costo que se reconoce.
  // Las ventas normales cuentan completas el día de la venta. En las de financiera, la parte que paga la financiera
  // cuenta el día en que ella paga (cada pago, y la diferencia con la que se cierra).
  function contar(v, fecha, cobrado, fraccion, esVenta) {
    const factor = v.subtotal > 0 ? v.total / v.subtotal : 1
    const items = itemsNetos(v)
    const ing = netoVenta(v)
    const cos = costoVenta(v)
    const rIng = ing > 0 ? cobrado / ing : 0
    ingresos += cobrado
    costos += cos * fraccion
    if (esVenta) unidades += items.reduce((s, i) => s + i.cantidad, 0)
    acumular(dias, claveDia(fecha), { ingresos: cobrado, costos: cos * fraccion })
    acumular(vendedores, v.vendedorNombre || 'Sin asignar', { ingresos: cobrado, ventas: esVenta ? 1 : 0 })
    for (const i of items) {
      const ingItem = i.precio * i.cantidad * factor * rIng
      acumular(categorias, i.categoria || 'Sin categoría', { ingresos: ingItem, costos: i.costo * i.cantidad * fraccion, cantidad: esVenta ? i.cantidad : 0 })
      acumular(productos, i.nombre, { ingresos: ingItem, cantidad: esVenta ? i.cantidad : 0 })
    }
  }

  for (const v of vigentes) {
    const parteLocal = v.total > 0 ? (v.total - valorFinanciera(v)) / v.total : 1
    contar(v, v.fecha, netoVenta(v) * parteLocal, parteLocal, true)
  }
  const porId = new Map(ventas.map((v) => [v.id, v]))
  for (const e of cobrosFin) {
    const v = porId.get(e.ventaId)
    if (!v || v.estado === 'anulada' || !enRango(e.fecha, rango)) continue
    contar(v, e.fecha, e.tipo === 'ajuste' ? 0 : e.valor, v.total > 0 ? e.valor / v.total : 0, false)
  }

  const gastosRango = gastos.filter((g) => enRango(g.fecha, rango))
  const totalGastos = gastosRango.reduce((s, g) => s + g.valor, 0)
  const bruta = ingresos - costos
  // intereses de créditos: la parte de cada pago recibido en el período que corresponde a intereses
  const intereses = Math.round(
    creditos
      .filter((c) => c.estado !== 'cancelado')
      .reduce((s, c) => s + c.pagos.filter((p) => enRango(p.fecha, rango)).reduce((a, p) => a + p.valor, 0) * proporcionIntereses(c), 0),
  )

  return {
    ingresos,
    costos,
    bruta,
    gastos: totalGastos,
    gastosLista: gastosRango,
    intereses,
    neta: bruta + intereses - totalGastos,
    nVentas: vigentes.length,
    unidades,
    dias: [...dias.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([fecha, f]) => ({ ...f, fecha })),
    categorias: [...categorias.values()].map((c) => ({ ...c, ganancia: c.ingresos - c.costos })).sort((a, b) => b.ganancia - a.ganancia),
    vendedores: [...vendedores.values()].sort((a, b) => b.ingresos - a.ingresos),
    masVendidos: [...productos.values()].sort((a, b) => b.cantidad - a.cantidad).slice(0, 5),
  }
}

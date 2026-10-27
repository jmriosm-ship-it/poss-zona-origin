import { costoVenta, enRango, itemsNetos, netoVenta, proporcionIntereses } from './utils.js'

const claveDia = (iso) => new Date(iso).toLocaleDateString('en-CA')

function acumular(mapa, clave, campos) {
  const fila = mapa.get(clave) || { nombre: clave, ingresos: 0, costos: 0, ventas: 0, cantidad: 0 }
  for (const [k, v] of Object.entries(campos)) fila[k] += v
  mapa.set(clave, fila)
}

// Resumen de ventas, costos y gastos dentro de un rango de fechas
export function calcular(ventas, gastos, rango, creditos = []) {
  const vigentes = ventas.filter((v) => v.estado !== 'anulada' && enRango(v.fecha, rango))
  const dias = new Map()
  const categorias = new Map()
  const vendedores = new Map()
  const productos = new Map()
  let ingresos = 0
  let costos = 0
  let unidades = 0

  for (const v of vigentes) {
    const factor = v.subtotal > 0 ? v.total / v.subtotal : 1
    const items = itemsNetos(v)
    const ing = netoVenta(v)
    const cos = costoVenta(v)
    ingresos += ing
    costos += cos
    unidades += items.reduce((s, i) => s + i.cantidad, 0)
    acumular(dias, claveDia(v.fecha), { ingresos: ing, costos: cos })
    acumular(vendedores, v.vendedorNombre || 'Sin asignar', { ingresos: ing, ventas: 1 })
    for (const i of items) {
      acumular(categorias, i.categoria || 'Sin categoría', {
        ingresos: i.precio * i.cantidad * factor,
        costos: i.costo * i.cantidad,
        cantidad: i.cantidad,
      })
      acumular(productos, i.nombre, { ingresos: i.precio * i.cantidad * factor, cantidad: i.cantidad })
    }
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

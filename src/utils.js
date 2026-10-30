export const dinero = (n) => '$' + Math.round(n || 0).toLocaleString('es-CO')

export const nuevoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7)

export const fechaHora = (iso) => new Date(iso).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })
export const fechaLarga = (iso) => new Date(iso).toLocaleDateString('es-CO', { dateStyle: 'medium' })

// ---------- Ventas ----------
export function cantidadDevuelta(venta, varianteId) {
  return (venta.devoluciones || []).reduce(
    (s, d) => s + (d.items.find((i) => i.varianteId === varianteId)?.cantidad || 0),
    0,
  )
}

export const devuelto = (v) => (v.devoluciones || []).reduce((s, d) => s + d.valor, 0)

// Lo que realmente quedó de la venta (0 si se anuló, menos lo devuelto)
export const netoVenta = (v) => (v.estado === 'anulada' ? 0 : v.total - devuelto(v))

// IMEI / seriales de una línea que ya se devolvieron
export function imeisDevueltos(venta, varianteId) {
  return (venta.devoluciones || []).flatMap((d) => d.items.filter((i) => i.varianteId === varianteId).flatMap((i) => i.imeis || []))
}

// Unidades que siguen vendidas (sin las devueltas)
export function itemsNetos(v) {
  if (v.estado === 'anulada') return []
  return v.items
    .map((i) => {
      const cantidad = i.cantidad - cantidadDevuelta(v, i.varianteId)
      if (i.imeis?.length) {
        const dev = imeisDevueltos(v, i.varianteId)
        return { ...i, cantidad, imeis: i.imeis.filter((m) => !dev.includes(m)) }
      }
      return { ...i, cantidad }
    })
    .filter((i) => i.cantidad > 0)
}

// ---------- IMEI / serial ----------
export const normalizarSerial = (t) => String(t || '').replace(/\s+/g, '').toUpperCase()
export const serialValido = (s) => /^[A-Z0-9]{8,17}$/.test(s)

// Un IMEI de celular tiene 15 dígitos y el último es de control (algoritmo de Luhn)
export function imeiConDigitoValido(s) {
  if (!/^\d{15}$/.test(s)) return true // no es un IMEI de 15 dígitos (puede ser un serial): no aplica
  let suma = 0
  for (let i = 0; i < 15; i++) {
    let n = Number(s[14 - i])
    if (i % 2 === 1) {
      n *= 2
      if (n > 9) n -= 9
    }
    suma += n
  }
  return suma % 10 === 0
}

// Fecha hasta la que vale la garantía de una venta
export function vencimientoGarantia(fechaIso, dias) {
  const d = new Date(fechaIso)
  d.setDate(d.getDate() + dias)
  return d
}

export const costoVenta = (v) => itemsNetos(v).reduce((s, i) => s + i.costo * i.cantidad, 0)

// ---------- Compras y deudas ----------
export const pagadoCompra = (c) => c.pagos.reduce((s, p) => s + p.valor, 0)
export const saldoCompra = (c) => c.total - pagadoCompra(c)

// Lo que un cliente debe: ventas fiadas, menos devoluciones descontadas de la deuda, menos abonos
export function saldoCliente(clienteId, ventas, abonos) {
  const vigentes = ventas.filter((v) => v.estado !== 'anulada' && v.clienteId === clienteId)
  const fiado = vigentes.reduce((s, v) => s + v.pagos.filter((p) => p.medio === 'Fiado').reduce((a, p) => a + p.valor, 0), 0)
  const devueltoFiado = vigentes
    .flatMap((v) => v.devoluciones || [])
    .filter((d) => d.medio === 'Fiado')
    .reduce((s, d) => s + d.valor, 0)
  const abonado = abonos.filter((a) => a.clienteId === clienteId).reduce((s, a) => s + a.valor, 0)
  return fiado - devueltoFiado - abonado
}

// ---------- Fidelización ----------
export function puntosCliente(clienteId, ventas) {
  return ventas
    .filter((v) => v.estado !== 'anulada' && v.clienteId === clienteId)
    .reduce((s, v) => s + (v.puntosGanados || 0) - (v.puntosUsados || 0), 0)
}

// ---------- Promociones ----------
const hoyLocal = () => new Date().toLocaleDateString('en-CA')

// Mejor promoción activa para una línea del carrito
export function mejorPromo(item, promos) {
  const hoy = hoyLocal()
  let mejor = { valor: 0, nombre: '' }
  for (const p of promos) {
    if (!p.activa) continue
    if (p.desde && hoy < p.desde) continue
    if (p.hasta && hoy > p.hasta) continue
    const aplica =
      p.alcance === 'todo' ||
      (p.alcance === 'categoria' && (item.categoria || '').toLowerCase() === (p.objetivo || '').toLowerCase()) ||
      (p.alcance === 'producto' && item.productoId === p.objetivo)
    if (!aplica) continue
    let valor = 0
    if (p.tipo === 'porcentaje') valor = Math.round((item.precio * item.cantidad * p.valor) / 100)
    else if (p.tipo === 'nxm' && p.lleva > p.paga) valor = Math.floor(item.cantidad / p.lleva) * (p.lleva - p.paga) * item.precio
    if (valor > mejor.valor) mejor = { valor, nombre: p.nombre }
  }
  return mejor
}

// ---------- Períodos ----------
export function rangoPeriodo(clave, ref = new Date()) {
  const y = ref.getFullYear()
  const m = ref.getMonth()
  if (clave === 'hoy') return [new Date(y, m, ref.getDate()), new Date(y, m, ref.getDate() + 1)]
  if (clave === 'mes') return [new Date(y, m, 1), new Date(y, m + 1, 1)]
  if (clave === 'mesPasado') return [new Date(y, m - 1, 1), new Date(y, m, 1)]
  return [new Date(0), new Date(8.64e15)]
}

export const enRango = (iso, [desde, hasta]) => {
  const t = new Date(iso).getTime()
  return t >= desde.getTime() && t < hasta.getTime()
}

export const PERIODOS = [
  ['hoy', 'Hoy'],
  ['mes', 'Este mes'],
  ['mesPasado', 'Mes pasado'],
  ['todo', 'Todo'],
]

// ---------- Créditos (ventas financiadas en cuotas) ----------
export const listaNumeros = (texto) =>
  String(texto ?? '')
    .split(/[,;\s]+/)
    .map((n) => Number(n.replace(',', '.')))
    .filter((n) => Number.isFinite(n) && n >= 0)

const dosDigitos = (n) => String(n).padStart(2, '0')
export const aFechaISO = (d) => `${d.getFullYear()}-${dosDigitos(d.getMonth() + 1)}-${dosDigitos(d.getDate())}`

// Suma meses a una fecha "AAAA-MM-DD" respetando el fin de mes (31 de enero + 1 mes = 28 o 29 de febrero)
export function sumarMeses(fechaISO, meses) {
  const [y, m, dia] = fechaISO.split('-').map(Number)
  const destino = new Date(y, m - 1 + meses, 1)
  const ultimo = new Date(destino.getFullYear(), destino.getMonth() + 1, 0).getDate()
  destino.setDate(Math.min(dia, ultimo))
  return aFechaISO(destino)
}

// Suma días a una fecha "AAAA-MM-DD"
export function sumarDias(fechaISO, dias) {
  const [y, m, d] = fechaISO.split('-').map(Number)
  return aFechaISO(new Date(y, m - 1, d + dias))
}

// El interés se anota como % mensual; en cuotas quincenales cada quincena cobra la mitad
export const esQuincenal = (frecuencia) => frecuencia === 'quincenal'
const tasaPorCuota = (tasaPct, frecuencia) => (esQuincenal(frecuencia) ? tasaPct / 2 : tasaPct)

// Cuota fija (sistema francés), igual que el simulador de la página web; mensual o quincenal
export function calcularCuota(financiado, plazo, tasaPct, frecuencia = 'mensual') {
  const i = tasaPorCuota(tasaPct, frecuencia) / 100
  const cuota = i > 0 ? (financiado * i) / (1 - (1 + i) ** -plazo) : financiado / plazo
  return Math.round(cuota)
}

// Calendario de cuotas: la última se ajusta para que la suma sea exacta
export function armarCuotas(financiado, plazo, tasaPct, primeraFecha, frecuencia = 'mensual') {
  const cuota = calcularCuota(financiado, plazo, tasaPct, frecuencia)
  const total = cuota * plazo
  return {
    cuotaValor: cuota,
    totalCredito: total,
    intereses: total - financiado,
    cuotas: Array.from({ length: plazo }, (_, k) => ({ n: k + 1, vence: esQuincenal(frecuencia) ? sumarDias(primeraFecha, 15 * k) : sumarMeses(primeraFecha, k), valor: k === plazo - 1 ? total - cuota * (plazo - 1) : cuota })),
  }
}

// Estado de un crédito: cuánto se ha pagado, qué cuotas están cubiertas, mora y próxima cuota
export function resumenCredito(c, hoy = new Date()) {
  const pagado = c.pagos.reduce((s, p) => s + p.valor, 0)
  const saldo = c.totalCredito - pagado
  let resto = pagado
  const detalle = c.cuotas.map((q) => {
    const aplica = Math.min(resto, q.valor)
    resto -= aplica
    return { ...q, pagado: aplica, pendiente: q.valor - aplica }
  })
  const hoyStr = aFechaISO(hoy)
  const vencidas = detalle.filter((q) => q.pendiente > 0 && q.vence < hoyStr)
  const mora = vencidas.reduce((s, q) => s + q.pendiente, 0)
  const diasMora = vencidas.length ? Math.floor((new Date(hoyStr) - new Date(vencidas[0].vence)) / 864e5) : 0
  const proxima = detalle.find((q) => q.pendiente > 0) || null
  const estado = c.estado === 'cancelado' ? 'cancelado' : saldo <= 0 ? 'pagado' : mora > 0 ? 'mora' : 'al día'
  return { pagado, saldo: Math.max(0, saldo), detalle, vencidas, mora, diasMora, proxima, estado }
}

// Parte de lo cobrado que son intereses (así la ganancia suma los intereses a medida que se pagan)
export const proporcionIntereses = (c) => (c.totalCredito > 0 ? c.intereses / c.totalCredito : 0)

export const esHoyISO = (iso) => new Date(iso).toDateString() === new Date().toDateString()

// ---------- Varias cajas (un computador por caja) ----------
// Las ventas y movimientos antiguos no traen caja: cuentan como "Caja 1"
export const cajaDe = (x) => (x && x.caja) || 'Caja 1'

// "Caja 1" -> "C1", "Caja 2" -> "C2", "Caja Principal" -> "CP"
export const prefijoCaja = (nombre) =>
  String(nombre || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (/^\d+$/.test(w) ? w : w[0]))
    .join('')
    .toUpperCase() || 'C'

// Número de ticket único aunque dos cajas vendan a la vez: "C1-00005" y "C2-00005" son ventas distintas
export const etiquetaNumero = (numero, caja) => (caja ? prefijoCaja(caja) + '-' : '#') + String(numero || 0).padStart(5, '0')
export const etiquetaVenta = (v) => etiquetaNumero(v.numero, v.caja)

// Siguiente número de ticket de una caja (cada caja cuenta por separado)
export const siguienteNumero = (ventas, caja) =>
  ventas.filter((v) => (v.caja || '') === (caja || '')).reduce((m, v) => Math.max(m, v.numero), 0) + 1

import { useSyncExternalStore } from 'react'
import { etiquetaVenta, nuevoId, siguienteNumero } from './utils.js'
import { idEquipo, nombreCajaActual } from './equipo.js'
import { CATEGORIAS_BASE } from './categorias.js'

export { cantidadDevuelta } from './utils.js'

const BORRADOS = 'zo_borrados_'

function leerJson(clave, porDefecto, almacenamiento) {
  try {
    const texto = almacenamiento.getItem(clave)
    return texto ? JSON.parse(texto) : porDefecto
  } catch {
    return porDefecto
  }
}

function guardarJson(clave, valor, almacenamiento) {
  try {
    almacenamiento.setItem(clave, JSON.stringify(valor))
  } catch {
    /* sin espacio o bloqueado: sigue en memoria */
  }
}

const sinMarca = (registro) => {
  const { _t, ...resto } = registro
  return JSON.stringify(resto)
}

// Compara la lista anterior con la nueva: sella con la hora los registros nuevos o cambiados
// y anota los que se borraron. Con eso la nube sabe qué es nuevo y qué versión gana.
export function marcarCambios(antes, despues, borrados, ahora = Date.now()) {
  if (antes === despues) return { lista: despues, borrados }
  const previos = new Map(antes.map((r) => [r.id, r]))
  const presentes = new Set()

  const lista = despues.map((registro) => {
    presentes.add(registro.id)
    const previo = previos.get(registro.id)
    if (previo === registro) return registro
    // mismo contenido, solo cambió el objeto: se conserva la marca de antes
    if (previo && sinMarca(previo) === sinMarca(registro)) return { ...registro, _t: previo._t }
    return { ...registro, _t: ahora }
  })

  let nuevosBorrados = borrados.filter((b) => !presentes.has(b.id))
  for (const previo of antes) {
    if (!presentes.has(previo.id)) {
      nuevosBorrados = [...nuevosBorrados.filter((b) => b.id !== previo.id), { id: previo.id, _t: ahora }]
    }
  }
  return { lista, borrados: nuevosBorrados }
}

// Guarda una lista (o un objeto) en localStorage y avisa a las pantallas cuando cambia.
// Las listas llevan marcas de tiempo y lápidas de borrado para poder sincronizarse con la nube.
export function crearAlmacen(clave, inicial, almacenamiento = globalThis.localStorage) {
  const lista = Array.isArray(inicial)
  let datos = leerJson(clave, null, almacenamiento)
  if (datos === null || typeof datos !== 'object' || Array.isArray(datos) !== lista) datos = inicial
  else if (!lista) datos = { ...inicial, ...datos }
  const oyentes = new Set()
  const avisar = () => oyentes.forEach((f) => f())

  const almacen = {
    leer: () => datos,
    // cambio hecho por la persona: se sella con la hora y se anotan los borrados
    set(nuevo) {
      if (lista) {
        const r = marcarCambios(datos, nuevo, leerJson(BORRADOS + clave, [], almacenamiento))
        datos = r.lista
        guardarJson(BORRADOS + clave, r.borrados, almacenamiento)
      } else datos = nuevo
      guardarJson(clave, datos, almacenamiento)
      avisar()
    },
    // cambio que viene de la nube: se guarda tal cual, sin sellarlo como cambio local
    setRemoto(nuevo) {
      datos = nuevo
      guardarJson(clave, datos, almacenamiento)
      avisar()
    },
    borrados: () => (lista ? leerJson(BORRADOS + clave, [], almacenamiento) : []),
    guardarBorrados: (l) => lista && guardarJson(BORRADOS + clave, l, almacenamiento),
    suscribir(f) {
      oyentes.add(f)
      return () => oyentes.delete(f)
    },
  }
  // nombres que usa el motor de sincronización
  almacen.get = almacen.leer
  almacen.subscribe = almacen.suscribir
  return almacen
}

const hook = (almacen) => () => useSyncExternalStore(almacen.suscribir, almacen.leer)
const ahora = () => new Date().toISOString()
const agregar = (almacen, fila) => almacen.set([{ id: nuevoId(), fecha: ahora(), caja: nombreCajaActual(), ...fila }, ...almacen.leer()])
const guardarEn = (almacen, fila) => {
  const lista = almacen.leer()
  almacen.set(lista.some((x) => x.id === fila.id) ? lista.map((x) => (x.id === fila.id ? fila : x)) : [fila, ...lista])
}
const quitarDe = (almacen, id) => almacen.set(almacen.leer().filter((x) => x.id !== id))

// Registro de acciones: quién hizo qué y cuándo (lo ve el administrador en Configuración → Registro)
let actor = null
export const fijarActor = (u) => {
  actor = u ? { id: u.id, nombre: u.nombre } : null
}
export function registrarAccion(accion, detalle = '') {
  almacenAuditoria.set([{ id: nuevoId(), fecha: ahora(), caja: nombreCajaActual(), usuarioId: actor?.id || '', usuario: actor?.nombre || 'Sistema', accion, detalle }, ...almacenAuditoria.leer()])
}

export const CONFIG_BASE = {
  negocio: 'Zona Originals',
  nit: '',
  // Datos del titular que van en los documentos legales (se completan en Configuración → Negocio)
  titular: '',
  identificacion: '',
  correoContacto: '',
  whatsapp: '573142757163',
  ciudad: 'Ocaña, Norte de Santander, Colombia',
  sonidoLector: true, // pitido al leer con la pistola de códigos
  categorias: [...CATEGORIAS_BASE], // categorías permanentes, en el orden en que se muestran
  legalAceptado: null, // { version, fecha, por }: quién aceptó los términos y cuándo
  direccion: 'Cra. 12 # 11-34, Plaza Real, Ocaña',
  telefono: '3142757163',
  mensajeRecibo: '¡Gracias por tu compra!',
  // Texto de garantía que sale en el recibo de los equipos con garantía
  garantiaTexto:
    'La garantía cubre mal funcionamiento del equipo y de la batería con buen uso. No cubre daños de pantalla, humedad, golpes, daños físicos ni equipos abiertos.',
  puntosPorMil: 0.1, // puntos que gana el cliente por cada $1.000 comprados (con valorPunto 100 equivale al 1%)
  valorPunto: 100, // pesos que vale cada punto al usarlo
  // Créditos en cuotas (como el simulador de la página web)
  creditoTasas: '1, 2', // intereses mensuales (%) que se ofrecen
  creditoPlazos: '6, 12, 18, 24, 36', // plazos en meses
  creditoInicialMin: 30, // cuota inicial mínima (% del valor de la venta)
  tasaMaximaMensual: '', // tope legal mensual (%) según la tasa de usura vigente; vacío = sin tope
}

export const almacenProductos = crearAlmacen('zo_productos', [])
export const almacenVentas = crearAlmacen('zo_ventas', [])
export const almacenTurnos = crearAlmacen('zo_turnos', [])
export const almacenMovimientos = crearAlmacen('zo_movimientos', [])
export const almacenClientes = crearAlmacen('zo_clientes', [])
export const almacenAbonos = crearAlmacen('zo_abonos', [])
export const almacenCompras = crearAlmacen('zo_compras', [])
export const almacenGastos = crearAlmacen('zo_gastos', [])
export const almacenPromos = crearAlmacen('zo_promos', [])
export const almacenCreditos = crearAlmacen('zo_creditos', [])
export const almacenUsuarios = crearAlmacen('zo_usuarios', [])
export const almacenFacturas = crearAlmacen('zo_facturas', [])
export const almacenAuditoria = crearAlmacen('zo_auditoria', [])
export const almacenNomina = crearAlmacen('zo_nomina', [])
export const almacenConfig = crearAlmacen('zo_config', CONFIG_BASE)

export const useProductos = hook(almacenProductos)
export const useVentas = hook(almacenVentas)
export const useTurnos = hook(almacenTurnos)
export const useMovimientos = hook(almacenMovimientos)
export const useClientes = hook(almacenClientes)
export const useAbonos = hook(almacenAbonos)
export const useCompras = hook(almacenCompras)
export const useGastos = hook(almacenGastos)
export const usePromos = hook(almacenPromos)
export const useCreditos = hook(almacenCreditos)
export const useUsuarios = hook(almacenUsuarios)
export const useFacturas = hook(almacenFacturas)
export const useAuditoria = hook(almacenAuditoria)
export const useNomina = hook(almacenNomina)
export const useConfig = hook(almacenConfig)

// ---------- Productos ----------
export const guardarProducto = (p) => guardarEn(almacenProductos, p)
export function borrarProducto(id) {
  registrarAccion('Borró un producto', almacenProductos.leer().find((p) => p.id === id)?.nombre || '')
  quitarDe(almacenProductos, id)
}
export const reemplazarProductos = (lista) => almacenProductos.set(lista)

// ---------- Ventas ----------
// Sube (+1) o baja (-1) el stock. Si la línea trae IMEI/seriales, se sacan o se devuelven esas unidades exactas.
function sumarStock(items, signo) {
  almacenProductos.set(
    almacenProductos.leer().map((p) => ({
      ...p,
      variantes: p.variantes.map((v) => {
        const it = items.find((i) => i.varianteId === v.id)
        if (!it) return v
        if (it.imeis?.length) {
          const imeis =
            signo < 0 ? (v.imeis || []).filter((m) => !it.imeis.includes(m)) : [...(v.imeis || []), ...it.imeis.filter((m) => !(v.imeis || []).includes(m))]
          return { ...v, imeis, stock: imeis.length }
        }
        return { ...v, stock: Math.max(0, v.stock + signo * it.cantidad) }
      }),
    })),
  )
}

// Guarda la venta con su número consecutivo y descuenta el stock de cada variante vendida
export function registrarVenta(datos) {
  const ventas = almacenVentas.leer()
  const caja = nombreCajaActual()
  const numero = siguienteNumero(ventas, caja)
  const venta = { ...datos, id: nuevoId(), caja, equipo: idEquipo(), numero, fecha: ahora() }
  sumarStock(venta.items, -1)
  almacenVentas.set([venta, ...ventas])
  return venta
}

// Devuelve unidades al inventario y calcula el reembolso (con el descuento proporcional de la venta)
export function devolverItems(ventaId, items, medio) {
  const ventas = almacenVentas.leer()
  const venta = ventas.find((v) => v.id === ventaId)
  if (!venta || venta.estado === 'anulada') return
  registrarAccion('Hizo una devolución', etiquetaVenta(venta) + ' · ' + items.reduce((s, i) => s + i.cantidad, 0) + ' unidad(es)')
  const factor = venta.subtotal > 0 ? venta.total / venta.subtotal : 1
  const bruto = items.reduce((s, it) => s + venta.items.find((i) => i.varianteId === it.varianteId).precio * it.cantidad, 0)
  const devolucion = { id: nuevoId(), fecha: ahora(), caja: nombreCajaActual(), items, valor: Math.round(bruto * factor), medio }
  sumarStock(items, 1)
  almacenVentas.set(ventas.map((v) => (v.id === ventaId ? { ...v, devoluciones: [devolucion, ...(v.devoluciones || [])] } : v)))
}

// Anula la venta: las unidades que no se habían devuelto vuelven al inventario
export function anularVenta(ventaId) {
  const ventas = almacenVentas.leer()
  const venta = ventas.find((v) => v.id === ventaId)
  if (!venta || venta.estado === 'anulada') return
  registrarAccion('Anuló una venta', etiquetaVenta(venta) + ' · $' + venta.total)
  const pendientes = venta.items
    .map((i) => {
      const dev = (venta.devoluciones || []).flatMap((d) => d.items.filter((x) => x.varianteId === i.varianteId))
      return {
        varianteId: i.varianteId,
        cantidad: i.cantidad - dev.reduce((s, x) => s + x.cantidad, 0),
        imeis: (i.imeis || []).filter((m) => !dev.some((x) => (x.imeis || []).includes(m))),
      }
    })
    .filter((i) => i.cantidad > 0)
  sumarStock(pendientes, 1)
  almacenVentas.set(ventas.map((v) => (v.id === ventaId ? { ...v, estado: 'anulada', fechaAnulacion: ahora() } : v)))
  // si la venta era a crédito, el crédito se cancela (lo que ya pagó el cliente hay que devolverlo aparte)
  almacenCreditos.set(almacenCreditos.leer().map((c) => (c.ventaId === ventaId ? { ...c, estado: 'cancelado' } : c)))
}

// ---------- Caja del día ----------
export const abrirCaja = (inicial, usuario) => {
  registrarAccion('Abrió la caja', 'Base $' + inicial)
  return agregar(almacenTurnos, { fechaApertura: ahora(), inicial, ...(usuario ? { abrioId: usuario.id, abrioPor: usuario.nombre } : {}) })
}
export function cerrarCaja(id, datos, usuario) {
  registrarAccion('Cerró la caja', 'Esperado $' + datos.esperado + ' · contado $' + datos.contado)
  const quien = usuario ? { cerroId: usuario.id, cerroPor: usuario.nombre } : {}
  almacenTurnos.set(almacenTurnos.leer().map((t) => (t.id === id ? { ...t, ...datos, ...quien, fechaCierre: ahora() } : t)))
}
export const registrarMovimiento = (m) => agregar(almacenMovimientos, m)

// ---------- Clientes y abonos ----------
export const guardarCliente = (c) => guardarEn(almacenClientes, c)
// Borrar un cliente (derecho de supresión): se quita su ficha y su nombre de las ventas anteriores.
// Los valores de las ventas se conservan porque la ley exige conservar la contabilidad.
export function borrarCliente(id) {
  registrarAccion('Borró un cliente', almacenClientes.leer().find((c) => c.id === id)?.nombre || '')
  quitarDe(almacenClientes, id)
  almacenFacturas.set(almacenFacturas.leer().filter((f) => f.clienteId !== id))
  almacenVentas.set(almacenVentas.leer().map((v) => (v.clienteId === id ? { ...v, clienteNombre: 'Cliente eliminado' } : v)))
}
export const registrarAbono = (a) => agregar(almacenAbonos, a)

// ---------- Compras ----------
// Compra de mercancía: sube el stock, actualiza el costo y guarda el primer pago (si lo hubo)
export function registrarCompra(datos) {
  const fecha = ahora()
  almacenProductos.set(
    almacenProductos.leer().map((p) => {
      const propios = datos.items.filter((i) => i.productoId === p.id)
      if (!propios.length) return p
      return {
        ...p,
        costo: propios[propios.length - 1].costo,
        variantes: p.variantes.map((v) => {
          const its = propios.filter((i) => i.varianteId === v.id)
          if (!its.length) return v
          const nuevos = its.flatMap((i) => i.imeis || [])
          if (nuevos.length) {
            const imeis = [...(v.imeis || []), ...nuevos.filter((m) => !(v.imeis || []).includes(m))]
            return { ...v, imeis, stock: imeis.length }
          }
          return { ...v, stock: v.stock + its.reduce((s, i) => s + i.cantidad, 0) }
        }),
      }
    }),
  )
  almacenCompras.set([
    {
      id: nuevoId(),
      fecha,
      proveedor: datos.proveedor,
      items: datos.items,
      total: datos.total,
      pagos: datos.pagado > 0 ? [{ id: nuevoId(), fecha, caja: nombreCajaActual(), valor: datos.pagado, medio: datos.medio }] : [],
    },
    ...almacenCompras.leer(),
  ])
}

export function abonarCompra(compraId, valor, medio) {
  almacenCompras.set(
    almacenCompras
      .leer()
      .map((c) => (c.id === compraId ? { ...c, pagos: [...c.pagos, { id: nuevoId(), fecha: ahora(), caja: nombreCajaActual(), valor, medio }] } : c)),
  )
}

// ---------- Gastos, promociones, usuarios, configuración ----------
// ---------- Créditos ----------
// Crea el crédito de una venta financiada. "datos" trae lo calculado (cuotas, tasa, plazo, valores) y los datos del cliente.
export function registrarCredito(venta, datos) {
  const credito = {
    id: nuevoId(),
    fecha: ahora(),
    ventaId: venta.id,
    ventaNumero: venta.numero,
    ventaEtiqueta: etiquetaVenta(venta),
    descripcion: venta.items.map((i) => `${i.cantidad} ${i.nombre}${i.detalle ? ' ' + i.detalle : ''}`).join(', '),
    imeis: venta.items.flatMap((i) => i.imeis || []),
    precio: venta.total,
    pagos: [],
    estado: 'activo',
    ...datos,
  }
  almacenCreditos.set([credito, ...almacenCreditos.leer()])
  return credito
}

// Pago a un crédito: se aplica a las cuotas en orden, de la más vieja a la más nueva
export function pagarCredito(id, valor, medio) {
  almacenCreditos.set(
    almacenCreditos.leer().map((c) => (c.id === id ? { ...c, pagos: [...c.pagos, { id: nuevoId(), fecha: ahora(), caja: nombreCajaActual(), valor, medio }] } : c)),
  )
}

export function cancelarCredito(id) {
  almacenCreditos.set(almacenCreditos.leer().map((c) => (c.id === id ? { ...c, estado: 'cancelado' } : c)))
}

export function registrarGasto(g) {
  registrarAccion('Registró un gasto', g.concepto + ' · $' + g.valor)
  return agregar(almacenGastos, g)
}
export function borrarGasto(id) {
  const g = almacenGastos.leer().find((x) => x.id === id)
  registrarAccion('Borró un gasto', g ? g.concepto + ' · $' + g.valor : '')
  quitarDe(almacenGastos, id)
}
export const guardarPromo = (p) => guardarEn(almacenPromos, p)
export const borrarPromo = (id) => quitarDe(almacenPromos, id)
export function guardarUsuario(u) {
  registrarAccion(almacenUsuarios.leer().some((x) => x.id === u.id) ? 'Cambió un usuario' : 'Creó un usuario', u.nombre)
  guardarEn(almacenUsuarios, u)
}
export const guardarFactura = (f) => guardarEn(almacenFacturas, f)
// la factura no se pierde: queda en la papelera y el administrador la puede recuperar
export function borrarFactura(id) {
  registrarAccion('Mandó una factura a la papelera', almacenFacturas.leer().find((f) => f.id === id)?.clienteNombre || '')
  almacenFacturas.set(almacenFacturas.leer().map((f) => (f.id === id ? { ...f, eliminada: true, fechaEliminada: ahora() } : f)))
}
export const restaurarFactura = (id) =>
  almacenFacturas.set(
    almacenFacturas.leer().map((f) => {
      if (f.id !== id) return f
      const { eliminada, fechaEliminada, ...resto } = f
      return resto
    }),
  )
export function borrarUsuario(id) {
  registrarAccion('Borró un usuario', almacenUsuarios.leer().find((u) => u.id === id)?.nombre || '')
  quitarDe(almacenUsuarios, id)
}
// ---------- Cupo y pagos de trabajadores ----------
export function registrarConsumo(usuario, concepto, valor) {
  registrarAccion('Registró consumo de trabajador', usuario.nombre + ' · ' + concepto + ' · $' + valor)
  return agregar(almacenNomina, { tipo: 'consumo', usuarioId: usuario.id, usuarioNombre: usuario.nombre, concepto, valor })
}
export function anularConsumo(id) {
  registrarAccion('Anuló un consumo de trabajador')
  almacenNomina.set(almacenNomina.leer().map((r) => (r.id === id ? { ...r, anulado: true } : r)))
}
// Pago del sueldo: descuenta lo que el trabajador consumió y anota el pago como gasto de nómina
export function registrarPagoSueldo({ usuario, sueldo, descuento, periodo, nota, dias, valorDia }) {
  const neto = sueldo - descuento
  registrarAccion('Pagó sueldo', usuario.nombre + ' · neto $' + neto + (descuento ? ' (descuento $' + descuento + ')' : ''))
  agregar(almacenNomina, { tipo: 'pago', usuarioId: usuario.id, usuarioNombre: usuario.nombre, sueldo, descuento, neto, valor: neto, periodo, nota, ...(dias ? { dias, valorDia } : {}) })
  if (neto > 0) registrarGasto({ categoria: 'Nómina', concepto: 'Sueldo ' + usuario.nombre + (periodo ? ' · ' + periodo : ''), valor: neto })
}

export const guardarConfig = (parcial) => almacenConfig.set({ ...almacenConfig.leer(), ...parcial, _t: Date.now() })

// Colecciones que se sincronizan con la nube. La configuración es un solo registro con id "config".
export const almacenesNube = {
  productos: almacenProductos,
  ventas: almacenVentas,
  turnos: almacenTurnos,
  movimientos: almacenMovimientos,
  clientes: almacenClientes,
  abonos: almacenAbonos,
  compras: almacenCompras,
  gastos: almacenGastos,
  creditos: almacenCreditos,
  promos: almacenPromos,
  usuarios: almacenUsuarios,
  facturas: almacenFacturas,
  auditoria: almacenAuditoria,
  nomina: almacenNomina,
  config: {
    get: () => {
      const c = almacenConfig.leer()
      return [{ ...c, id: 'config', _t: c._t || 1 }]
    },
    borrados: () => [],
    guardarBorrados: () => {},
    setRemoto: (filas) => {
      const fila = filas.find((f) => f.id === 'config')
      if (!fila) return
      const { id, ...resto } = fila
      almacenConfig.setRemoto({ ...CONFIG_BASE, ...resto })
    },
    subscribe: almacenConfig.suscribir,
  },
}

// ---------- Copia de seguridad ----------
const TODOS = {
  productos: almacenProductos,
  ventas: almacenVentas,
  turnos: almacenTurnos,
  movimientos: almacenMovimientos,
  clientes: almacenClientes,
  abonos: almacenAbonos,
  compras: almacenCompras,
  gastos: almacenGastos,
  creditos: almacenCreditos,
  promos: almacenPromos,
  usuarios: almacenUsuarios,
  facturas: almacenFacturas,
  auditoria: almacenAuditoria,
  nomina: almacenNomina,
  config: almacenConfig,
}

export function exportarTodo() {
  return {
    app: 'zona-originals-pos',
    version: 1,
    fecha: ahora(),
    datos: Object.fromEntries(Object.entries(TODOS).map(([k, a]) => [k, a.leer()])),
  }
}

export function importarTodo(copia) {
  if (copia?.app !== 'zona-originals-pos' || typeof copia.datos !== 'object') throw new Error('Archivo no válido')
  for (const [k, almacen] of Object.entries(TODOS)) {
    const valor = copia.datos[k]
    if (valor !== undefined) almacen.set(k === 'config' ? { ...CONFIG_BASE, ...valor, _t: Date.now() } : valor)
  }
}

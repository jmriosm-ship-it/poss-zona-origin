import { useSyncExternalStore } from 'react'
import { nuevoId } from './utils.js'

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
const agregar = (almacen, fila) => almacen.set([{ id: nuevoId(), fecha: ahora(), ...fila }, ...almacen.leer()])
const guardarEn = (almacen, fila) => {
  const lista = almacen.leer()
  almacen.set(lista.some((x) => x.id === fila.id) ? lista.map((x) => (x.id === fila.id ? fila : x)) : [fila, ...lista])
}
const quitarDe = (almacen, id) => almacen.set(almacen.leer().filter((x) => x.id !== id))

export const CONFIG_BASE = {
  negocio: 'Zona Originals',
  nit: '',
  // Datos del titular que van en los documentos legales (se completan en Configuración → Negocio)
  titular: '',
  identificacion: '',
  correoContacto: '',
  whatsapp: '573142757163',
  ciudad: 'Ocaña, Norte de Santander, Colombia',
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
export const useConfig = hook(almacenConfig)

// ---------- Productos ----------
export const guardarProducto = (p) => guardarEn(almacenProductos, p)
export const borrarProducto = (id) => quitarDe(almacenProductos, id)
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
  const numero = ventas.reduce((m, v) => Math.max(m, v.numero), 0) + 1
  const venta = { ...datos, id: nuevoId(), numero, fecha: ahora() }
  sumarStock(venta.items, -1)
  almacenVentas.set([venta, ...ventas])
  return venta
}

// Devuelve unidades al inventario y calcula el reembolso (con el descuento proporcional de la venta)
export function devolverItems(ventaId, items, medio) {
  const ventas = almacenVentas.leer()
  const venta = ventas.find((v) => v.id === ventaId)
  if (!venta || venta.estado === 'anulada') return
  const factor = venta.subtotal > 0 ? venta.total / venta.subtotal : 1
  const bruto = items.reduce((s, it) => s + venta.items.find((i) => i.varianteId === it.varianteId).precio * it.cantidad, 0)
  const devolucion = { id: nuevoId(), fecha: ahora(), items, valor: Math.round(bruto * factor), medio }
  sumarStock(items, 1)
  almacenVentas.set(ventas.map((v) => (v.id === ventaId ? { ...v, devoluciones: [devolucion, ...(v.devoluciones || [])] } : v)))
}

// Anula la venta: las unidades que no se habían devuelto vuelven al inventario
export function anularVenta(ventaId) {
  const ventas = almacenVentas.leer()
  const venta = ventas.find((v) => v.id === ventaId)
  if (!venta || venta.estado === 'anulada') return
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
export const abrirCaja = (inicial) => agregar(almacenTurnos, { fechaApertura: ahora(), inicial })
export function cerrarCaja(id, datos) {
  almacenTurnos.set(almacenTurnos.leer().map((t) => (t.id === id ? { ...t, ...datos, fechaCierre: ahora() } : t)))
}
export const registrarMovimiento = (m) => agregar(almacenMovimientos, m)

// ---------- Clientes y abonos ----------
export const guardarCliente = (c) => guardarEn(almacenClientes, c)
// Borrar un cliente (derecho de supresión): se quita su ficha y su nombre de las ventas anteriores.
// Los valores de las ventas se conservan porque la ley exige conservar la contabilidad.
export function borrarCliente(id) {
  quitarDe(almacenClientes, id)
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
      pagos: datos.pagado > 0 ? [{ id: nuevoId(), fecha, valor: datos.pagado, medio: datos.medio }] : [],
    },
    ...almacenCompras.leer(),
  ])
}

export function abonarCompra(compraId, valor, medio) {
  almacenCompras.set(
    almacenCompras
      .leer()
      .map((c) => (c.id === compraId ? { ...c, pagos: [...c.pagos, { id: nuevoId(), fecha: ahora(), valor, medio }] } : c)),
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
    almacenCreditos.leer().map((c) => (c.id === id ? { ...c, pagos: [...c.pagos, { id: nuevoId(), fecha: ahora(), valor, medio }] } : c)),
  )
}

export function cancelarCredito(id) {
  almacenCreditos.set(almacenCreditos.leer().map((c) => (c.id === id ? { ...c, estado: 'cancelado' } : c)))
}

export const registrarGasto = (g) => agregar(almacenGastos, g)
export const borrarGasto = (id) => quitarDe(almacenGastos, id)
export const guardarPromo = (p) => guardarEn(almacenPromos, p)
export const borrarPromo = (id) => quitarDe(almacenPromos, id)
export const guardarUsuario = (u) => guardarEn(almacenUsuarios, u)
export const borrarUsuario = (id) => quitarDe(almacenUsuarios, id)
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

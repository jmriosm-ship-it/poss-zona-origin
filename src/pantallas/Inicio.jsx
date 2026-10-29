import Icono from '../componentes/Iconos.jsx'
import { useProductos, useVentas, useClientes, useCompras, useCreditos, useAbonos, useGastos, useConfig } from '../almacen.js'
import { useUsuario, puede } from '../auth.js'
import { calcular } from '../reportes.js'
import { cajasRepetidas, imeisVendidosDosVeces } from '../alertas.js'
import { analizarInventario } from '../inteligente.js'
import { useCajaActual } from '../equipo.js'
import { dinero, esHoyISO, netoVenta, rangoPeriodo, resumenCredito, saldoCliente, saldoCompra } from '../utils.js'

// Pantalla de inicio: los módulos del sistema como tarjetas, cada una con un dato del momento.
export default function Inicio({ irA, nube }) {
  const usuario = useUsuario()
  const caja = useCajaActual()
  const config = useConfig()
  const productos = useProductos()
  const ventas = useVentas()
  const clientes = useClientes()
  const compras = useCompras()
  const creditos = useCreditos()
  const abonos = useAbonos()
  const gastos = useGastos()

  const hoy = ventas.filter((v) => v.estado !== 'anulada' && esHoyISO(v.fecha))
  const vendidoHoy = hoy.reduce((s, v) => s + netoVenta(v), 0)
  const unidades = productos.reduce((s, p) => s + p.variantes.reduce((a, v) => a + v.stock, 0), 0)
  const porCobrar =
    clientes.reduce((s, c) => s + Math.max(0, saldoCliente(c.id, ventas, abonos)), 0) +
    creditos.filter((c) => c.estado === 'activo').reduce((s, c) => s + resumenCredito(c).saldo, 0)
  const porPagar = compras.reduce((s, c) => s + saldoCompra(c), 0)
  const mes = calcular(ventas, gastos, rangoPeriodo('mes'), creditos)
  const repetidos = usuario?.rol === 'admin' ? imeisVendidosDosVeces(ventas) : []
  const porReponer = analizarInventario(productos, ventas)
  const cajasIguales = usuario?.rol === 'admin' ? cajasRepetidas(ventas) : []

  const modulos = [
    ['caja', 'Caja', `Hoy: ${hoy.length} ${hoy.length === 1 ? 'venta' : 'ventas'} · ${dinero(vendidoHoy)}`],
    ['inventario', 'Inventario', `${unidades} unidades · ${productos.length} ${productos.length === 1 ? 'modelo' : 'modelos'}`],
    ['ventas', 'Ventas', 'Historial, devoluciones y garantías'],
    ['movimientos', 'Movimientos', 'Todo lo que ha pasado: ventas, pagos, gastos'],
    ['compras', 'Compras', porPagar > 0 ? `Debes ${dinero(porPagar)} a proveedores` : 'Registrar mercancía que llega'],
    ['deudas', 'Deudas', porCobrar > 0 ? `Por cobrar ${dinero(porCobrar)}` : 'Fiado y créditos en cuotas'],
    ['clientes', 'Clientes', `${clientes.length} ${clientes.length === 1 ? 'cliente' : 'clientes'} · puntos`],
    ['resumen', 'Resumen', 'El negocio de un vistazo'],
    ['ganancias', 'Ganancias', `Este mes: ${dinero(mes.neta)} netos`],
    ['trabajadores', 'Trabajadores', 'Ventas de cada usuario'],
    ['facturas', 'Facturas', 'Historial de facturas de clientes'],
    ['configuracion', 'Configuración', 'Negocio, categorías, usuarios y copias'],
  ].filter(([id]) => puede(usuario, id) && (id !== 'configuracion' || usuario?.rol === 'admin'))

  return (
    <>
      <div className="cabecera">
        <div>
          <p className="kicker">{config.negocio}</p>
          <h1 className="titulo">Inicio</h1>
          <p className="subtitulo">Elige a dónde quieres ir. Este computador es la {caja}.</p>
        </div>
        <div className="cabecera-acciones">
          <button className="btn oscuro" onClick={() => irA('caja')}>
            <Icono nombre="mas" tam={18} /> Nueva venta
          </button>
        </div>
      </div>

      {usuario?.rol === 'admin' && repetidos.length > 0 && (
        <div className="aviso-legal" style={{ marginBottom: 16 }}>
          <strong>Revisa estos equipos: aparecen vendidos más de una vez.</strong> Puede pasar si dos cajas vendieron el mismo equipo al mismo tiempo. Anula una de las ventas en
          Ventas.
          <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
            {repetidos.map((r) => (
              <li key={r.imei}>
                IMEI {r.imei}: {r.ventas.map((v) => v.etiqueta).join(' y ')}
              </li>
            ))}
          </ul>
        </div>
      )}
      {porReponer.length > 0 && (
        <div className="aviso-legal" style={{ marginBottom: 16 }}>
          <strong>Inventario: {porReponer.length} {porReponer.length === 1 ? 'producto necesita' : 'productos necesitan'} reposición.</strong>{' '}
          {porReponer.slice(0, 4).map((f) => f.nombre + (f.nivel === 'agotado' ? ' (agotado)' : ' (quedan ' + f.stock + ')')).join(', ')}
          {porReponer.length > 4 && '…'}{' '}
          <button className="enlace" onClick={() => irA('inventario')}>
            Ver
          </button>
        </div>
      )}
      {cajasIguales.length > 0 && (
        <div className="aviso-legal" style={{ marginBottom: 16 }}>
          <strong>Dos computadores usan el mismo nombre de caja ({cajasIguales.join(', ')}).</strong> Ponle un nombre distinto a cada uno en Configuración → Negocio → "Nombre de esta
          caja" (Caja 1 y Caja 2), para que no se repitan los números de ticket y cada caja tenga su propio cierre.
        </div>
      )}
      {nube?.configurada && !nube.correo && (
        <div className="aviso-legal" style={{ marginBottom: 16 }}>
          Este computador <strong>no está conectado a la nube</strong>, así que no comparte las ventas ni el inventario con el otro computador. Conéctalo en Configuración → Nube.
        </div>
      )}

      <div className="tiles">
        {modulos.map(([id, titulo, sub]) => (
          <button key={id} className="tile" onClick={() => irA(id)}>
            <span className="tile-icono">
              <Icono nombre={id === 'configuracion' ? 'ajustes' : id} tam={24} />
            </span>
            <strong>{titulo}</strong>
            <span>{sub}</span>
            <i aria-hidden="true">→</i>
          </button>
        ))}
      </div>
    </>
  )
}

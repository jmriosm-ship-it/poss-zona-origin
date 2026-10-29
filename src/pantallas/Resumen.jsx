import Icono from '../componentes/Iconos.jsx'
import Grafica from '../componentes/Grafica.jsx'
import { useProductos, useVentas, useGastos, useCompras, useClientes, useAbonos, useCreditos } from '../almacen.js'
import { calcular } from '../reportes.js'
import { dinero, etiquetaVenta, fechaLarga, fechaHora, rangoPeriodo, resumenCredito, saldoCliente, saldoCompra } from '../utils.js'

// Resumen del mes con datos reales
export default function Resumen({ irA }) {
  const productos = useProductos()
  const ventas = useVentas()
  const gastos = useGastos()
  const compras = useCompras()
  const clientes = useClientes()
  const abonos = useAbonos()
  const creditos = useCreditos()

  const r = calcular(ventas, gastos, rangoPeriodo('mes'), creditos)
  const mes = new Date().toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
  const margen = r.ingresos > 0 ? Math.round((r.neta / r.ingresos) * 100) : 0

  const unidades = productos.reduce((s, p) => s + p.variantes.reduce((a, v) => a + v.stock, 0), 0)
  const variantes = productos.reduce((s, p) => s + p.variantes.length, 0)
  const bajos = productos.flatMap((p) => p.variantes.filter((v) => v.stock <= v.minimo).map((v) => ({ p, v })))

  const deudores = clientes.filter((c) => saldoCliente(c.id, ventas, abonos) > 0)
  const activos = creditos.filter((c) => c.estado === 'activo').map((c) => resumenCredito(c)).filter((r) => r.saldo > 0)
  const porCobrar = deudores.reduce((s, c) => s + saldoCliente(c.id, ventas, abonos), 0) + activos.reduce((s, r) => s + r.saldo, 0)
  const porPagar = compras.filter((c) => saldoCompra(c) > 0)
  const totalPagar = porPagar.reduce((s, c) => s + saldoCompra(c), 0)
  const ultimas = ventas.slice(0, 5)

  return (
    <>
      <div className="cabecera">
        <div>
          <p className="kicker">Tu negocio, en una mirada</p>
          <h1 className="titulo">Resumen del negocio</h1>
          <p className="subtitulo">Así viene Zona Originals en {mes}.</p>
        </div>
        <div className="cabecera-acciones">
          <button className="btn oscuro" onClick={() => irA('caja')}>
            <Icono nombre="mas" tam={18} /> Nueva venta
          </button>
        </div>
      </div>

      <div className="tarjetas">
        <div className="tarjeta">
          <div className="etiqueta">
            Ingresos por ventas <Icono nombre="ventas" tam={18} />
          </div>
          <div className="valor">{dinero(r.ingresos)}</div>
          <small>
            {r.nVentas} ventas · {r.unidades} unidades
          </small>
        </div>
        <div className="tarjeta oscura">
          <div className="etiqueta">
            Ganancia neta <Icono nombre="flechaArriba" tam={18} />
          </div>
          <div className="valor">{dinero(r.neta)}</div>
          <small>{margen}% sobre los ingresos</small>
        </div>
        <div className="tarjeta">
          <div className="etiqueta">
            Inventario disponible <Icono nombre="inventario" tam={18} />
          </div>
          <div className="valor">{unidades} unidades</div>
          <small>
            {productos.length} modelos · {variantes} variantes
          </small>
        </div>
        <div className="tarjeta">
          <div className="etiqueta">
            Por cobrar <Icono nombre="deudas" tam={18} />
          </div>
          <div className="valor">{dinero(porCobrar)}</div>
          <small>
            {deudores.length} clientes con fiado · {activos.length} créditos{activos.some((r) => r.mora > 0) ? ` (${activos.filter((r) => r.mora > 0).length} en mora)` : ''}
          </small>
        </div>
      </div>

      <div className="rejilla">
        <div className="panel">
          <div className="panel-cabeza">
            <div>
              <h2>Ingresos y costos</h2>
              <p className="sub">Este mes, por día</p>
            </div>
            <button className="btn chico" onClick={() => irA('ganancias')}>
              <Icono nombre="flechaArriba" tam={14} /> Ver ganancias
            </button>
          </div>
          <Grafica dias={r.dias} />
        </div>

        <div className="panel">
          <div className="panel-cabeza">
            <div>
              <h2>Resultado del mes</h2>
              <p className="sub">Lo que vendes, menos lo que cuesta</p>
            </div>
          </div>
          <div className="lineas">
            <div>
              Ingresos por ventas <strong>{dinero(r.ingresos)}</strong>
            </div>
            <div>
              Costo de mercancía vendida <strong>− {dinero(r.costos)}</strong>
            </div>
            <div className="fuerte">
              Ganancia bruta <strong>{dinero(r.bruta)}</strong>
            </div>
            <div>
              Intereses de créditos <strong>+ {dinero(r.intereses)}</strong>
            </div>
            <div>
              Gastos del local <strong>− {dinero(r.gastos)}</strong>
            </div>
          </div>
          <div className="resultado-neto">
            <div>
              <small>Ganancia neta</small>
              <strong>{dinero(r.neta)}</strong>
            </div>
            <span>{margen}%</span>
          </div>
        </div>
      </div>

      <div className="rejilla">
        <div className="panel">
          <div className="panel-cabeza">
            <div>
              <h2>Últimas ventas</h2>
              <p className="sub">Movimientos más recientes</p>
            </div>
            <button className="enlace" onClick={() => irA('ventas')}>
              Ver todas →
            </button>
          </div>
          {ultimas.length === 0 ? (
            <div className="vacio">Todavía no hay ventas.</div>
          ) : (
            <table className="tabla">
              <thead>
                <tr>
                  <th>Venta / cliente</th>
                  <th>Unidades</th>
                  <th>Total</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {ultimas.map((v) => (
                  <tr key={v.id}>
                    <td>
                      <strong>{etiquetaVenta(v)}</strong> {v.clienteNombre || ''}
                      <small className="gris">{fechaHora(v.fecha)}</small>
                    </td>
                    <td>{v.items.reduce((s, i) => s + i.cantidad, 0)}</td>
                    <td>{dinero(v.total)}</td>
                    <td>
                      {v.estado === 'anulada' ? (
                        <span className="badge agotado">Anulada</span>
                      ) : v.pagos.some((p) => p.medio === 'Fiado') ? (
                        <span className="badge bajo">Fiado</span>
                      ) : (
                        <span className="badge ok">Pagada</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {r.masVendidos.length > 0 && (
            <>
              <h3 className="sub-titulo">Lo que más se vende este mes</h3>
              <div className="chips">
                {r.masVendidos.map((m) => (
                  <span className="chip" key={m.nombre}>
                    {m.nombre} · {m.cantidad}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="panel">
          <div className="panel-cabeza">
            <div>
              <h2>Atención al stock</h2>
              <p className="sub">Variantes por debajo del mínimo</p>
            </div>
            <Icono nombre="inventario" tam={18} />
          </div>
          {bajos.length === 0 ? (
            <div className="vacio">Todo en orden: nada por reponer.</div>
          ) : (
            <div className="lista-stock">
              {bajos.slice(0, 8).map(({ p, v }) => (
                <div key={v.id}>
                  <span>
                    <strong>{p.nombre}</strong> <small className="gris">{[v.talla, v.color].filter(Boolean).join(' ')}</small>
                  </span>
                  <span className={'badge ' + (v.stock === 0 ? 'agotado' : 'bajo')}>{v.stock === 0 ? 'Agotado' : `Quedan ${v.stock}`}</span>
                </div>
              ))}
              {bajos.length > 8 && <p className="gris">y {bajos.length - 8} más…</p>}
            </div>
          )}
          <button className="enlace" onClick={() => irA('inventario')}>
            Revisar inventario →
          </button>
        </div>
      </div>

      <div className="banda">
        <span>
          <Icono nombre="reloj" tam={18} />
          {porPagar.length === 0
            ? 'Próximos pagos: no le debes a ningún proveedor.'
            : `Le debes ${dinero(totalPagar)} a ${porPagar.length} proveedor(es). La compra más antigua es del ${fechaLarga(porPagar[porPagar.length - 1].fecha)}.`}
        </span>
        <button className="enlace" onClick={() => irA('deudas')}>
          Ver deudas →
        </button>
      </div>

      <div className="pie">
        <span>ZONA ORIGINALS / GESTIÓN DEL LOCAL</span>
        <span>Moneda: COP</span>
      </div>
    </>
  )
}

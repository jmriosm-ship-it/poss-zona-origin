import { useMemo, useState } from 'react'
import Icono from '../componentes/Iconos.jsx'
import DetalleVenta from '../componentes/DetalleVenta.jsx'
import FiltroFechas, { rangoDe } from '../componentes/FiltroFechas.jsx'
import { TicketCierre } from '../componentes/CierreCaja.jsx'
import { useVentas, useCompras, useAbonos, useCreditos, useGastos, useMovimientos, useClientes, useTurnos } from '../almacen.js'
import { construirMovimientos, GRUPOS, TIPOS } from '../movimientos.js'
import { aFechaISO, dinero, enRango, fechaHora } from '../utils.js'

const PASO = 150

// Historial de movimientos: todo lo que ha pasado, con filtros por fecha, tipo y búsqueda
export default function Movimientos() {
  const ventas = useVentas()
  const compras = useCompras()
  const abonos = useAbonos()
  const creditos = useCreditos()
  const gastos = useGastos()
  const movimientos = useMovimientos()
  const clientes = useClientes()
  const turnos = useTurnos()

  const [periodo, setPeriodo] = useState('mes')
  const [desde, setDesde] = useState(aFechaISO(new Date(new Date().getFullYear(), new Date().getMonth(), 1)))
  const [hasta, setHasta] = useState(aFechaISO(new Date()))
  const [grupo, setGrupo] = useState('todos')
  const [buscar, setBuscar] = useState('')
  const [limite, setLimite] = useState(PASO)
  const [verVenta, setVerVenta] = useState(null)
  const [verTurno, setVerTurno] = useState(null)

  const todos = useMemo(
    () => construirMovimientos({ ventas, compras, abonos, creditos, gastos, movimientos, turnos, clientes }),
    [ventas, compras, abonos, creditos, gastos, movimientos, turnos, clientes],
  )

  const rango = rangoDe(periodo, desde, hasta)
  const q = buscar.trim().toLowerCase().replace(/^#/, '')
  const delPeriodo = todos.filter(
    (m) => enRango(m.fecha, rango) && (!q || m.detalle.toLowerCase().includes(q) || (m.quien || '').toLowerCase().includes(q) || TIPOS[m.tipo].toLowerCase().includes(q) || String(m.numero || '').includes(q.replace(/^0+/, ''))),
  )
  const lista = delPeriodo.filter((m) => grupo === 'todos' || m.grupo === grupo)
  const cuenta = (g) => (g === 'todos' ? delPeriodo.length : delPeriodo.filter((m) => m.grupo === g).length)
  const vendido = delPeriodo.filter((m) => m.tipo === 'venta' && !m.estado).reduce((s, m) => s + m.valor, 0)

  const abrir = (m) => {
    if (m.ref?.tipo === 'venta') setVerVenta(m.ref.id)
    else if (m.ref?.tipo === 'turno') setVerTurno(turnos.find((t) => t.id === m.ref.id))
  }

  const cambiar = (fn) => (v) => {
    fn(v)
    setLimite(PASO)
  }

  return (
    <>
      <div className="cabecera">
        <div>
          <p className="kicker">Todo lo que ha pasado</p>
          <h1 className="titulo">Movimientos</h1>
          <p className="subtitulo">
            {delPeriodo.length} movimientos · ventas del período: {dinero(vendido)}
          </p>
        </div>
      </div>

      <div className="filtros" style={{ flexWrap: 'wrap' }}>
        <FiltroFechas periodo={periodo} onPeriodo={cambiar(setPeriodo)} desde={desde} hasta={hasta} onDesde={cambiar(setDesde)} onHasta={cambiar(setHasta)} />
      </div>

      <div className="cat-barra">
        {GRUPOS.map(([k, t]) => (
          <button key={k} className={grupo === k ? 'activo' : ''} onClick={() => cambiar(setGrupo)(k)}>
            {t} <b>{cuenta(k)}</b>
          </button>
        ))}
      </div>

      <div className="panel">
        <div className="filtros">
          <label className="buscar" style={{ flex: 1 }}>
            <Icono nombre="buscar" tam={18} />
            <input placeholder="Buscar por número de venta, cliente, proveedor, vendedor, producto…" value={buscar} onChange={(e) => cambiar(setBuscar)(e.target.value)} />
          </label>
        </div>

        {lista.length === 0 ? (
          <div className="vacio">{todos.length === 0 ? 'Todavía no hay movimientos.' : 'No hay movimientos con estos filtros.'}</div>
        ) : (
          <>
            <table className="tabla">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Detalle</th>
                  <th>Quién</th>
                  <th style={{ textAlign: 'right' }}>Valor</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {lista.slice(0, limite).map((m) => (
                  <tr key={m.clave}>
                    <td style={{ whiteSpace: 'nowrap' }}>{fechaHora(m.fecha)}</td>
                    <td>
                      <span className={'badge ' + (m.signo > 0 ? 'ok' : m.signo < 0 ? 'agotado' : 'bajo')}>{TIPOS[m.tipo]}</span>
                    </td>
                    <td>
                      {m.detalle}
                      {m.estado && <small className="promo-txt" style={{ color: 'var(--rojo)' }}>{m.estado}</small>}
                    </td>
                    <td className="gris">{m.quien || '—'}</td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <strong style={{ color: m.estado ? 'var(--gris)' : m.signo > 0 ? 'var(--verde)' : m.signo < 0 ? 'var(--rojo)' : undefined, textDecoration: m.estado ? 'line-through' : undefined }}>
                        {m.signo > 0 ? '+ ' : m.signo < 0 ? '− ' : ''}
                        {dinero(m.valor)}
                      </strong>
                    </td>
                    <td className="acciones">
                      {m.ref && (
                        <button className="enlace" onClick={() => abrir(m)}>
                          Ver
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {lista.length > limite && (
              <div style={{ textAlign: 'center', marginTop: 14 }}>
                <button className="btn" onClick={() => setLimite(limite + PASO)}>
                  Mostrar más ({lista.length - limite} restantes)
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {verVenta && <DetalleVenta ventaId={verVenta} onCerrar={() => setVerVenta(null)} />}
      {verTurno && (
        <div className="fondo-modal" onMouseDown={(e) => e.target === e.currentTarget && setVerTurno(null)}>
          <div className="modal modal-chico">
            <TicketCierre turno={verTurno} resumen={verTurno.resumen} contado={verTurno.contado} esperado={verTurno.esperado} />
            <div className="modal-pie sin-imprimir">
              <button className="btn" onClick={() => setVerTurno(null)}>
                Cerrar
              </button>
              <button className="btn oscuro" onClick={() => window.print()}>
                Imprimir
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

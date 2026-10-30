import { useTurnos, useVentas, useAbonos, useCompras, useCreditos, useMovimientos } from '../almacen.js'
import { resumenTurno } from '../turno.js'
import { useCajaActual } from '../equipo.js'
import { aFechaISO, cajaDe, dinero, fechaHora } from '../utils.js'

// El administrador ve de un vistazo cómo va cada caja (Caja 1, Caja 2…) desde cualquier computador
export default function CajasResumen() {
  const turnos = useTurnos()
  const ventas = useVentas()
  const abonos = useAbonos()
  const compras = useCompras()
  const creditos = useCreditos()
  const movimientos = useMovimientos()
  const miCaja = useCajaActual()

  const nombres = [...new Set([miCaja, ...turnos.map(cajaDe), ...ventas.map(cajaDe)])].sort()
  const hoy = aFechaISO(new Date())

  return (
    <div className="panel" style={{ marginBottom: 16 }}>
      <div className="panel-cabeza">
        <div>
          <h2>Cajas</h2>
          <p className="sub">Cómo va cada caja. Se actualiza solo con la nube, aunque estés en el otro computador.</p>
        </div>
      </div>
      <table className="tabla">
        <thead>
          <tr>
            <th>Caja</th>
            <th>Estado</th>
            <th>Abrió</th>
            <th>Base</th>
            <th>Ventas hoy</th>
            <th>Vendido hoy</th>
            <th>Efectivo esperado</th>
          </tr>
        </thead>
        <tbody>
          {nombres.map((n) => {
            const abierto = turnos.find((t) => !t.fechaCierre && cajaDe(t) === n)
            const ultimo = turnos.find((t) => t.fechaCierre && cajaDe(t) === n)
            const r = abierto ? resumenTurno(abierto, ventas, abonos, compras, movimientos, creditos) : null
            const deHoy = ventas.filter((v) => cajaDe(v) === n && v.estado !== 'anulada' && aFechaISO(new Date(v.fecha)) === hoy)
            return (
              <tr key={n}>
                <td>
                  <strong>{n}</strong>
                  {n === miCaja && <small className="gris">Este computador</small>}
                </td>
                <td>
                  {abierto ? <span className="badge ok">Abierta</span> : <span className="badge agotado">Cerrada</span>}
                  {!abierto && ultimo && <small className="gris">Cerró {fechaHora(ultimo.fechaCierre)}</small>}
                </td>
                <td>
                  {abierto ? (
                    <>
                      {abierto.abrioPor || '—'}
                      <small className="gris">{fechaHora(abierto.fechaApertura)}</small>
                    </>
                  ) : (
                    '—'
                  )}
                </td>
                <td>{abierto ? dinero(abierto.inicial) : '—'}</td>
                <td>{deHoy.length}</td>
                <td>{dinero(deHoy.reduce((s, v) => s + v.total, 0))}</td>
                <td>{r ? <strong>{dinero(r.esperado)}</strong> : '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

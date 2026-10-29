import { useState } from 'react'
import DetalleVenta from './DetalleVenta.jsx'
import { useVentas } from '../almacen.js'
import { aFechaISO, dinero, etiquetaVenta, fechaHora, netoVenta } from '../utils.js'

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const claveDia = (iso) => aFechaISO(new Date(iso))

// $1.250.000 -> $1,3M · $350.000 -> $350k
function corto(n) {
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1).replace('.', ',').replace(',0', '') + 'M'
  if (n >= 1e3) return '$' + Math.round(n / 1e3) + 'k'
  return '$' + n
}

// Calendario del mes: lo vendido cada día. Al tocar un día se ven sus ventas.
export default function Calendario({ vendedorId }) {
  const todas = useVentas()
  const ventas = vendedorId ? todas.filter((v) => v.vendedorId === vendedorId) : todas
  const hoy = new Date()
  const [mes, setMes] = useState(new Date(hoy.getFullYear(), hoy.getMonth(), 1))
  const [dia, setDia] = useState(aFechaISO(hoy))
  const [verId, setVerId] = useState(null)

  const total = (inicio) => {
    const fin = new Date(inicio.getFullYear(), inicio.getMonth() + 1, 1)
    return ventas.filter((v) => v.estado !== 'anulada' && new Date(v.fecha) >= inicio && new Date(v.fecha) < fin)
  }
  const delMes = total(mes)
  const delMesPasado = total(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))

  // vendido y cantidad de ventas por día
  const porDia = new Map()
  for (const v of delMes) {
    const k = claveDia(v.fecha)
    const f = porDia.get(k) || { total: 0, n: 0 }
    f.total += netoVenta(v)
    f.n += 1
    porDia.set(k, f)
  }
  const vendido = delMes.reduce((s, v) => s + netoVenta(v), 0)
  const vendidoAntes = delMesPasado.reduce((s, v) => s + netoVenta(v), 0)
  const cambio = vendidoAntes > 0 ? Math.round(((vendido - vendidoAntes) / vendidoAntes) * 100) : null
  const maximo = Math.max(1, ...[...porDia.values()].map((f) => f.total))
  const mejor = [...porDia.entries()].sort((a, b) => b[1].total - a[1].total)[0]

  // celdas: huecos hasta el primer día (la semana empieza el lunes) y luego los días del mes
  const primero = (new Date(mes.getFullYear(), mes.getMonth(), 1).getDay() + 6) % 7
  const dias = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate()
  const celdas = [...Array(primero).fill(null), ...Array.from({ length: dias }, (_, i) => aFechaISO(new Date(mes.getFullYear(), mes.getMonth(), i + 1)))]

  const delDia = ventas.filter((v) => claveDia(v.fecha) === dia)
  const nDia = delDia.filter((v) => v.estado !== 'anulada').length
  const nombreMes = mes.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
  const cambiarMes = (d) => setMes(new Date(mes.getFullYear(), mes.getMonth() + d, 1))

  return (
    <>
      <div className="cal-barra">
        <button className="btn chico" onClick={() => cambiarMes(-1)} aria-label="Mes anterior">
          ‹
        </button>
        <input
          type="month"
          className="cal-mes"
          value={`${mes.getFullYear()}-${String(mes.getMonth() + 1).padStart(2, '0')}`}
          onChange={(e) => e.target.value && setMes(new Date(Number(e.target.value.slice(0, 4)), Number(e.target.value.slice(5)) - 1, 1))}
        />
        <button className="btn chico" onClick={() => cambiarMes(1)} aria-label="Mes siguiente">
          ›
        </button>
        <button className="btn chico" onClick={() => { setMes(new Date(hoy.getFullYear(), hoy.getMonth(), 1)); setDia(aFechaISO(hoy)) }}>
          Hoy
        </button>
        <strong className="cal-titulo">{nombreMes}</strong>
      </div>

      <div className="tarjetas" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="tarjeta oscura">
          <div className="etiqueta">Vendido en el mes</div>
          <div className="valor">{dinero(vendido)}</div>
          <small>{cambio === null ? 'Sin ventas el mes anterior' : `${cambio >= 0 ? '+' : ''}${cambio}% vs mes anterior`}</small>
        </div>
        <div className="tarjeta">
          <div className="etiqueta">Ventas</div>
          <div className="valor">{delMes.length}</div>
          <small>{porDia.size} {porDia.size === 1 ? 'día' : 'días'} con ventas</small>
        </div>
        <div className="tarjeta">
          <div className="etiqueta">Promedio por día con ventas</div>
          <div className="valor">{dinero(porDia.size ? vendido / porDia.size : 0)}</div>
          <small>Solo cuenta los días que vendieron</small>
        </div>
        <div className="tarjeta">
          <div className="etiqueta">Mejor día</div>
          <div className="valor">{mejor ? dinero(mejor[1].total) : '—'}</div>
          <small>{mejor ? new Date(mejor[0] + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' }) : 'Sin ventas'}</small>
        </div>
      </div>

      <div className="panel">
        <div className="cal-grid">
          {DIAS.map((d) => (
            <div className="cal-dia-nombre" key={d}>
              {d}
            </div>
          ))}
          {celdas.map((f, i) => {
            if (!f) return <div key={'v' + i} />
            const datos = porDia.get(f)
            const intensidad = datos ? 0.12 + 0.55 * (datos.total / maximo) : 0
            return (
              <button
                key={f}
                className={'cal-celda' + (f === dia ? ' elegido' : '') + (f === aFechaISO(hoy) ? ' hoy' : '')}
                style={datos ? { background: `rgba(29, 29, 31, ${intensidad})`, color: intensidad > 0.4 ? '#fff' : 'var(--texto)' } : undefined}
                onClick={() => setDia(f)}
              >
                <span className="cal-num">{Number(f.slice(8))}</span>
                {datos && (
                  <>
                    <strong>{corto(datos.total)}</strong>
                    <small>{datos.n} {datos.n === 1 ? 'venta' : 'ventas'}</small>
                  </>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <div className="panel-cabeza">
          <div>
            <h2>{new Date(dia + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</h2>
            <p className="sub">
              {nDia} {nDia === 1 ? 'venta' : 'ventas'} · {dinero(delDia.reduce((s, v) => s + netoVenta(v), 0))}
            </p>
          </div>
        </div>
        {delDia.length === 0 ? (
          <div className="vacio">No hubo ventas este día.</div>
        ) : (
          <table className="tabla">
            <thead>
              <tr>
                <th>Venta</th>
                <th>Hora</th>
                <th>Vendedor</th>
                <th>Productos</th>
                <th>Total</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {delDia.map((v) => (
                <tr key={v.id}>
                  <td>
                    <strong>{etiquetaVenta(v)}</strong>
                    {v.estado === 'anulada' && <small className="promo-txt" style={{ color: 'var(--rojo)' }}>Anulada</small>}
                  </td>
                  <td>{fechaHora(v.fecha).split(',')[1] || fechaHora(v.fecha)}</td>
                  <td>{v.vendedorNombre || '—'}</td>
                  <td>{v.items.map((i) => `${i.cantidad} ${i.nombre}`).join(', ')}</td>
                  <td>
                    <strong>{dinero(v.total)}</strong>
                  </td>
                  <td className="acciones">
                    <button className="enlace" onClick={() => setVerId(v.id)}>
                      Ver detalle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {verId && <DetalleVenta ventaId={verId} onCerrar={() => setVerId(null)} />}
    </>
  )
}

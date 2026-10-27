import { useState } from 'react'
import Icono from '../componentes/Iconos.jsx'
import CajaTurno from '../componentes/CajaTurno.jsx'
import DetalleVenta from '../componentes/DetalleVenta.jsx'
import { useVentas } from '../almacen.js'
import { useUsuario } from '../auth.js'
import { dinero, netoVenta, devuelto, fechaHora } from '../utils.js'

const esHoy = (iso) => new Date(iso).toDateString() === new Date().toDateString()

function estadoVenta(v) {
  if (v.estado === 'anulada') return { clase: 'agotado', texto: 'Anulada' }
  if (devuelto(v) > 0) return { clase: 'bajo', texto: 'Con devolución' }
  return { clase: 'ok', texto: 'Completada' }
}

export default function Ventas() {
  const todas = useVentas()
  const usuario = useUsuario()
  const admin = usuario?.rol === 'admin'
  const [periodo, setPeriodo] = useState('hoy')
  const [buscar, setBuscar] = useState('')
  const [verId, setVerId] = useState(null)

  // El vendedor solo ve sus propias ventas
  const ventas = admin ? todas : todas.filter((v) => v.vendedorId === usuario?.id)
  const texto = buscar.trim()
  const q = texto.replace(/^#/, '').replace(/^0+/, '')
  const qImei = texto.toUpperCase()
  // se busca por número de venta o por IMEI / serial (útil para ver la garantía de un equipo)
  const coincide = (v) =>
    !texto || String(v.numero).includes(q) || (texto.length >= 4 && v.items.some((i) => (i.imeis || []).some((m) => m.includes(qImei))))
  // al buscar se mira en todas las ventas, sin importar el filtro de fecha
  const lista = ventas.filter((v) => (texto || periodo === 'todas' || esHoy(v.fecha)) && coincide(v))

  const vigentes = lista.filter((v) => v.estado !== 'anulada')
  const vendido = lista.reduce((s, v) => s + netoVenta(v), 0)
  const unidades = vigentes.reduce((s, v) => s + v.items.reduce((a, i) => a + i.cantidad, 0), 0)

  return (
    <>
      <div className="cabecera">
        <div>
          <p className="kicker">Lo que sale de la tienda</p>
          <h1 className="titulo">Ventas</h1>
          <p className="subtitulo">
            {vigentes.length} ventas · {unidades} unidades · {dinero(vendido)} netos
          </p>
        </div>
      </div>

      {admin && <CajaTurno />}

      <div className="panel">
        <div className="filtros">
          <div className="segmentos">
            <button className={periodo === 'hoy' ? 'activo' : ''} onClick={() => setPeriodo('hoy')}>
              Hoy
            </button>
            <button className={periodo === 'todas' ? 'activo' : ''} onClick={() => setPeriodo('todas')}>
              Todas
            </button>
          </div>
          <label className="buscar">
            <Icono nombre="buscar" tam={18} />
            <input placeholder="Buscar por número de venta o IMEI" value={buscar} onChange={(e) => setBuscar(e.target.value)} />
          </label>
        </div>

        {lista.length === 0 ? (
          <div className="vacio">{ventas.length === 0 ? 'Todavía no hay ventas. Haz la primera en Caja.' : 'No hay ventas en este filtro.'}</div>
        ) : (
          <table className="tabla">
            <thead>
              <tr>
                <th>Venta</th>
                <th>Fecha</th>
                {admin && <th>Vendedor</th>}
                <th>Unidades</th>
                <th>Pago</th>
                <th>Total</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lista.map((v) => {
                const e = estadoVenta(v)
                return (
                  <tr key={v.id}>
                    <td>
                      <strong>#{String(v.numero).padStart(5, '0')}</strong>
                    </td>
                    <td>{fechaHora(v.fecha)}</td>
                    {admin && <td>{v.vendedorNombre || '—'}</td>}
                    <td>{v.items.reduce((a, i) => a + i.cantidad, 0)}</td>
                    <td>{v.pagos.map((p) => p.medio).join(' + ')}</td>
                    <td>
                      <strong>{dinero(v.total)}</strong>
                      {devuelto(v) > 0 && <small className="gris">− {dinero(devuelto(v))} devuelto</small>}
                    </td>
                    <td>
                      <span className={'badge ' + e.clase}>{e.texto}</span>
                    </td>
                    <td className="acciones">
                      <button className="enlace" onClick={() => setVerId(v.id)}>
                        Ver detalle
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {verId && <DetalleVenta ventaId={verId} onCerrar={() => setVerId(null)} />}
    </>
  )
}

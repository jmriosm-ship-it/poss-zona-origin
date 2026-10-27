import { useState } from 'react'
import Recibo from './Recibo.jsx'
import { useVentas, devolverItems, anularVenta } from '../almacen.js'
import { useUsuario } from '../auth.js'
import { cantidadDevuelta, devuelto, dinero, fechaHora, imeisDevueltos, vencimientoGarantia } from '../utils.js'

// Detalle de una venta: devolver unidades, anular o reimprimir el recibo
export default function DetalleVenta({ ventaId, onCerrar }) {
  const venta = useVentas().find((v) => v.id === ventaId)
  const usuario = useUsuario()
  const [cant, setCant] = useState({})
  const [imeisSel, setImeisSel] = useState({}) // equipos con IMEI: cuáles se devuelven
  const [medio, setMedio] = useState(venta?.pagos?.[0]?.medio || 'Efectivo')
  const [recibo, setRecibo] = useState(false)

  if (!venta) return null
  const anulada = venta.estado === 'anulada'
  const admin = usuario?.rol === 'admin'
  const aCredito = Boolean(venta.credito)
  const factor = venta.subtotal > 0 ? venta.total / venta.subtotal : 1

  const maximo = (i) => i.cantidad - cantidadDevuelta(venta, i.varianteId)
  const pendientesImei = (i) => (i.imeis || []).filter((m) => !imeisDevueltos(venta, i.varianteId).includes(m))
  const alternarImei = (id, m) =>
    setImeisSel((s) => ({ ...s, [id]: (s[id] || []).includes(m) ? s[id].filter((x) => x !== m) : [...(s[id] || []), m] }))
  const seleccion = venta.items
    .map((i) =>
      i.imeis?.length
        ? { varianteId: i.varianteId, imeis: (imeisSel[i.varianteId] || []).filter((m) => pendientesImei(i).includes(m)), cantidad: 0 }
        : { varianteId: i.varianteId, cantidad: Math.min(Math.max(0, Math.round(Number(cant[i.varianteId]) || 0)), maximo(i)) },
    )
    .map((s) => (s.imeis ? { ...s, cantidad: s.imeis.length } : s))
    .filter((i) => i.cantidad > 0)
  const reembolso = Math.round(
    seleccion.reduce((s, it) => s + venta.items.find((i) => i.varianteId === it.varianteId).precio * it.cantidad, 0) * factor,
  )

  function devolver() {
    if (!seleccion.length) return
    if (!confirm(`¿Devolver ${dinero(reembolso)} por ${medio}?`)) return
    devolverItems(venta.id, seleccion, medio)
    setCant({})
    setImeisSel({})
  }

  return (
    <div className="fondo-modal" onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className="modal">
        <div className="panel-cabeza">
          <div>
            <h2>Venta #{String(venta.numero).padStart(5, '0')}</h2>
            <p className="sub">
              {fechaHora(venta.fecha)} {venta.vendedorNombre && `· ${venta.vendedorNombre}`} {venta.clienteNombre && `· ${venta.clienteNombre}`}{' '}
              {anulada && '· ANULADA'}
            </p>
          </div>
          <button className="boton-icono" onClick={onCerrar} aria-label="Cerrar">
            ✕
          </button>
        </div>

        <table className="tabla">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Vendidas</th>
              <th>Devueltas</th>
              <th>Valor</th>
              {admin && !anulada && !aCredito && <th>Devolver</th>}
            </tr>
          </thead>
          <tbody>
            {venta.items.map((i) => (
              <tr key={i.varianteId}>
                <td>
                  <strong>{i.nombre}</strong>
                  <small className="gris">
                    {i.detalle}
                    {i.condicion && i.condicion !== 'Nuevo' ? ` · ${i.condicion}` : ''}
                  </small>
                  {(i.imeis || []).map((m) => (
                    <small className="imei-txt" key={m}>
                      IMEI {m}
                      {imeisDevueltos(venta, i.varianteId).includes(m) ? ' (devuelto)' : ''}
                    </small>
                  ))}
                  {i.garantiaDias > 0 && (
                    <small className="garantia-txt">
                      Garantía hasta {vencimientoGarantia(venta.fecha, i.garantiaDias).toLocaleDateString('es-CO', { dateStyle: 'medium' })}
                    </small>
                  )}
                </td>
                <td>{i.cantidad}</td>
                <td>{cantidadDevuelta(venta, i.varianteId)}</td>
                <td>{dinero(i.precio * i.cantidad)}</td>
                {admin && !anulada && !aCredito && (
                  <td>
                    {i.imeis?.length ? (
                      pendientesImei(i).map((m) => (
                        <label className="casilla-mini" key={m}>
                          <input type="checkbox" checked={(imeisSel[i.varianteId] || []).includes(m)} onChange={() => alternarImei(i.varianteId, m)} />
                          {m.slice(-6)}
                        </label>
                      ))
                    ) : (
                      <input
                        className="devolver-input"
                        type="number"
                        min="0"
                        max={maximo(i)}
                        disabled={maximo(i) === 0}
                        value={cant[i.varianteId] ?? ''}
                        onChange={(e) => setCant({ ...cant, [i.varianteId]: e.target.value })}
                        placeholder="0"
                      />
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        <div className="lineas">
          <div>
            Subtotal <strong>{dinero(venta.subtotal)}</strong>
          </div>
          {venta.descuento > 0 && (
            <div>
              Descuentos <strong>− {dinero(venta.descuento)}</strong>
            </div>
          )}
          <div className="fuerte">
            Total cobrado <strong>{dinero(venta.total)}</strong>
          </div>
          <div>
            Pagó con <strong>{venta.pagos.map((p) => `${p.medio} ${dinero(p.valor)}`).join(' · ')}</strong>
          </div>
          {devuelto(venta) > 0 && (
            <div>
              Devuelto al cliente <strong>− {dinero(devuelto(venta))}</strong>
            </div>
          )}
        </div>

        {(venta.devoluciones || []).map((d) => (
          <p className="gris" key={d.id}>
            Devolución {fechaHora(d.fecha)}: {dinero(d.valor)} por {d.medio}
          </p>
        ))}

        {admin && !anulada && aCredito && (
          <p className="gris" style={{ marginTop: 12 }}>
            Esta venta es a crédito en cuotas. Para devolverla, anula la venta: el crédito se cancela y los equipos vuelven al inventario (lo que el cliente ya pagó se le devuelve aparte).
          </p>
        )}
        {admin && !anulada && !aCredito && (
          <div className="inline-form" style={{ marginTop: 14 }}>
            <span className="gris">Devolver por</span>
            <select value={medio} onChange={(e) => setMedio(e.target.value)}>
              <option>Efectivo</option>
              <option>Transferencia</option>
              <option>Tarjeta</option>
              {venta.pagos.some((p) => p.medio === 'Fiado') && <option>Fiado</option>}
            </select>
            <button className="btn" disabled={!seleccion.length} onClick={devolver}>
              Devolver unidades {seleccion.length > 0 && `(${dinero(reembolso)})`}
            </button>
          </div>
        )}
        {!admin && !anulada && <p className="gris">Las devoluciones y anulaciones las hace el administrador.</p>}

        <div className="modal-pie">
          {admin && !anulada && (
            <button
              className="btn"
              style={{ color: 'var(--rojo)', marginRight: 'auto' }}
              onClick={() => confirm('¿Anular esta venta? Las unidades vuelven al inventario.') && anularVenta(venta.id)}
            >
              Anular venta
            </button>
          )}
          <button className="btn" onClick={() => setRecibo(true)}>
            Ver recibo
          </button>
          <button className="btn oscuro" onClick={onCerrar}>
            Cerrar
          </button>
        </div>
      </div>

      {recibo && <Recibo venta={venta} textoCerrar="Cerrar" onCerrar={() => setRecibo(false)} />}
    </div>
  )
}

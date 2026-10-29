import { useState } from 'react'
import Icono from '../componentes/Iconos.jsx'
import Recibo from '../componentes/Recibo.jsx'
import { useFacturas, useVentas, borrarFactura, restaurarFactura } from '../almacen.js'
import { dinero, etiquetaVenta, fechaHora } from '../utils.js'

// Historial de todas las facturas guardadas: buscar, ver, descargar y recuperar las borradas
export default function Facturas() {
  const todas = useFacturas()
  const [buscar, setBuscar] = useState('')
  const ventas = useVentas()
  const [vista, setVista] = useState('recibos') // 'recibos' (se guardan solos), 'fotos' o 'papelera'
  const papelera = vista === 'papelera'
  const [recibo, setRecibo] = useState(null)
  const [grande, setGrande] = useState(null)

  const q = buscar.trim().toLowerCase()
  const lista = todas
    .filter((f) => Boolean(f.eliminada) === papelera)
    .filter((f) => !q || [f.clienteNombre, f.ventaEtiqueta, f.nota, f.subidaPor].some((t) => (t || '').toLowerCase().includes(q)))
    .sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
  const enPapelera = todas.filter((f) => f.eliminada).length
  // recibos de todas las ventas: se guardan solos al vender
  const recibos = ventas
    .filter((v) => !q || [etiquetaVenta(v), v.clienteNombre, v.vendedorNombre, v.caja, ...v.items.map((i) => i.nombre), ...v.items.flatMap((i) => i.imeis || [])].some((t) => (t || '').toLowerCase().includes(q)))
    .sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
    .slice(0, 200)

  return (
    <>
      <div className="cabecera">
        <div>
          <p className="kicker">Para encontrarlas cuando las necesites</p>
          <h1 className="titulo">Facturas</h1>
          <p className="subtitulo">Los recibos de cada venta se guardan solos. Aquí los buscas y los vuelves a imprimir.</p>
        </div>
        <div className="segmentos">
          <button className={vista === 'recibos' ? 'activo' : ''} onClick={() => setVista('recibos')}>
            Recibos de venta
          </button>
          <button className={vista === 'fotos' ? 'activo' : ''} onClick={() => setVista('fotos')}>
            Fotos de facturas
          </button>
          <button className={papelera ? 'activo' : ''} onClick={() => setVista('papelera')}>
            Papelera {enPapelera > 0 && <b>{enPapelera}</b>}
          </button>
        </div>
      </div>

      <div className="panel">
        <div className="filtros">
          <label className="buscar" style={{ flex: 1, maxWidth: 420 }}>
            <Icono nombre="buscar" tam={18} />
            <input placeholder="Buscar por ticket, cliente, vendedor, producto o IMEI" value={buscar} onChange={(e) => setBuscar(e.target.value)} />
          </label>
        </div>
        {vista === 'recibos' ? (
          recibos.length === 0 ? (
            <div className="vacio">No hay recibos.</div>
          ) : (
            <table className="tabla">
              <thead>
                <tr>
                  <th>Recibo</th>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Vendedor</th>
                  <th>Total</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {recibos.map((v) => (
                  <tr key={v.id}>
                    <td>
                      <strong>{etiquetaVenta(v)}</strong>
                      {v.estado === 'anulada' && <small className="promo-txt" style={{ color: 'var(--rojo)' }}>Anulada</small>}
                    </td>
                    <td>{fechaHora(v.fecha)}</td>
                    <td>{v.clienteNombre || 'Mostrador'}</td>
                    <td>{v.vendedorNombre || '—'}</td>
                    <td>{dinero(v.total)}</td>
                    <td className="acciones">
                      <button className="enlace" onClick={() => setRecibo(v)}>
                        Ver / imprimir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : lista.length === 0 ? (
          <div className="vacio">{papelera ? 'La papelera está vacía.' : 'No hay facturas guardadas.'}</div>
        ) : (
          <table className="tabla">
            <thead>
              <tr>
                <th>Factura</th>
                <th>Cliente</th>
                <th>Venta</th>
                <th>Fecha</th>
                <th>Nota</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lista.map((f) => (
                <tr key={f.id}>
                  <td>
                    <img src={f.imagen} alt="Factura" style={{ height: 48, borderRadius: 6, cursor: 'pointer' }} onClick={() => setGrande(f)} />
                  </td>
                  <td>
                    <strong>{f.clienteNombre}</strong>
                  </td>
                  <td>{f.ventaEtiqueta || '—'}</td>
                  <td>
                    {fechaHora(f.fecha)}
                    {f.subidaPor && <small className="gris">{f.subidaPor}</small>}
                  </td>
                  <td>{f.nota || '—'}</td>
                  <td className="acciones">
                    <button className="enlace" onClick={() => setGrande(f)}>
                      Ver
                    </button>
                    <a className="enlace" href={f.imagen} download={'factura-' + (f.ventaEtiqueta || f.id) + '.jpg'} style={{ marginLeft: 10 }}>
                      Descargar
                    </a>
                    {papelera ? (
                      <button className="enlace" style={{ marginLeft: 10 }} onClick={() => restaurarFactura(f.id)}>
                        Recuperar
                      </button>
                    ) : (
                      <button className="enlace peligro" onClick={() => confirm('¿Mandar esta factura a la papelera?') && borrarFactura(f.id)}>
                        Borrar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {recibo && <Recibo venta={recibo} textoCerrar="Cerrar" onCerrar={() => setRecibo(null)} />}

      {grande && (
        <div className="fondo-modal" onMouseDown={(e) => e.target === e.currentTarget && setGrande(null)}>
          <div className="modal">
            <div className="panel-cabeza">
              <div>
                <h2>{grande.clienteNombre}</h2>
                <p className="sub">
                  {fechaHora(grande.fecha)} {grande.ventaEtiqueta && '· ' + grande.ventaEtiqueta} {grande.nota && '· ' + grande.nota}
                </p>
              </div>
              <button className="boton-icono" onClick={() => setGrande(null)} aria-label="Cerrar">
                ✕
              </button>
            </div>
            <img src={grande.imagen} alt="Factura" style={{ maxWidth: '100%', maxHeight: '70vh', display: 'block', margin: '0 auto' }} />
          </div>
        </div>
      )}
    </>
  )
}

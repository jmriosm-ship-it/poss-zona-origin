import { useRef, useState } from 'react'
import { useFacturas, useVentas, guardarFactura, borrarFactura } from '../almacen.js'
import { useUsuario } from '../auth.js'
import { dinero, etiquetaVenta, fechaHora, nuevoId } from '../utils.js'

const LIMITE = 3 * 1024 * 1024 // tope de lo que ocupan las fotos en este computador (el navegador guarda unos 5 MB en total)

// Reduce la foto para que ocupe poco: máximo 1000 px de lado, JPEG
function comprimir(archivo) {
  return new Promise((ok, mal) => {
    const url = URL.createObjectURL(archivo)
    const img = new Image()
    img.onload = () => {
      const k = Math.min(1, 1000 / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * k)
      c.height = Math.round(img.height * k)
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(url)
      ok(c.toDataURL('image/jpeg', 0.65))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      mal(new Error('No se pudo leer la imagen'))
    }
    img.src = url
  })
}

// Facturas (fotos) de un cliente: se suben, se guardan con historial y se pueden volver a ver
export default function FacturasCliente({ cliente, ventaId, compra, onCerrar }) {
  const todas = useFacturas()
  const ventas = useVentas()
  const usuario = useUsuario()
  const entrada = useRef(null)
  const [nota, setNota] = useState('')
  const [venta, setVenta] = useState(ventaId || '')
  const [error, setError] = useState('')
  const [grande, setGrande] = useState(null)

  const propias = compra ? todas.filter((f) => f.compraId === compra.id && !f.eliminada) : todas.filter((f) => f.clienteId === cliente.id && !f.eliminada)
  const lista = ventaId ? propias.filter((f) => f.ventaId === ventaId) : propias
  const ventasCliente = ventas.filter((v) => v.clienteId === cliente.id)
  const usado = todas.reduce((s, f) => s + (f.imagen?.length || 0), 0)

  async function subir(e) {
    const archivo = e.target.files?.[0]
    e.target.value = ''
    if (!archivo) return
    setError('')
    if (usado > LIMITE) return setError('Ya hay muchas fotos guardadas en este computador. Descarga una copia en Configuración → Datos y borra facturas viejas.')
    try {
      const imagen = await comprimir(archivo)
      const v = ventas.find((x) => x.id === venta)
      guardarFactura({
        id: nuevoId(),
        clienteId: cliente.id,
        clienteNombre: cliente.nombre,
        ventaId: v?.id || '',
        ventaEtiqueta: v ? etiquetaVenta(v) : '',
        nota: nota.trim(),
        ...(compra ? { compraId: compra.id, ventaEtiqueta: 'Compra', tipo: 'proveedor' } : {}),
        fecha: new Date().toISOString(),
        subidaPor: usuario?.nombre || '',
        imagen,
      })
      setNota('')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="fondo-modal" onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className="modal">
        <div className="panel-cabeza">
          <div>
            <h2>{compra ? 'Factura del proveedor ' + compra.proveedor : 'Facturas de ' + cliente.nombre}</h2>
            <p className="sub">Sube la foto de la factura para encontrarla después.</p>
          </div>
          <button className="boton-icono" onClick={onCerrar} aria-label="Cerrar">
            ✕
          </button>
        </div>

        <div className="campos">
          {!ventaId && !compra && (
            <label>
              <span>Venta (opcional)</span>
              <select value={venta} onChange={(e) => setVenta(e.target.value)}>
                <option value="">Sin venta</option>
                {ventasCliente.map((v) => (
                  <option key={v.id} value={v.id}>
                    {etiquetaVenta(v)} · {dinero(v.total)}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className={ventaId ? 'ancho' : ''}>
            <span>Nota (opcional)</span>
            <input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej. factura del iPhone 13" />
          </label>
        </div>
        <input ref={entrada} type="file" accept="image/*" hidden onChange={subir} />
        <button className="btn oscuro" style={{ marginTop: 10 }} onClick={() => entrada.current.click()}>
          Subir imagen de la factura
        </button>
        {error && <p className="aviso-legal" style={{ marginTop: 10 }}>{error}</p>}

        {lista.length === 0 ? (
          <div className="vacio chico">Todavía no hay facturas guardadas.</div>
        ) : (
          <table className="tabla" style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th>Factura</th>
                <th>Fecha</th>
                <th>Venta</th>
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
                    {fechaHora(f.fecha)}
                    {f.subidaPor && <small className="gris">{f.subidaPor}</small>}
                  </td>
                  <td>{f.ventaEtiqueta || '—'}</td>
                  <td>{f.nota || '—'}</td>
                  <td className="acciones">
                    <button className="enlace" onClick={() => setGrande(f)}>
                      Ver
                    </button>
                    {usuario?.rol === 'admin' && (
                      <button className="enlace peligro" onClick={() => confirm('¿Borrar esta factura?') && borrarFactura(f.id)}>
                        Borrar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="modal-pie">
          <button className="btn oscuro" onClick={onCerrar}>
            Cerrar
          </button>
        </div>
      </div>

      {grande && (
        <div className="fondo-modal" style={{ zIndex: 80 }} onMouseDown={(e) => e.target === e.currentTarget && setGrande(null)}>
          <div className="modal">
            <div className="panel-cabeza">
              <div>
                <h2>{grande.ventaEtiqueta ? 'Factura ' + grande.ventaEtiqueta : 'Factura'}</h2>
                <p className="sub">{fechaHora(grande.fecha)} {grande.nota && '· ' + grande.nota}</p>
              </div>
              <button className="boton-icono" onClick={() => setGrande(null)} aria-label="Cerrar">
                ✕
              </button>
            </div>
            <img src={grande.imagen} alt="Factura" style={{ maxWidth: '100%', maxHeight: '70vh', display: 'block', margin: '0 auto' }} />
          </div>
        </div>
      )}
    </div>
  )
}

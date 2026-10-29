import { useCompras, useVentas } from '../almacen.js'
import { etiquetaVenta, fechaHora } from '../utils.js'

// Movimientos de un producto, armados a partir de compras, ventas, devoluciones y anulaciones
export default function HistorialProducto({ producto, onCerrar }) {
  const compras = useCompras()
  const ventas = useVentas()
  const detalle = (varianteId) => {
    const v = producto.variantes.find((x) => x.id === varianteId)
    return v ? [v.talla, v.color].filter(Boolean).join(' ') || 'Única' : ''
  }

  const movs = []
  for (const c of compras)
    for (const i of c.items)
      if (i.productoId === producto.id) movs.push({ fecha: c.fecha, tipo: 'Compra', variante: detalle(i.varianteId), cantidad: i.cantidad, nota: c.proveedor })

  for (const v of ventas) {
    const num = etiquetaVenta(v)
    for (const i of v.items)
      if (i.productoId === producto.id) {
        movs.push({ fecha: v.fecha, tipo: 'Venta', variante: detalle(i.varianteId), cantidad: -i.cantidad, nota: num })
        if (v.estado === 'anulada') {
          const devueltas = (v.devoluciones || []).reduce((s, d) => s + (d.items.find((x) => x.varianteId === i.varianteId)?.cantidad || 0), 0)
          if (i.cantidad - devueltas > 0)
            movs.push({ fecha: v.fechaAnulacion || v.fecha, tipo: 'Anulación', variante: detalle(i.varianteId), cantidad: i.cantidad - devueltas, nota: num })
        }
      }
    for (const d of v.devoluciones || [])
      for (const i of d.items) {
        const original = v.items.find((x) => x.varianteId === i.varianteId)
        if (original?.productoId === producto.id)
          movs.push({ fecha: d.fecha, tipo: 'Devolución', variante: detalle(i.varianteId), cantidad: i.cantidad, nota: num })
      }
  }
  movs.sort((a, b) => (a.fecha < b.fecha ? 1 : -1))

  return (
    <div className="fondo-modal" onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className="modal">
        <div className="panel-cabeza">
          <div>
            <h2>Historial · {producto.nombre}</h2>
            <p className="sub">Entradas y salidas registradas en el sistema</p>
          </div>
          <button className="boton-icono" onClick={onCerrar} aria-label="Cerrar">
            ✕
          </button>
        </div>
        {movs.length === 0 ? (
          <div className="vacio">Este producto todavía no tiene compras ni ventas.</div>
        ) : (
          <table className="tabla">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Movimiento</th>
                <th>Variante</th>
                <th>Cantidad</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {movs.map((m, n) => (
                <tr key={n}>
                  <td>{fechaHora(m.fecha)}</td>
                  <td>{m.tipo}</td>
                  <td>{m.variante}</td>
                  <td>
                    <strong style={{ color: m.cantidad > 0 ? 'var(--verde)' : 'var(--rojo)' }}>{m.cantidad > 0 ? '+' + m.cantidad : m.cantidad}</strong>
                  </td>
                  <td className="gris">{m.nota}</td>
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
    </div>
  )
}

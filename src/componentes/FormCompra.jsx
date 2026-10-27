import { useState } from 'react'
import { useProductos } from '../almacen.js'
import { dinero, imeiConDigitoValido, normalizarSerial, serialValido } from '../utils.js'

// Ventana para registrar una compra de mercancía
export default function FormCompra({ onGuardar, onCerrar }) {
  const productos = useProductos()
  const [proveedor, setProveedor] = useState('')
  const [items, setItems] = useState([])
  const [sel, setSel] = useState({ productoId: '', varianteId: '', cantidad: '1', costo: '' })
  const [imeis, setImeis] = useState([]) // equipos que llegaron (si el producto se controla por IMEI)
  const [imeiTexto, setImeiTexto] = useState('')
  const [pagado, setPagado] = useState('')
  const [medio, setMedio] = useState('Efectivo')
  const [error, setError] = useState('')

  const producto = productos.find((p) => p.id === sel.productoId)
  const total = items.reduce((s, i) => s + i.costo * i.cantidad, 0)

  function elegirProducto(id) {
    const p = productos.find((x) => x.id === id)
    setSel({ productoId: id, varianteId: p?.variantes[0]?.id || '', cantidad: '1', costo: p ? String(p.costo || '') : '' })
    setImeis([])
  }

  // IMEI ya registrados en el inventario o ya agregados a esta compra
  const ocupados = new Set([
    ...productos.flatMap((p) => p.variantes.flatMap((v) => v.imeis || [])),
    ...items.flatMap((i) => i.imeis || []),
    ...imeis,
  ])

  function agregarImei() {
    const s = normalizarSerial(imeiTexto)
    if (!s) return
    if (!serialValido(s)) return setError('Debe tener entre 8 y 17 letras o números (un IMEI tiene 15 dígitos).')
    if (ocupados.has(s)) return setError('Ese IMEI / serial ya está registrado.')
    if (!imeiConDigitoValido(s) && !confirm('Este IMEI no parece válido (falla el dígito de control). ¿Agregarlo igual?')) return
    setImeis([...imeis, s])
    setImeiTexto('')
    setError('')
  }

  function agregar() {
    const variante = producto?.variantes.find((v) => v.id === sel.varianteId)
    const porImei = Boolean(producto?.porImei)
    const cantidad = porImei ? imeis.length : Math.round(Number(sel.cantidad))
    if (!variante || !(cantidad > 0)) return setError(porImei ? 'Agrega al menos un IMEI / serial.' : 'Elige el producto, la variante y una cantidad mayor a 0.')
    if (sel.costo === '' || !(Number(sel.costo) >= 0)) return setError('Escribe el costo por unidad.')
    setError('')
    setItems([
      ...items,
      {
        productoId: producto.id,
        varianteId: variante.id,
        nombre: producto.nombre,
        detalle: [variante.talla, variante.color].filter(Boolean).join(' '),
        cantidad,
        costo: Number(sel.costo),
        ...(porImei ? { imeis } : {}),
      },
    ])
    setSel({ productoId: '', varianteId: '', cantidad: '1', costo: '' })
    setImeis([])
  }

  function guardar(e) {
    e.preventDefault()
    if (!proveedor.trim()) return setError('Escribe el proveedor.')
    if (items.length === 0) return setError('Agrega al menos una unidad a la compra.')
    const abono = Number(pagado) || 0
    if (abono > total) return setError('Lo pagado no puede ser mayor al total.')
    onGuardar({ proveedor: proveedor.trim(), items, total, pagado: abono, medio })
  }

  return (
    <div className="fondo-modal" onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <form className="modal" onSubmit={guardar}>
        <div className="panel-cabeza">
          <h2>Registrar compra</h2>
          <button type="button" className="boton-icono" onClick={onCerrar} aria-label="Cerrar">
            ✕
          </button>
        </div>

        <div className="campos">
          <label className="ancho">
            <span>Proveedor</span>
            <input value={proveedor} onChange={(e) => setProveedor(e.target.value)} placeholder="Nombre del proveedor" autoFocus />
          </label>
        </div>

        <h3 className="sub-titulo">Unidades que llegaron</h3>
        {productos.length === 0 ? (
          <div className="vacio">Primero crea los productos en Inventario.</div>
        ) : (
          <div className="compra-fila">
            <select value={sel.productoId} onChange={(e) => elegirProducto(e.target.value)}>
              <option value="">Producto…</option>
              {productos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
            <select value={sel.varianteId} onChange={(e) => setSel({ ...sel, varianteId: e.target.value })} disabled={!producto}>
              {(producto?.variantes || []).map((v) => (
                <option key={v.id} value={v.id}>
                  {[v.talla, v.color].filter(Boolean).join(' ') || 'Única'}
                </option>
              ))}
            </select>
            {producto?.porImei ? (
              <span className="gris centrado">{imeis.length} IMEI</span>
            ) : (
              <input type="number" min="1" placeholder="Cant." value={sel.cantidad} onChange={(e) => setSel({ ...sel, cantidad: e.target.value })} />
            )}
            <input type="number" min="0" placeholder="Costo c/u" value={sel.costo} onChange={(e) => setSel({ ...sel, costo: e.target.value })} />
            <button type="button" className="btn chico" onClick={agregar}>
              Agregar
            </button>
          </div>
        )}
        {producto?.porImei && (
          <div className="imeis" style={{ marginTop: 8 }}>
            <div className="inline-form">
              <input
                placeholder="Escanea o escribe cada IMEI / serial y da Enter"
                value={imeiTexto}
                onChange={(e) => setImeiTexto(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    agregarImei()
                  }
                }}
              />
              <button type="button" className="btn chico" onClick={agregarImei}>
                Agregar IMEI
              </button>
            </div>
            {imeis.length > 0 && (
              <div className="chips">
                {imeis.map((m) => (
                  <span className="chip" key={m}>
                    {m}{' '}
                    <button type="button" className="chip-x" onClick={() => setImeis(imeis.filter((x) => x !== m))} aria-label={`Quitar ${m}`}>
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {items.length > 0 && (
          <table className="tabla" style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th>Unidad</th>
                <th>Cant.</th>
                <th>Costo</th>
                <th>Subtotal</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((i, n) => (
                <tr key={n}>
                  <td>
                    <strong>{i.nombre}</strong>
                    <small className="gris">{i.detalle}</small>
                    {(i.imeis || []).length > 0 && <small className="imei-txt">{i.imeis.join(' · ')}</small>}
                  </td>
                  <td>{i.cantidad}</td>
                  <td>{dinero(i.costo)}</td>
                  <td>{dinero(i.costo * i.cantidad)}</td>
                  <td className="acciones">
                    <button type="button" className="boton-icono" onClick={() => setItems(items.filter((_, k) => k !== n))} aria-label="Quitar">
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="total-grande" style={{ marginTop: 16 }}>
          <span>Total de la compra</span>
          <strong>{dinero(total)}</strong>
        </div>

        <div className="inline-form">
          <span className="gris">Pagado ahora</span>
          <input type="number" min="0" placeholder="0" value={pagado} onChange={(e) => setPagado(e.target.value)} />
          <select value={medio} onChange={(e) => setMedio(e.target.value)}>
            <option>Efectivo</option>
            <option>Transferencia</option>
          </select>
          <button type="button" className="btn chico" onClick={() => setPagado(String(total))}>
            Pagar todo
          </button>
        </div>
        <p className="gris">Lo que no pagues ahora queda como deuda con el proveedor ({dinero(Math.max(0, total - (Number(pagado) || 0)))}).</p>

        {error && <p className="error">{error}</p>}

        <div className="modal-pie">
          <button type="button" className="btn" onClick={onCerrar}>
            Cancelar
          </button>
          <button type="submit" className="btn oscuro">
            Guardar compra
          </button>
        </div>
      </form>
    </div>
  )
}

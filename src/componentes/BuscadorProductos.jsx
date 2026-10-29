import { useState } from 'react'
import Icono from './Iconos.jsx'
import { claveCategoria } from '../categorias.js'
import { dinero } from '../utils.js'

// Catálogo para buscar y elegir productos con el mouse (F3): categorías, buscador y tarjetas
export default function BuscadorProductos({ filas, categorias, onElegir, onCerrar }) {
  const [categoria, setCategoria] = useState(null)
  const [texto, setTexto] = useState('')
  const q = texto.trim().toLowerCase()

  const lista = filas
    .filter(({ producto }) => !categoria || claveCategoria(producto.categoria) === categoria)
    .filter(
      ({ producto, variante }) =>
        !q ||
        producto.nombre.toLowerCase().includes(q) ||
        variante.codigo.toLowerCase().includes(q) ||
        (variante.imeis || []).some((m) => m.toLowerCase().includes(q)),
    )
    .slice(0, 80)

  return (
    <div className="fondo-modal" onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className="modal" style={{ width: 'min(920px, 100%)' }}>
        <div className="panel-cabeza">
          <h2>Buscar producto</h2>
          <button className="boton-icono" onClick={onCerrar} aria-label="Cerrar">
            ✕
          </button>
        </div>

        <div className="cat-barra">
          <button className={!categoria ? 'activo' : ''} onClick={() => setCategoria(null)}>
            Todas
          </button>
          {categorias.map((c) => (
            <button key={c.clave} className={categoria === c.clave ? 'activo' : ''} onClick={() => setCategoria(c.clave)}>
              {c.nombre} <b>{c.productos}</b>
            </button>
          ))}
        </div>

        <label className="buscar" style={{ marginBottom: 14 }}>
          <Icono nombre="buscar" tam={18} />
          <input placeholder="Buscar por nombre, código o IMEI" value={texto} onChange={(e) => setTexto(e.target.value)} autoFocus />
        </label>

        {lista.length === 0 ? (
          <div className="vacio">{filas.length === 0 ? 'No hay productos. Créalos primero en Inventario.' : 'Nada coincide con tu búsqueda.'}</div>
        ) : (
          <div className="resultados">
            {lista.map((f) => (
              <button
                key={f.variante.id}
                className="prod-card"
                disabled={f.variante.stock === 0}
                onClick={() => {
                  onElegir(f)
                  onCerrar()
                }}
              >
                <strong>{f.producto.nombre}</strong>
                <span className="gris">{[f.variante.talla, f.variante.color].filter(Boolean).join(' ') || 'Única'}</span>
                <b>{dinero(f.producto.precio)}</b>
                <small className={f.variante.stock <= f.variante.minimo ? 'bajo-txt' : 'gris'}>
                  {f.variante.stock === 0 ? 'Agotado' : `Stock: ${f.variante.stock}`}
                  {f.producto.condicion && f.producto.condicion !== 'Nuevo' ? ` · ${f.producto.condicion}` : ''}
                </small>
              </button>
            ))}
          </div>
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

import { useState } from 'react'
import Icono from './Iconos.jsx'
import { useConfig, useProductos } from '../almacen.js'
import { imeiConDigitoValido, normalizarSerial, nuevoId, serialValido } from '../utils.js'

export const CONDICIONES = ['Nuevo', 'Open box', 'Usado']

const variantVacia = () => ({ id: nuevoId(), talla: '', color: '', codigo: '', stock: 0, minimo: 1, imeis: [] })

// Lista de IMEI / seriales de una variante: se escribe o se escanea y se da Enter
function GestorImeis({ imeis, onCambiar, ocupados }) {
  const [texto, setTexto] = useState('')
  const [error, setError] = useState('')

  function agregar() {
    const s = normalizarSerial(texto)
    if (!s) return
    if (!serialValido(s)) return setError('Debe tener entre 8 y 17 letras o números (un IMEI tiene 15 dígitos).')
    if (imeis.includes(s) || ocupados.has(s)) return setError('Ese IMEI / serial ya está registrado en el inventario.')
    if (!imeiConDigitoValido(s) && !confirm('Este IMEI no parece válido (falla el dígito de control). ¿Agregarlo igual?')) return
    onCambiar([...imeis, s])
    setTexto('')
    setError('')
  }

  return (
    <div className="imeis">
      <div className="inline-form">
        <input
          placeholder="IMEI o serial: escribe o escanea y da Enter"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              agregar()
            }
          }}
        />
        <button type="button" className="btn chico" onClick={agregar}>
          Agregar
        </button>
      </div>
      {error && <p className="error" style={{ marginTop: 4 }}>{error}</p>}
      {imeis.length > 0 && (
        <div className="chips" style={{ marginTop: 6 }}>
          {imeis.map((m) => (
            <span className="chip" key={m}>
              {m}{' '}
              <button type="button" className="chip-x" onClick={() => onCambiar(imeis.filter((x) => x !== m))} aria-label={`Quitar ${m}`}>
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// Ventana para crear o editar un producto con sus variantes (capacidad y color)
export default function FormProducto({ producto, categoriaInicial = '', onGuardar, onCerrar }) {
  const productos = useProductos()
  const CATEGORIAS = useConfig().categorias
  const [p, setP] = useState(
    producto || {
      id: nuevoId(),
      nombre: '',
      categoria: categoriaInicial,
      marca: '',
      condicion: 'Nuevo',
      garantiaDias: '',
      porImei: /iphone|celular|macbook|watch/i.test(categoriaInicial),
      costo: '',
      precio: '',
      variantes: [variantVacia()],
    },
  )
  const [error, setError] = useState('')

  const cambiar = (campo, valor) => setP((x) => ({ ...x, [campo]: valor }))
  const cambiarVar = (id, campo, valor) =>
    setP((x) => ({ ...x, variantes: x.variantes.map((v) => (v.id === id ? { ...v, [campo]: valor } : v)) }))
  const quitarVar = (id) => setP((x) => ({ ...x, variantes: x.variantes.filter((v) => v.id !== id) }))

  // IMEI de otros productos y de las demás variantes de este formulario
  const ocupadosPor = (varianteId) =>
    new Set([
      ...productos.filter((o) => o.id !== p.id).flatMap((o) => o.variantes.flatMap((v) => v.imeis || [])),
      ...p.variantes.filter((v) => v.id !== varianteId).flatMap((v) => v.imeis || []),
    ])

  // Al escribir una categoría de equipos, se sugiere controlar por IMEI (solo en productos nuevos)
  function cambiarCategoria(valor) {
    setP((x) => ({ ...x, categoria: valor, porImei: producto ? x.porImei : /iphone|celular|macbook|watch/i.test(valor) ? true : x.porImei }))
  }

  function guardar(e) {
    e.preventDefault()
    if (!p.nombre.trim()) return setError('Escribe el nombre del producto.')
    if (!(Number(p.precio) > 0)) return setError('El precio de venta debe ser mayor a 0.')
    if (p.variantes.length === 0) return setError('Agrega al menos una variante (capacidad/color).')
    onGuardar({
      ...p,
      nombre: p.nombre.trim(),
      categoria: p.categoria.trim(),
      costo: Number(p.costo) || 0,
      precio: Number(p.precio),
      garantiaDias: Math.max(0, Math.round(Number(p.garantiaDias) || 0)),
      variantes: p.variantes.map((v) => {
        const imeis = p.porImei ? v.imeis || [] : []
        return {
          ...v,
          talla: v.talla.trim(),
          color: v.color.trim(),
          codigo: v.codigo.trim(),
          imeis,
          stock: p.porImei ? imeis.length : Math.max(0, Math.round(Number(v.stock) || 0)),
          minimo: Math.max(0, Math.round(Number(v.minimo) || 0)),
        }
      }),
    })
  }

  return (
    <div className="fondo-modal" onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <form className="modal" onSubmit={guardar}>
        <div className="panel-cabeza">
          <h2>{producto ? 'Editar producto' : 'Nuevo producto'}</h2>
          <button type="button" className="boton-icono" onClick={onCerrar} aria-label="Cerrar">
            ✕
          </button>
        </div>

        <div className="campos">
          <label className="ancho">
            <span>Nombre / modelo</span>
            <input value={p.nombre} onChange={(e) => cambiar('nombre', e.target.value)} placeholder="Ej: iPhone 15 Pro Max" autoFocus />
          </label>
          <label>
            <span>Categoría</span>
            <input list="categorias-zo" value={p.categoria} onChange={(e) => cambiarCategoria(e.target.value)} placeholder="iPhone, Perfume, Accesorio…" />
            <datalist id="categorias-zo">
              {CATEGORIAS.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </label>
          <label>
            <span>Marca</span>
            <input value={p.marca} onChange={(e) => cambiar('marca', e.target.value)} placeholder="Apple, Chevignon…" />
          </label>
          <label>
            <span>Condición</span>
            <select value={p.condicion || 'Nuevo'} onChange={(e) => cambiar('condicion', e.target.value)}>
              {CONDICIONES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Garantía (días, 0 = sin garantía)</span>
            <input type="number" min="0" value={p.garantiaDias} onChange={(e) => cambiar('garantiaDias', e.target.value)} placeholder="Ej: 365" />
          </label>
          <label>
            <span>Costo (lo que te costó)</span>
            <input type="number" min="0" value={p.costo} onChange={(e) => cambiar('costo', e.target.value)} />
          </label>
          <label>
            <span>Precio de venta</span>
            <input type="number" min="0" value={p.precio} onChange={(e) => cambiar('precio', e.target.value)} />
          </label>
          <label className="ancho casilla">
            <input type="checkbox" checked={!!p.porImei} onChange={(e) => cambiar('porImei', e.target.checked)} />
            <span>Controlar cada equipo por IMEI / serial (recomendado para celulares, MacBook y relojes)</span>
          </label>
        </div>

        <h3 className="sub-titulo">Variantes (capacidad y color)</h3>
        <div className="var-cab">
          <span>Capacidad</span>
          <span>Color</span>
          <span>Código de barras</span>
          <span>{p.porImei ? 'Unidades' : 'Stock'}</span>
          <span>Mínimo</span>
          <span />
        </div>
        {p.variantes.map((v) => (
          <div className="var-bloque" key={v.id}>
            <div className="var-fila">
              <input value={v.talla} onChange={(e) => cambiarVar(v.id, 'talla', e.target.value)} placeholder="Capacidad: 128GB" />
              <input value={v.color} onChange={(e) => cambiarVar(v.id, 'color', e.target.value)} placeholder="Color: Negro" />
              <input
                value={v.codigo}
                onChange={(e) => cambiarVar(v.id, 'codigo', e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()} // el lector manda Enter: que no guarde el formulario
                placeholder="Código de barras (escanéalo aquí)"
              />
              {p.porImei ? (
                <span className="gris centrado">{(v.imeis || []).length} uds</span>
              ) : (
                <input type="number" min="0" value={v.stock} onChange={(e) => cambiarVar(v.id, 'stock', e.target.value)} title="Stock" />
              )}
              <input type="number" min="0" value={v.minimo} onChange={(e) => cambiarVar(v.id, 'minimo', e.target.value)} title="Mínimo" />
              <button type="button" className="boton-icono" onClick={() => quitarVar(v.id)} aria-label="Quitar variante">
                ✕
              </button>
            </div>
            {p.porImei && <GestorImeis imeis={v.imeis || []} onCambiar={(l) => cambiarVar(v.id, 'imeis', l)} ocupados={ocupadosPor(v.id)} />}
          </div>
        ))}
        <button type="button" className="btn chico" onClick={() => setP((x) => ({ ...x, variantes: [...x.variantes, variantVacia()] }))}>
          <Icono nombre="mas" tam={14} /> Agregar variante
        </button>
        <p className="gris" style={{ marginTop: 8 }}>
          Columnas: capacidad · color · código de barras · {p.porImei ? 'unidades (salen de la lista de IMEI)' : 'stock'} · mínimo para avisar.
        </p>

        {error && <p className="error">{error}</p>}

        <div className="modal-pie">
          <button type="button" className="btn" onClick={onCerrar}>
            Cancelar
          </button>
          <button type="submit" className="btn oscuro">
            Guardar producto
          </button>
        </div>
      </form>
    </div>
  )
}

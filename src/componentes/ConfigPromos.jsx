import { useState } from 'react'
import { useProductos, usePromos, guardarPromo, borrarPromo } from '../almacen.js'
import { nuevoId } from '../utils.js'

const VACIA = { nombre: '', alcance: 'todo', objetivo: '', tipo: 'porcentaje', valor: '10', lleva: '2', paga: '1', desde: '', hasta: '' }

const describir = (p, productos) => {
  const donde =
    p.alcance === 'todo' ? 'toda la tienda' : p.alcance === 'categoria' ? `categoría ${p.objetivo}` : productos.find((x) => x.id === p.objetivo)?.nombre || 'producto borrado'
  const que = p.tipo === 'porcentaje' ? `${p.valor}% de descuento` : `lleva ${p.lleva}, paga ${p.paga}`
  return `${que} · ${donde}`
}

// Promociones automáticas que la Caja aplica sola
export default function ConfigPromos() {
  const promos = usePromos()
  const productos = useProductos()
  const [f, setF] = useState(VACIA)
  const [error, setError] = useState('')
  const categorias = [...new Set(productos.map((p) => p.categoria).filter(Boolean))]

  function crear(e) {
    e.preventDefault()
    if (!f.nombre.trim()) return setError('Ponle un nombre a la promoción.')
    if (f.alcance !== 'todo' && !f.objetivo.trim()) return setError('Elige a qué producto o categoría aplica.')
    if (f.tipo === 'porcentaje' && !(Number(f.valor) > 0 && Number(f.valor) <= 100)) return setError('El porcentaje debe estar entre 1 y 100.')
    if (f.tipo === 'nxm' && !(Number(f.lleva) > Number(f.paga) && Number(f.paga) >= 0)) return setError('"Lleva" debe ser mayor que "paga" (por ejemplo lleva 3, paga 2).')
    setError('')
    guardarPromo({
      id: nuevoId(),
      nombre: f.nombre.trim(),
      alcance: f.alcance,
      objetivo: f.alcance === 'todo' ? '' : f.objetivo.trim(),
      tipo: f.tipo,
      valor: Number(f.valor),
      lleva: Number(f.lleva),
      paga: Number(f.paga),
      desde: f.desde,
      hasta: f.hasta,
      activa: true,
    })
    setF(VACIA)
  }

  return (
    <div className="panel">
      <div className="panel-cabeza">
        <div>
          <h2>Promociones</h2>
          <p className="sub">Se aplican solas en la Caja. Si varias aplican a una unidad, gana la que más descuenta.</p>
        </div>
      </div>

      <form className="campos" onSubmit={crear}>
        <label className="ancho">
          <span>Nombre</span>
          <input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} placeholder="Ej: Descuento en accesorios" />
        </label>
        <label>
          <span>Aplica a</span>
          <select value={f.alcance} onChange={(e) => setF({ ...f, alcance: e.target.value, objetivo: '' })}>
            <option value="todo">Toda la tienda</option>
            <option value="categoria">Una categoría</option>
            <option value="producto">Un producto</option>
          </select>
        </label>
        {f.alcance === 'categoria' && (
          <label>
            <span>Categoría</span>
            <input list="lista-categorias" value={f.objetivo} onChange={(e) => setF({ ...f, objetivo: e.target.value })} />
            <datalist id="lista-categorias">
              {categorias.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </label>
        )}
        {f.alcance === 'producto' && (
          <label>
            <span>Producto</span>
            <select value={f.objetivo} onChange={(e) => setF({ ...f, objetivo: e.target.value })}>
              <option value="">Elige…</option>
              {productos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          <span>Tipo</span>
          <select value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })}>
            <option value="porcentaje">Porcentaje de descuento</option>
            <option value="nxm">Lleva N, paga M (2x1, 3x2…)</option>
          </select>
        </label>
        {f.tipo === 'porcentaje' ? (
          <label>
            <span>Porcentaje (%)</span>
            <input type="number" min="1" max="100" value={f.valor} onChange={(e) => setF({ ...f, valor: e.target.value })} />
          </label>
        ) : (
          <>
            <label>
              <span>Lleva</span>
              <input type="number" min="2" value={f.lleva} onChange={(e) => setF({ ...f, lleva: e.target.value })} />
            </label>
            <label>
              <span>Paga</span>
              <input type="number" min="0" value={f.paga} onChange={(e) => setF({ ...f, paga: e.target.value })} />
            </label>
          </>
        )}
        <label>
          <span>Desde (opcional)</span>
          <input type="date" value={f.desde} onChange={(e) => setF({ ...f, desde: e.target.value })} />
        </label>
        <label>
          <span>Hasta (opcional)</span>
          <input type="date" value={f.hasta} onChange={(e) => setF({ ...f, hasta: e.target.value })} />
        </label>
        <div className="ancho">
          {error && <p className="error">{error}</p>}
          <button className="btn oscuro" type="submit">
            Crear promoción
          </button>
        </div>
      </form>

      {promos.length > 0 && (
        <table className="tabla" style={{ marginTop: 18 }}>
          <thead>
            <tr>
              <th>Promoción</th>
              <th>Vigencia</th>
              <th>Estado</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {promos.map((p) => (
              <tr key={p.id}>
                <td>
                  <strong>{p.nombre}</strong>
                  <small className="gris">{describir(p, productos)}</small>
                </td>
                <td className="gris">{p.desde || p.hasta ? `${p.desde || '…'} → ${p.hasta || '…'}` : 'Sin fecha'}</td>
                <td>
                  <button className={'badge ' + (p.activa ? 'ok' : 'agotado')} style={{ border: 0, cursor: 'pointer' }} onClick={() => guardarPromo({ ...p, activa: !p.activa })}>
                    {p.activa ? 'Activa' : 'Pausada'}
                  </button>
                </td>
                <td className="acciones">
                  <button className="enlace peligro" onClick={() => confirm(`¿Borrar "${p.nombre}"?`) && borrarPromo(p.id)}>
                    Borrar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

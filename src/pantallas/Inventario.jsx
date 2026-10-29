import { useState } from 'react'
import Icono from '../componentes/Iconos.jsx'
import FormProducto from '../componentes/FormProducto.jsx'
import HistorialProducto from '../componentes/HistorialProducto.jsx'
import { useConfig, useProductos, useVentas, guardarProducto, borrarProducto, reemplazarProductos } from '../almacen.js'
import { useUsuario } from '../auth.js'
import { listarCategorias } from '../categorias.js'
import { csvAProductos, productosACSV, PLANTILLA_CSV, descargar } from '../csv.js'
import { dinero } from '../utils.js'
import { analizarInventario, TEXTO_NIVEL } from '../inteligente.js'

// Estado de un producto según el stock de sus variantes
function estado(p) {
  const total = p.variantes.reduce((s, v) => s + v.stock, 0)
  if (total === 0) return { clase: 'agotado', texto: 'Agotado', total }
  if (p.variantes.some((v) => v.stock <= v.minimo)) return { clase: 'bajo', texto: 'Stock bajo', total }
  return { clase: 'ok', texto: 'En stock', total }
}

export default function Inventario() {
  const productos = useProductos()
  const ventas = useVentas()
  const config = useConfig()
  const porReponer = analizarInventario(productos, ventas)
  const admin = useUsuario()?.rol === 'admin'
  const [buscar, setBuscar] = useState('')
  const [categoria, setCategoria] = useState(null) // null = Todas; si no, la clave de la categoría elegida
  const [editando, setEditando] = useState(null) // null = cerrado, 'nuevo', { nuevoEn } o un producto
  const [historial, setHistorial] = useState(null)

  const q = buscar.trim().toLowerCase()
  const coincide = (p) =>
    !q ||
    p.nombre.toLowerCase().includes(q) ||
    p.categoria.toLowerCase().includes(q) ||
    p.variantes.some((v) => v.codigo.toLowerCase().includes(q) || (v.imeis || []).some((m) => m.toLowerCase().includes(q)))

  // las categorías en su orden; la elegida muestra solo su lista, "Todas" muestra todo en ese mismo orden
  const categorias = listarCategorias(productos, config.categorias)
  const elegida = categorias.find((c) => c.clave === categoria) || null
  const lista = (elegida ? [elegida] : categorias).flatMap((c) => c.items).filter(coincide)

  const unidades = productos.reduce((s, p) => s + estado(p).total, 0)
  const valorCosto = productos.reduce((s, p) => s + p.costo * estado(p).total, 0)

  const nuevo = () => setEditando(elegida ? { nuevoEn: elegida.clave === 'sincategoria' ? '' : elegida.nombre } : 'nuevo')

  function importar(e) {
    const archivo = e.target.files[0]
    e.target.value = ''
    if (!archivo) return
    const lector = new FileReader()
    lector.onload = () => {
      try {
        const { productos: nuevos, resumen: r } = csvAProductos(String(lector.result), productos)
        const msg =
          `Se va a importar:\n• ${r.productosNuevos} productos nuevos\n• ${r.productosActualizados} productos actualizados\n` +
          `• ${r.variantesNuevas} variantes nuevas · ${r.variantesActualizadas} actualizadas\n` +
          (r.imeisNuevos ? `• ${r.imeisNuevos} IMEI / seriales nuevos\n` : '') +
          (r.imeisRechazados ? `• ${r.imeisRechazados} IMEI se omiten (repetidos o inválidos)\n` : '') +
          (r.omitidas ? `• ${r.omitidas} filas sin nombre se omiten\n` : '') +
          '\nNo se borra nada de lo que ya tienes. ¿Continuar?'
        if (confirm(msg)) reemplazarProductos(nuevos)
      } catch (err) {
        alert(err.message || 'No se pudo leer el archivo.')
      }
    }
    lector.readAsText(archivo)
  }

  return (
    <>
      <div className="cabecera">
        <div>
          <p className="kicker">Todo lo que hay en la tienda</p>
          <h1 className="titulo">Inventario</h1>
          <p className="subtitulo">
            {productos.length} modelos · {unidades} unidades{admin && ` · ${dinero(valorCosto)} a costo`}
          </p>
        </div>
        {admin && (
          <div className="cabecera-acciones">
            <label className="btn" style={{ cursor: 'pointer' }}>
              <Icono nombre="subir" tam={18} /> Importar CSV
              <input type="file" accept=".csv,text/csv" onChange={importar} hidden />
            </label>
            <button className="btn" onClick={() => descargar('inventario-zona-originals.csv', productosACSV(productos))}>
              <Icono nombre="descargar" tam={18} /> Exportar
            </button>
            <button className="btn oscuro" onClick={nuevo}>
              <Icono nombre="mas" tam={18} /> {elegida ? `Nuevo en ${elegida.nombre}` : 'Nuevo producto'}
            </button>
          </div>
        )}
      </div>

      {porReponer.length > 0 && !q && (
        <div className="aviso-legal" style={{ marginBottom: 16 }}>
          <strong>Por reponer ({porReponer.length}):</strong> según lo que vendiste en los últimos 30 días.
          <table className="tabla" style={{ marginTop: 8 }}>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Estado</th>
                <th>Hay</th>
                <th>Vendió (30 d)</th>
                <th>Le alcanza</th>
                <th>Sugerido pedir</th>
              </tr>
            </thead>
            <tbody>
              {porReponer.slice(0, 12).map((f) => (
                <tr key={f.productoId + f.nombre}>
                  <td>{f.nombre}</td>
                  <td>
                    <span className={'badge ' + (f.nivel === 'pronto' ? 'bajo' : f.nivel === 'bajo' ? 'bajo' : 'agotado')}>{TEXTO_NIVEL[f.nivel]}</span>
                  </td>
                  <td>{f.stock}</td>
                  <td>{f.vendidas30}</td>
                  <td>{f.dias === null ? '—' : f.dias + ' días'}</td>
                  <td>
                    <strong>{f.pedir}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="cat-barra" role="tablist" aria-label="Categorías">
        <button className={!categoria ? 'activo' : ''} onClick={() => setCategoria(null)}>
          Todas <b>{productos.length}</b>
        </button>
        {categorias.map((c) => (
          <button key={c.clave} className={categoria === c.clave ? 'activo' : ''} onClick={() => setCategoria(c.clave)}>
            {c.nombre} <b>{c.productos}</b>
          </button>
        ))}
      </div>

      <div className="panel">
        <div className="filtros">
          <label className="buscar" style={{ flex: 1 }}>
            <Icono nombre="buscar" tam={18} />
            <input placeholder="Buscar por nombre, código o IMEI" value={buscar} onChange={(e) => setBuscar(e.target.value)} />
          </label>
          {admin && (
            <button className="enlace" onClick={() => descargar('plantilla-inventario.csv', PLANTILLA_CSV)}>
              Descargar plantilla
            </button>
          )}
        </div>

        {lista.length === 0 ? (
          <div className="vacio">
            {q
              ? 'Nada coincide con tu búsqueda.'
              : elegida
                ? `Todavía no hay productos en ${elegida.nombre}.`
                : 'Aún no hay productos. Crea uno con "Nuevo producto" o importa un CSV.'}
            {admin && !q && (
              <button className="btn oscuro chico" style={{ marginTop: 12 }} onClick={nuevo}>
                {elegida ? `Agregar el primero en ${elegida.nombre}` : 'Nuevo producto'}
              </button>
            )}
          </div>
        ) : (
          <table className="tabla">
            <thead>
              <tr>
                <th>Producto</th>
                {!elegida && <th>Categoría</th>}
                <th>Variantes</th>
                <th>Stock</th>
                {admin && <th>Costo</th>}
                <th>Precio</th>
                <th>Estado</th>
                {admin && <th />}
              </tr>
            </thead>
            <tbody>
              {lista.map((p) => {
                const e = estado(p)
                return (
                  <tr key={p.id}>
                    <td>
                      <strong>{p.nombre}</strong>
                      <small className="gris">
                        {[p.marca, p.condicion && p.condicion !== 'Nuevo' ? p.condicion : '', p.garantiaDias ? `Garantía ${p.garantiaDias} d` : ''].filter(Boolean).join(' · ') || ' '}
                      </small>
                    </td>
                    {!elegida && <td>{p.categoria || 'Sin categoría'}</td>}
                    <td>
                      <div className="chips">
                        {p.variantes.map((v) => (
                          <span key={v.id} className={'chip' + (v.stock <= v.minimo ? ' alerta' : '')}>
                            {[v.talla, v.color].filter(Boolean).join(' ') || 'Única'} · {v.stock}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>{e.total}</td>
                    {admin && <td>{dinero(p.costo)}</td>}
                    <td>
                      <strong>{dinero(p.precio)}</strong>
                    </td>
                    <td>
                      <span className={'badge ' + e.clase}>{e.texto}</span>
                    </td>
                    {admin && (
                      <td className="acciones">
                        <button className="enlace" onClick={() => setHistorial(p)}>
                          Historial
                        </button>
                        <button className="enlace" style={{ marginLeft: 10 }} onClick={() => setEditando(p)}>
                          Editar
                        </button>
                        <button className="enlace peligro" onClick={() => confirm(`¿Borrar "${p.nombre}"?`) && borrarProducto(p.id)}>
                          Borrar
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {editando && (
        <FormProducto
          producto={editando === 'nuevo' || editando.nuevoEn !== undefined ? null : editando}
          categoriaInicial={editando.nuevoEn || ''}
          onGuardar={(p) => {
            guardarProducto(p)
            setEditando(null)
          }}
          onCerrar={() => setEditando(null)}
        />
      )}
      {historial && <HistorialProducto producto={historial} onCerrar={() => setHistorial(null)} />}
    </>
  )
}

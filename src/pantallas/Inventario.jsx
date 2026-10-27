import { useState } from 'react'
import Icono from '../componentes/Iconos.jsx'
import FormProducto from '../componentes/FormProducto.jsx'
import HistorialProducto from '../componentes/HistorialProducto.jsx'
import { useProductos, guardarProducto, borrarProducto, reemplazarProductos } from '../almacen.js'
import { useUsuario } from '../auth.js'
import { csvAProductos, productosACSV, PLANTILLA_CSV, descargar } from '../csv.js'
import { dinero } from '../utils.js'

// Estado de un producto según el stock de sus variantes
function estado(p) {
  const total = p.variantes.reduce((s, v) => s + v.stock, 0)
  if (total === 0) return { clase: 'agotado', texto: 'Agotado', total }
  if (p.variantes.some((v) => v.stock <= v.minimo)) return { clase: 'bajo', texto: 'Stock bajo', total }
  return { clase: 'ok', texto: 'En stock', total }
}

export default function Inventario() {
  const productos = useProductos()
  const admin = useUsuario()?.rol === 'admin'
  const [buscar, setBuscar] = useState('')
  const [editando, setEditando] = useState(null) // null = cerrado, 'nuevo' o un producto
  const [historial, setHistorial] = useState(null)

  const q = buscar.trim().toLowerCase()
  const lista = productos.filter(
    (p) =>
      !q ||
      p.nombre.toLowerCase().includes(q) ||
      p.categoria.toLowerCase().includes(q) ||
      p.variantes.some((v) => v.codigo.toLowerCase().includes(q) || (v.imeis || []).some((m) => m.toLowerCase().includes(q))),
  )

  const unidades = productos.reduce((s, p) => s + estado(p).total, 0)
  const valorCosto = productos.reduce((s, p) => s + p.costo * estado(p).total, 0)

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
            <button className="btn oscuro" onClick={() => setEditando('nuevo')}>
              <Icono nombre="mas" tam={18} /> Nuevo producto
            </button>
          </div>
        )}
      </div>

      <div className="panel">
        <div className="filtros">
          <label className="buscar" style={{ flex: 1 }}>
            <Icono nombre="buscar" tam={18} />
            <input placeholder="Buscar por nombre, categoría, código o IMEI" value={buscar} onChange={(e) => setBuscar(e.target.value)} />
          </label>
          {admin && (
            <button className="enlace" onClick={() => descargar('plantilla-inventario.csv', PLANTILLA_CSV)}>
              Descargar plantilla
            </button>
          )}
        </div>

        {lista.length === 0 ? (
          <div className="vacio">
            {productos.length === 0
              ? admin
                ? 'Aún no hay productos. Crea uno con "Nuevo producto" o importa un CSV.'
                : 'Aún no hay productos.'
              : 'Nada coincide con tu búsqueda.'}
          </div>
        ) : (
          <table className="tabla">
            <thead>
              <tr>
                <th>Producto</th>
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
                        {[p.categoria, p.marca, p.condicion && p.condicion !== 'Nuevo' ? p.condicion : '', p.garantiaDias ? `Garantía ${p.garantiaDias} d` : '']
                          .filter(Boolean)
                          .join(' · ') || 'Sin categoría'}
                      </small>
                    </td>
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
          producto={editando === 'nuevo' ? null : editando}
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

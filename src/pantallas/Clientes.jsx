import { useState } from 'react'
import Icono from '../componentes/Iconos.jsx'
import { useClientes, useVentas, useAbonos, guardarCliente, borrarCliente } from '../almacen.js'
import { useUsuario } from '../auth.js'
import { dinero, fechaHora, netoVenta, nuevoId, puntosCliente, saldoCliente } from '../utils.js'
import { constanciaAutorizacion } from '../legal.js'
import { abrirVisor } from '../visor.js'

const VACIO = { nombre: '', cedula: '', telefono: '', correo: '', nota: '', autoriza: false }

export default function Clientes() {
  const clientes = useClientes()
  const ventas = useVentas()
  const abonos = useAbonos()
  const admin = useUsuario()?.rol === 'admin'
  const [buscar, setBuscar] = useState('')
  const [editando, setEditando] = useState(null) // null, 'nuevo' o un cliente
  const [form, setForm] = useState(VACIO)
  const [viendo, setViendo] = useState(null)

  const q = buscar.trim().toLowerCase()
  const lista = clientes
    .filter((c) => !q || c.nombre.toLowerCase().includes(q) || (c.telefono || '').includes(q))
    .map((c) => {
      const propias = ventas.filter((v) => v.clienteId === c.id && v.estado !== 'anulada')
      return {
        ...c,
        compras: propias.length,
        gastado: propias.reduce((s, v) => s + netoVenta(v), 0),
        puntos: puntosCliente(c.id, ventas),
        saldo: saldoCliente(c.id, ventas, abonos),
      }
    })

  function abrir(c) {
    setEditando(c)
    setForm(c === 'nuevo' ? VACIO : { ...VACIO, ...c })
  }

  function guardar(e) {
    e.preventDefault()
    if (!form.nombre.trim()) return
    // la autorización es obligatoria; si ya la había, se conserva la constancia original
    const previa = editando !== 'nuevo' ? editando.autorizacion : null
    if (!previa && !form.autoriza) return alert('Marca que el cliente autorizó el tratamiento de sus datos. Es obligatorio guardarlo con su autorización.')
    guardarCliente({
      id: editando === 'nuevo' ? nuevoId() : editando.id,
      nombre: form.nombre.trim(),
      cedula: form.cedula.trim(),
      telefono: form.telefono.trim(),
      correo: form.correo.trim(),
      nota: form.nota.trim(),
      autorizacion: previa || constanciaAutorizacion(),
    })
    setEditando(null)
  }

  const historial = viendo ? ventas.filter((v) => v.clienteId === viendo.id) : []

  return (
    <>
      <div className="cabecera">
        <div>
          <p className="kicker">Tu cartera de clientes</p>
          <h1 className="titulo">Clientes</h1>
          <p className="subtitulo">{clientes.length} clientes · los puntos se ganan al comprar y se usan en la Caja</p>
        </div>
        <div className="cabecera-acciones">
          <button className="btn oscuro" onClick={() => abrir('nuevo')}>
            <Icono nombre="mas" tam={18} /> Nuevo cliente
          </button>
        </div>
      </div>

      <div className="panel">
        <div className="filtros">
          <label className="buscar" style={{ flex: 1, maxWidth: 380 }}>
            <Icono nombre="buscar" tam={18} />
            <input placeholder="Buscar por nombre o teléfono" value={buscar} onChange={(e) => setBuscar(e.target.value)} />
          </label>
        </div>

        {lista.length === 0 ? (
          <div className="vacio">{clientes.length === 0 ? 'Aún no hay clientes. Se crean aquí o al vender con fiado.' : 'Nadie coincide con tu búsqueda.'}</div>
        ) : (
          <table className="tabla">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Compras</th>
                <th>Total comprado</th>
                <th>Puntos</th>
                <th>Debe</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lista.map((c) => (
                <tr key={c.id}>
                  <td>
                    <strong>{c.nombre}</strong>
                    <small className="gris">{[c.telefono, c.correo].filter(Boolean).join(' · ') || 'Sin contacto'}</small>
                    {!c.autorizacion && <small className="promo-txt" style={{ color: 'var(--rojo)' }}>Sin autorización de datos</small>}
                  </td>
                  <td>{c.compras}</td>
                  <td>{dinero(c.gastado)}</td>
                  <td>
                    <span className="badge ok">{c.puntos} pts</span>
                  </td>
                  <td>{c.saldo > 0 ? <strong style={{ color: 'var(--rojo)' }}>{dinero(c.saldo)}</strong> : '—'}</td>
                  <td className="acciones">
                    <button className="enlace" onClick={() => setViendo(c)}>
                      Compras
                    </button>
                    <button className="enlace" style={{ marginLeft: 10 }} onClick={() => abrir(c)}>
                      Editar
                    </button>
                    {admin && (
                      <button
                        className="enlace peligro"
                        onClick={() => {
                          if (c.saldo > 0) return alert('Este cliente tiene una deuda pendiente, no se puede borrar.')
                          if (confirm(`¿Borrar a "${c.nombre}"? Sus ventas quedan guardadas.`)) borrarCliente(c.id)
                        }}
                      >
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

      {editando && (
        <div className="fondo-modal" onMouseDown={(e) => e.target === e.currentTarget && setEditando(null)}>
          <form className="modal modal-chico" onSubmit={guardar}>
            <div className="panel-cabeza">
              <h2>{editando === 'nuevo' ? 'Nuevo cliente' : 'Editar cliente'}</h2>
              <button type="button" className="boton-icono" onClick={() => setEditando(null)} aria-label="Cerrar">
                ✕
              </button>
            </div>
            <div className="campos">
              <label className="ancho">
                <span>Nombre</span>
                <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} autoFocus />
              </label>
              <label>
                <span>Cédula (para créditos y garantías)</span>
                <input value={form.cedula} onChange={(e) => setForm({ ...form, cedula: e.target.value })} />
              </label>
              <label>
                <span>Teléfono</span>
                <input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
              </label>
              <label>
                <span>Correo</span>
                <input value={form.correo} onChange={(e) => setForm({ ...form, correo: e.target.value })} />
              </label>
              <label className="ancho">
                <span>Nota (modelo favorito, gustos…)</span>
                <input value={form.nota} onChange={(e) => setForm({ ...form, nota: e.target.value })} />
              </label>
            </div>
            {editando !== 'nuevo' && editando.autorizacion ? (
              <p className="gris" style={{ marginTop: 10 }}>
                Autorizó el tratamiento de sus datos el {fechaHora(editando.autorizacion.fecha)}.
              </p>
            ) : (
              <label className="casilla-acepto" style={{ marginTop: 12 }}>
                <input type="checkbox" checked={form.autoriza} onChange={(e) => setForm({ ...form, autoriza: e.target.checked })} />
                <span>
                  El cliente fue informado y <strong>autorizó</strong> el tratamiento de sus datos (Ley 1581 de 2012).{' '}
                  <button type="button" className="enlace" onClick={() => abrirVisor('legal', 'clientes')}>
                    Ver texto de autorización
                  </button>
                </span>
              </label>
            )}
            <div className="modal-pie">
              <button type="button" className="btn" onClick={() => setEditando(null)}>
                Cancelar
              </button>
              <button type="submit" className="btn oscuro">
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}

      {viendo && (
        <div className="fondo-modal" onMouseDown={(e) => e.target === e.currentTarget && setViendo(null)}>
          <div className="modal">
            <div className="panel-cabeza">
              <div>
                <h2>{viendo.nombre}</h2>
                <p className="sub">{viendo.nota || 'Historial de compras'}</p>
              </div>
              <button className="boton-icono" onClick={() => setViendo(null)} aria-label="Cerrar">
                ✕
              </button>
            </div>
            {historial.length === 0 ? (
              <div className="vacio">Este cliente todavía no tiene compras.</div>
            ) : (
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Venta</th>
                    <th>Fecha</th>
                    <th>Unidades</th>
                    <th>Total</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {historial.map((v) => (
                    <tr key={v.id}>
                      <td>#{String(v.numero).padStart(5, '0')}</td>
                      <td>{fechaHora(v.fecha)}</td>
                      <td>{v.items.map((i) => `${i.cantidad} ${i.nombre}`).join(', ')}</td>
                      <td>{dinero(v.total)}</td>
                      <td>{v.estado === 'anulada' ? 'Anulada' : 'Completada'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="modal-pie">
              <button className="btn oscuro" onClick={() => setViendo(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

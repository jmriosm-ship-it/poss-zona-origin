import { useState } from 'react'
import { useUsuarios, guardarUsuario, borrarUsuario } from '../almacen.js'
import { useUsuario, hashPin, nombreRol } from '../auth.js'
import { nuevoId } from '../utils.js'

const PANTALLAS_EXTRA = [
  ['clientes', 'Clientes'],
  ['ventas', 'Ventas (solo las suyas)'],
  ['deudas', 'Deudas'],
]

// Permisos extra de un trabajador
function Permisos({ u }) {
  const p = u.permisos || {}
  const poner = (cambio) => guardarUsuario({ ...u, permisos: { ...p, ...cambio } })
  const pantallas = p.pantallas || []
  return (
    <div className="campos" style={{ padding: '6px 0' }}>
      <div className="ancho">
        <small className="gris">Además de Caja e Inventario, puede ver:</small>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 4 }}>
          {PANTALLAS_EXTRA.map(([k, t]) => (
            <label key={k} className="casilla-acepto">
              <input type="checkbox" checked={pantallas.includes(k)} onChange={(e) => poner({ pantallas: e.target.checked ? [...pantallas, k] : pantallas.filter((x) => x !== k) })} />
              <span>{t}</span>
            </label>
          ))}
          <label className="casilla-acepto">
            <input type="checkbox" checked={Boolean(p.anular)} onChange={(e) => poner({ anular: e.target.checked })} />
            <span>Puede anular ventas y hacer devoluciones</span>
          </label>
        </div>
      </div>
      <label>
        <span>Descuento máximo sin PIN (%)</span>
        <input type="number" min="0" max="100" value={p.descuentoMax ?? 10} onChange={(e) => poner({ descuentoMax: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })} style={{ width: 90 }} />
      </label>
    </div>
  )
}

// Usuarios del sistema: el administrador ve todo; el trabajador solo ve la Caja y el Inventario
export default function ConfigUsuarios() {
  const usuarios = useUsuarios()
  const yo = useUsuario()
  const [f, setF] = useState({ nombre: '', rol: 'vendedor', pin: '' })
  const [error, setError] = useState('')
  const [cambiando, setCambiando] = useState(null)
  const [pinNuevo, setPinNuevo] = useState('')
  const [permisosDe, setPermisosDe] = useState(null)

  const soloNumeros = (t) => t.replace(/\D/g, '').slice(0, 6)

  async function crear(e) {
    e.preventDefault()
    if (!f.nombre.trim()) return setError('Escribe el nombre.')
    if (f.pin.length < 4) return setError('El PIN debe tener entre 4 y 6 números.')
    setError('')
    guardarUsuario({ id: nuevoId(), nombre: f.nombre.trim(), rol: f.rol, pinHash: await hashPin(f.pin) })
    setF({ nombre: '', rol: 'vendedor', pin: '' })
  }

  async function guardarPin(u) {
    if (pinNuevo.length < 4) return alert('El PIN debe tener entre 4 y 6 números.')
    guardarUsuario({ ...u, pinHash: await hashPin(pinNuevo) })
    setCambiando(null)
    setPinNuevo('')
  }

  function borrar(u) {
    const admins = usuarios.filter((x) => x.rol === 'admin')
    if (u.id === yo?.id) return alert('No puedes borrar tu propio usuario.')
    if (u.rol === 'admin' && admins.length === 1) return alert('Debe quedar al menos un administrador.')
    if (confirm(`¿Borrar a ${u.nombre}? Sus ventas quedan guardadas.`)) borrarUsuario(u.id)
  }

  return (
    <div className="panel">
      <div className="panel-cabeza">
        <div>
          <h2>Usuarios</h2>
          <p className="sub">El trabajador solo ve la Caja y el Inventario (sin costos y sin poder editarlo). El administrador ve todo.</p>
        </div>
      </div>

      <form className="inline-form" onSubmit={crear}>
        <input placeholder="Nombre" value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} />
        <select value={f.rol} onChange={(e) => setF({ ...f, rol: e.target.value })}>
          <option value="vendedor">Trabajador (solo Caja e Inventario)</option>
          <option value="admin">Administrador</option>
        </select>
        <input type="password" inputMode="numeric" placeholder="PIN (4 a 6 números)" value={f.pin} onChange={(e) => setF({ ...f, pin: soloNumeros(e.target.value) })} />
        <button className="btn oscuro chico" type="submit">
          Crear usuario
        </button>
      </form>
      {error && <p className="error">{error}</p>}

      <table className="tabla" style={{ marginTop: 14 }}>
        <thead>
          <tr>
            <th>Usuario</th>
            <th>Rol</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {usuarios.flatMap((u) => [
            <tr key={u.id}>
              <td>
                <strong>{u.nombre}</strong> {u.id === yo?.id && <span className="chip">Tú</span>}
              </td>
              <td>{nombreRol(u.rol)}</td>
              <td className="acciones">
                {cambiando === u.id ? (
                  <span className="inline-form" style={{ display: 'inline-flex', marginBottom: 0 }}>
                    <input type="password" inputMode="numeric" placeholder="Nuevo PIN" value={pinNuevo} onChange={(e) => setPinNuevo(soloNumeros(e.target.value))} style={{ width: 110 }} />
                    <button className="btn chico oscuro" onClick={() => guardarPin(u)}>
                      Guardar
                    </button>
                  </span>
                ) : (
                  <>
                    {u.rol !== 'admin' && (
                      <button className="enlace" onClick={() => setPermisosDe(permisosDe === u.id ? null : u.id)}>
                        Permisos
                      </button>
                    )}
                    <button className="enlace" onClick={() => setCambiando(u.id)}>
                      Cambiar PIN
                    </button>
                    <button className="enlace peligro" onClick={() => borrar(u)}>
                      Borrar
                    </button>
                  </>
                )}
              </td>
            </tr>,
            permisosDe === u.id && (
              <tr key={u.id + 'p'}>
                <td colSpan={3}>
                  <Permisos u={u} />
                </td>
              </tr>
            ),
          ])}
        </tbody>
      </table>
    </div>
  )
}

import { useState } from 'react'
import { useUsuarios, guardarUsuario, borrarUsuario } from '../almacen.js'
import { useUsuario, hashPin } from '../auth.js'
import { nuevoId } from '../utils.js'

// Usuarios del sistema: el administrador ve todo; el vendedor solo vende
export default function ConfigUsuarios() {
  const usuarios = useUsuarios()
  const yo = useUsuario()
  const [f, setF] = useState({ nombre: '', rol: 'vendedor', pin: '' })
  const [error, setError] = useState('')
  const [cambiando, setCambiando] = useState(null)
  const [pinNuevo, setPinNuevo] = useState('')

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
          <p className="sub">El vendedor solo ve Caja, Ventas propias, Inventario (sin costos) y Clientes.</p>
        </div>
      </div>

      <form className="inline-form" onSubmit={crear}>
        <input placeholder="Nombre" value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} />
        <select value={f.rol} onChange={(e) => setF({ ...f, rol: e.target.value })}>
          <option value="vendedor">Vendedor</option>
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
          {usuarios.map((u) => (
            <tr key={u.id}>
              <td>
                <strong>{u.nombre}</strong> {u.id === yo?.id && <span className="chip">Tú</span>}
              </td>
              <td>{u.rol === 'admin' ? 'Administrador' : 'Vendedor'}</td>
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
                    <button className="enlace" onClick={() => setCambiando(u.id)}>
                      Cambiar PIN
                    </button>
                    <button className="enlace peligro" onClick={() => borrar(u)}>
                      Borrar
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

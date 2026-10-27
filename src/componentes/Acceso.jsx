import { useState } from 'react'
import { useUsuarios, guardarUsuario } from '../almacen.js'
import { hashPin, iniciarSesion } from '../auth.js'
import { nuevoId } from '../utils.js'
import { abrirVisor } from '../visor.js'

// Pantalla de entrada: crea el administrador la primera vez y luego pide el PIN
export default function Acceso() {
  const usuarios = useUsuarios()
  const [elegido, setElegido] = useState(null)
  const [pin, setPin] = useState('')
  const [pin2, setPin2] = useState('')
  const [nombre, setNombre] = useState('')
  const [error, setError] = useState('')

  const soloNumeros = (t) => t.replace(/\D/g, '').slice(0, 6)

  async function crearAdmin(e) {
    e.preventDefault()
    if (!nombre.trim()) return setError('Escribe tu nombre.')
    if (pin.length < 4) return setError('El PIN debe tener entre 4 y 6 números.')
    if (pin !== pin2) return setError('Los dos PIN no coinciden.')
    const usuario = { id: nuevoId(), nombre: nombre.trim(), rol: 'admin', pinHash: await hashPin(pin) }
    guardarUsuario(usuario)
    iniciarSesion(usuario.id)
  }

  async function entrar(e) {
    e.preventDefault()
    if ((await hashPin(pin)) !== elegido.pinHash) {
      setPin('')
      return setError('PIN incorrecto.')
    }
    iniciarSesion(elegido.id)
  }

  return (
    <div className="acceso">
      <div className="acceso-caja">
        <img src="./logo.png" alt="Zona Originals" />
        <p className="acceso-sub">Punto de venta</p>

        {usuarios.length === 0 ? (
          <form onSubmit={crearAdmin}>
            <h2>Primera vez: crea el administrador</h2>
            <p className="gris">Esta persona podrá ver todo y crear los usuarios de los vendedores.</p>
            <input placeholder="Tu nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} autoFocus />
            <input type="password" inputMode="numeric" placeholder="PIN (4 a 6 números)" value={pin} onChange={(e) => setPin(soloNumeros(e.target.value))} />
            <input type="password" inputMode="numeric" placeholder="Repite el PIN" value={pin2} onChange={(e) => setPin2(soloNumeros(e.target.value))} />
            {error && <p className="error">{error}</p>}
            <button className="btn oscuro" type="submit">
              Crear y entrar
            </button>
          </form>
        ) : !elegido ? (
          <div>
            <h2>¿Quién eres?</h2>
            <div className="acceso-usuarios">
              {usuarios.map((u) => (
                <button key={u.id} className="acceso-usuario" onClick={() => { setElegido(u); setError(''); setPin('') }}>
                  <span className="avatar">{u.nombre.slice(0, 2).toUpperCase()}</span>
                  <span>
                    <strong>{u.nombre}</strong>
                    <small>{u.rol === 'admin' ? 'Administrador' : 'Vendedor'}</small>
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <form onSubmit={entrar}>
            <h2>Hola, {elegido.nombre}</h2>
            <input type="password" inputMode="numeric" placeholder="Tu PIN" value={pin} onChange={(e) => setPin(soloNumeros(e.target.value))} autoFocus />
            {error && <p className="error">{error}</p>}
            <button className="btn oscuro" type="submit">
              Entrar
            </button>
            <button className="btn" type="button" onClick={() => setElegido(null)}>
              Cambiar de usuario
            </button>
          </form>
        )}
        <p className="pie-legal">
          <button onClick={() => abrirVisor('legal', 'privacidad')}>Privacidad</button>·<button onClick={() => abrirVisor('legal', 'terminos')}>Términos</button>·
          <button onClick={() => abrirVisor('ayuda')}>Ayuda</button>
        </p>
      </div>
    </div>
  )
}

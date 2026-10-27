import { useState } from 'react'
import { supabase } from '../nube.js'
import { abrirVisor } from '../visor.js'

// Primera pantalla: la cuenta del negocio en la nube (el mismo correo y contraseña en todos los computadores)
export default function AccesoNube({ onSinNube }) {
  const [correo, setCorreo] = useState('')
  const [clave, setClave] = useState('')
  const [error, setError] = useState('')
  const [entrando, setEntrando] = useState(false)

  async function entrar(e) {
    e.preventDefault()
    if (!correo.trim() || !clave) return setError('Escribe el correo y la contraseña de la cuenta.')
    setEntrando(true)
    setError('')
    try {
      const { error: fallo } = await supabase.auth.signInWithPassword({ email: correo.trim(), password: clave })
      if (fallo) {
        setError(
          /invalid login|credentials/i.test(fallo.message)
            ? 'Correo o contraseña incorrectos.'
            : /fetch|network/i.test(fallo.message)
              ? 'Sin conexión. La primera vez necesitas internet para iniciar sesión.'
              : fallo.message,
        )
      }
      // si todo sale bien, la app detecta la sesión sola y sigue
    } catch {
      setError('Sin conexión. La primera vez necesitas internet para iniciar sesión.')
    }
    setEntrando(false)
  }

  return (
    <div className="acceso">
      <div className="acceso-caja">
        <img src="./logo.png" alt="Zona Originals" />
        <p className="acceso-sub">Punto de venta</p>
        <form onSubmit={entrar}>
          <h2>Cuenta del negocio</h2>
          <p className="gris">Inicia sesión para guardar los datos en la nube y compartirlos entre computadores.</p>
          <input type="email" autoComplete="username" placeholder="Correo" value={correo} onChange={(e) => setCorreo(e.target.value)} autoFocus />
          <input type="password" autoComplete="current-password" placeholder="Contraseña" value={clave} onChange={(e) => setClave(e.target.value)} />
          {error && <p className="error">{error}</p>}
          <button className="btn oscuro" type="submit" disabled={entrando}>
            {entrando ? 'Entrando…' : 'Iniciar sesión'}
          </button>
          <button className="btn" type="button" onClick={onSinNube}>
            Seguir sin nube por ahora
          </button>
          <p className="gris">Sin nube, los datos quedan solo en este computador.</p>
        </form>
        <p className="pie-legal">
          <button onClick={() => abrirVisor('legal', 'privacidad')}>Privacidad</button>·<button onClick={() => abrirVisor('legal', 'terminos')}>Términos</button>·
          <button onClick={() => abrirVisor('ayuda')}>Ayuda</button>
        </p>
      </div>
    </div>
  )
}

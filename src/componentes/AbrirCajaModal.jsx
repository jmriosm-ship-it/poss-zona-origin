import { useState } from 'react'
import { abrirCaja } from '../almacen.js'
import { useUsuario } from '../auth.js'
import { useCajaActual } from '../equipo.js'

// Ventana para abrir la caja: se escribe la base inicial (el efectivo con el que se empieza)
export default function AbrirCajaModal({ onCerrar }) {
  const usuario = useUsuario()
  const caja = useCajaActual()
  const [inicial, setInicial] = useState('')

  function abrir(e) {
    e.preventDefault()
    abrirCaja(Number(inicial) || 0, usuario)
    onCerrar()
  }

  return (
    <div className="fondo-modal">
      <form className="modal modal-chico" onSubmit={abrir}>
        <div className="panel-cabeza">
          <div>
            <h2>Abrir {caja}</h2>
            <p className="sub">{usuario ? usuario.nombre + ', ' : ''}¿con cuánto efectivo empiezas? Es la base para dar cambio.</p>
          </div>
        </div>
        <label className="campo">
          Base inicial
          <input type="number" min="0" autoFocus placeholder="0" value={inicial} onChange={(e) => setInicial(e.target.value)} />
        </label>
        <div className="modal-pie">
          <button type="button" className="btn" onClick={onCerrar}>
            Ahora no
          </button>
          <button type="submit" className="btn oscuro">
            Abrir caja
          </button>
        </div>
      </form>
    </div>
  )
}

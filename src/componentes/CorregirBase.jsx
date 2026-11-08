import { useState } from 'react'
import { corregirBaseCaja } from '../almacen.js'
import { useUsuario } from '../auth.js'
import PedirPinAdmin from './PedirPinAdmin.jsx'
import { dinero } from '../utils.js'

// Corregir la base inicial de la caja abierta (por ejemplo si se olvidó ponerla al abrir).
// El administrador lo hace directo; un trabajador necesita el PIN del administrador. Queda en el registro de acciones.
export default function CorregirBase({ turno, onCerrar }) {
  const usuario = useUsuario()
  const [base, setBase] = useState(String(turno.inicial || ''))
  const [pidePin, setPidePin] = useState(false)
  const nueva = Number(base)
  const valida = base !== '' && Number.isFinite(nueva) && nueva >= 0

  function guardar() {
    corregirBaseCaja(turno.id, nueva)
    onCerrar()
  }

  function enviar(e) {
    e.preventDefault()
    if (!valida) return
    if (usuario?.rol === 'admin') guardar()
    else setPidePin(true)
  }

  return (
    <div className="fondo-modal" onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <form className="modal modal-chico" onSubmit={enviar}>
        <div className="panel-cabeza">
          <div>
            <h2>Corregir la base inicial</h2>
            <p className="sub">Base actual: {dinero(turno.inicial)}. El efectivo esperado del cierre se recalcula con la nueva.</p>
          </div>
          <button type="button" className="boton-icono" onClick={onCerrar} aria-label="Cerrar">
            ✕
          </button>
        </div>
        <label className="cupo-sacar">
          <span>¿Con cuánto efectivo se abrió la caja?</span>
          <div>
            <b>$</b>
            <input type="number" min="0" autoFocus placeholder="0" value={base} onChange={(e) => setBase(e.target.value)} />
          </div>
        </label>
        <div className="modal-pie">
          <button type="button" className="btn" onClick={onCerrar}>
            Cancelar
          </button>
          <button type="submit" className="btn oscuro" disabled={!valida}>
            Guardar base
          </button>
        </div>
      </form>
      {pidePin && <PedirPinAdmin detalle={'Cambiar la base de ' + dinero(turno.inicial) + ' a ' + dinero(nueva)} onOk={guardar} onCancelar={() => setPidePin(false)} />}
    </div>
  )
}

import { useState } from 'react'
import { verificarPinAdmin } from '../auth.js'

// Ventana para que el administrador escriba su PIN y autorice algo (la app de escritorio no permite usar prompt())
export default function PedirPinAdmin({ titulo = 'Autorización del administrador', detalle, onOk, onCancelar }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')

  async function confirmar(e) {
    e.preventDefault()
    if (pin.length < 4) return setError('El PIN tiene entre 4 y 6 números.')
    if (await verificarPinAdmin(pin)) onOk()
    else {
      setError('PIN incorrecto.')
      setPin('')
    }
  }

  return (
    <div className="fondo-modal" style={{ zIndex: 90 }} onMouseDown={(e) => e.target === e.currentTarget && onCancelar()}>
      <form className="modal modal-chico" onSubmit={confirmar}>
        <div className="panel-cabeza">
          <div>
            <h2>{titulo}</h2>
            {detalle && <p className="sub">{detalle}</p>}
          </div>
          <button type="button" className="boton-icono" onClick={onCancelar} aria-label="Cerrar">
            ✕
          </button>
        </div>
        <label className="cupo-sacar">
          <span>PIN del administrador</span>
          <div>
            <input
              type="password"
              inputMode="numeric"
              autoFocus
              maxLength={6}
              placeholder="••••"
              value={pin}
              onChange={(e) => (setPin(e.target.value.replace(/\D/g, '')), setError(''))}
            />
          </div>
        </label>
        {error && <p className="error" style={{ marginTop: 8 }}>{error}</p>}
        <div className="modal-pie">
          <button type="button" className="btn" onClick={onCancelar}>
            Cancelar
          </button>
          <button type="submit" className="btn oscuro" disabled={pin.length < 4}>
            Autorizar
          </button>
        </div>
      </form>
    </div>
  )
}

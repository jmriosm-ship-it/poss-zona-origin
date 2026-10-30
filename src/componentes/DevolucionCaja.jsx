import { useState } from 'react'
import { useGastos, registrarDevolucionDinero } from '../almacen.js'
import { useUsuario, puedeHacer, verificarPinAdmin } from '../auth.js'
import { dinero, fechaHora } from '../utils.js'

// Devolución de dinero desde la Caja (Ctrl L): se escribe el motivo y el valor y se acepta.
// Sale el efectivo de la caja y queda como gasto (se descuenta de las ganancias) con su registro.
// Quien no tiene permiso de devoluciones necesita el PIN del administrador.
export default function DevolucionCaja({ onCerrar }) {
  const usuario = useUsuario()
  const gastos = useGastos()
  const [motivo, setMotivo] = useState('')
  const [valor, setValor] = useState('')
  const [aviso, setAviso] = useState('')
  const v = Number(valor) || 0
  const recientes = gastos.filter((g) => g.devolucion).slice(0, 5)

  async function aceptar(e) {
    e.preventDefault()
    if (!(v > 0) || !motivo.trim()) return
    if (!puedeHacer(usuario, 'anular')) {
      const pin = prompt('Para devolver dinero hace falta el PIN del administrador:')
      if (!pin) return
      if (!(await verificarPinAdmin(pin))) return setAviso('PIN incorrecto.')
    }
    registrarDevolucionDinero(motivo.trim(), v)
    setAviso('Registrado: ' + dinero(v) + ' (' + motivo.trim() + ').')
    setMotivo('')
    setValor('')
  }

  return (
    <div className="fondo-modal" onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <form className="modal modal-chico" onSubmit={aceptar}>
        <div className="panel-cabeza">
          <div>
            <h2>Devolución de dinero</h2>
            <p className="sub">Sale de la caja y se descuenta de las ganancias.</p>
          </div>
          <button type="button" className="boton-icono" onClick={onCerrar} aria-label="Cerrar">
            ✕
          </button>
        </div>

        <div className="cupo-nombre">
          <span className="gris">Motivo</span>
          <input autoFocus value={motivo} onChange={(e) => (setMotivo(e.target.value), setAviso(''))} placeholder="Ej. devolución de funda, equipo con falla" style={{ fontSize: 18 }} />
        </div>

        <label className="cupo-sacar">
          <span>¿Cuánto se devuelve?</span>
          <div>
            <b>$</b>
            <input type="number" min="0" placeholder="0" value={valor} onChange={(e) => (setValor(e.target.value), setAviso(''))} />
          </div>
        </label>
        {aviso && <p className={aviso.startsWith('PIN') ? 'error' : 'gris'} style={{ marginTop: 8 }}>{aviso}</p>}

        {recientes.length > 0 && (
          <div className="lineas" style={{ marginTop: 12 }}>
            {recientes.map((g) => (
              <div key={g.id}>
                {g.concepto.replace('Devolución: ', '')} · <small className="gris">{fechaHora(g.fecha)}</small> <strong>{dinero(g.valor)}</strong>
              </div>
            ))}
          </div>
        )}

        <div className="modal-pie">
          <button type="button" className="btn" onClick={onCerrar}>
            Cerrar
          </button>
          <button type="submit" className="btn oscuro" disabled={!(v > 0) || !motivo.trim()}>
            Aceptar
          </button>
        </div>
      </form>
    </div>
  )
}

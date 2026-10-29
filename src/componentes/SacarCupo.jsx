import { useState } from 'react'
import { useUsuarios, useNomina, registrarConsumo } from '../almacen.js'
import { useUsuario } from '../auth.js'
import { estadoCupo } from '../nomina.js'
import { dinero, fechaHora } from '../utils.js'

// Ventana de la Caja (Ctrl +): un trabajador saca algo de la tienda contra su cupo.
// El cupo solo lo pone el administrador (Trabajadores → Cupo y pagos); aquí solo se gasta.
export default function SacarCupo({ onCerrar }) {
  const yo = useUsuario()
  const usuarios = useUsuarios()
  const nomina = useNomina()
  const admin = yo?.rol === 'admin'
  const [quien, setQuien] = useState(yo?.id)
  const [concepto, setConcepto] = useState('')
  const [valor, setValor] = useState('')
  const [aviso, setAviso] = useState('')

  const persona = usuarios.find((u) => u.id === (admin ? quien : yo?.id)) || yo
  const e = persona ? estadoCupo(persona, nomina) : { cupo: 0, pendiente: 0, disponible: 0 }
  const v = Number(valor) || 0
  const recientes = nomina
    .filter((r) => r.usuarioId === persona?.id && r.tipo === 'consumo' && !r.anulado)
    .sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
    .slice(0, 5)

  function sacar(ev) {
    ev.preventDefault()
    if (!persona || !(v > 0)) return
    if (v > e.disponible) return setAviso('Supera el cupo: solo quedan ' + dinero(Math.max(0, e.disponible)) + '.')
    registrarConsumo(persona, concepto.trim() || 'Consumo', v)
    setAviso('Registrado: ' + dinero(v) + (concepto.trim() ? ' (' + concepto.trim() + ')' : '') + '.')
    setConcepto('')
    setValor('')
  }

  return (
    <div className="fondo-modal" onMouseDown={(ev) => ev.target === ev.currentTarget && onCerrar()}>
      <form className="modal modal-chico" onSubmit={sacar}>
        <div className="panel-cabeza">
          <div>
            <h2>Sacar del cupo</h2>
            <p className="sub">Lo que saques se descuenta del sueldo al pagar.</p>
          </div>
          <button type="button" className="boton-icono" onClick={onCerrar} aria-label="Cerrar">
            ✕
          </button>
        </div>

        <div className="cupo-nombre">
          <span className="gris">Nombre</span>
          {admin ? (
            <select value={persona?.id} onChange={(ev) => (setQuien(ev.target.value), setAviso(''))}>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre}
                </option>
              ))}
            </select>
          ) : (
            <strong>{persona?.nombre}</strong>
          )}
        </div>

        <div className="cupo-disponible">
          <span className="gris">Cupo disponible</span>
          <strong>{dinero(e.disponible)}</strong>
          <small className="gris">
            Cupo {dinero(e.cupo)} · ya sacado {dinero(e.pendiente)}
          </small>
        </div>

        <hr />

        {e.cupo <= 0 ? (
          <p className="aviso-legal">No tiene cupo asignado. El administrador lo asigna en Trabajadores.</p>
        ) : (
          <>
            <label className="cupo-sacar">
              <span>¿Cuánto va a sacar?</span>
              <div>
                <b>$</b>
                <input type="number" min="0" autoFocus placeholder="0" value={valor} onChange={(ev) => (setValor(ev.target.value), setAviso(''))} />
              </div>
            </label>
            <input className="cupo-concepto" value={concepto} onChange={(ev) => setConcepto(ev.target.value)} placeholder="Qué saca (opcional): perfume, funda, adelanto" />
          </>
        )}
        {aviso && <p className={aviso.startsWith('Supera') ? 'error' : 'gris'} style={{ marginTop: 8 }}>{aviso}</p>}

        {recientes.length > 0 && (
          <div className="lineas" style={{ marginTop: 12 }}>
            {recientes.map((r) => (
              <div key={r.id}>
                {r.concepto} · <small className="gris">{fechaHora(r.fecha)}</small> <strong>{dinero(r.valor)}</strong>
              </div>
            ))}
          </div>
        )}

        <div className="modal-pie">
          <button type="button" className="btn" onClick={onCerrar}>
            Cerrar
          </button>
          <button type="submit" className="btn oscuro" disabled={e.cupo <= 0 || !(v > 0)}>
            Sacar
          </button>
        </div>
      </form>
    </div>
  )
}

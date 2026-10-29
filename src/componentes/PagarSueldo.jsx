import { useState } from 'react'
import { useUsuarios, useNomina, useVentas, guardarUsuario, registrarPagoSueldo } from '../almacen.js'
import { useUsuario } from '../auth.js'
import { estadoCupo } from '../nomina.js'
import { aFechaISO, dinero } from '../utils.js'

// Pago del sueldo por días trabajados (Ctrl M en la Caja): días × valor del día, menos lo que gastó del cupo.
// Queda en el historial del trabajador y como gasto de Nómina (baja la ganancia del mes).
export default function PagarSueldo({ usuario, onCerrar }) {
  const yo = useUsuario()
  const usuarios = useUsuarios()
  const nomina = useNomina()
  const ventas = useVentas()
  const [quien, setQuien] = useState(usuario?.id || usuarios.find((u) => u.rol !== 'admin')?.id || usuarios[0]?.id)
  const persona = usuarios.find((u) => u.id === quien)
  const [dias, setDias] = useState('')
  const [valorDia, setValorDia] = useState('')
  const [descuento, setDescuento] = useState(null) // null = todo lo pendiente
  const [periodo, setPeriodo] = useState(new Date().toLocaleDateString('es-CO', { month: 'long', year: 'numeric' }))

  if (!persona || yo?.rol !== 'admin') return null // el pago de sueldos es solo del administrador
  const e = estadoCupo(persona, nomina)
  const vDia = valorDia === '' ? Number(persona.pagoDia) || 0 : Number(valorDia) || 0
  const nDias = Number(dias) || 0
  const sueldo = Math.round(nDias * vDia)
  const d = Math.min(Math.max(0, descuento === null ? e.pendiente : Number(descuento) || 0), e.pendiente)
  const neto = sueldo - d

  // días de este mes en que vendió (ayuda para contar los días trabajados)
  const mes = aFechaISO(new Date()).slice(0, 7)
  const diasConVentas = new Set(ventas.filter((v) => v.vendedorId === persona.id && v.estado !== 'anulada' && aFechaISO(new Date(v.fecha)).startsWith(mes)).map((v) => aFechaISO(new Date(v.fecha)))).size

  function pagar(ev) {
    ev.preventDefault()
    if (!(sueldo > 0)) return
    if (d > sueldo && !confirm('El descuento es mayor que el sueldo. ¿Seguir?')) return
    registrarPagoSueldo({ usuario: persona, sueldo, descuento: d, periodo, nota: '', dias: nDias, valorDia: vDia })
    if (vDia !== persona.pagoDia) guardarUsuario({ ...persona, pagoDia: vDia })
    onCerrar()
  }

  return (
    <div className="fondo-modal" onMouseDown={(ev) => ev.target === ev.currentTarget && onCerrar()}>
      <form className="modal modal-chico" onSubmit={pagar}>
        <div className="panel-cabeza">
          <div>
            <h2>Pagar sueldo</h2>
            <p className="sub">Días trabajados × valor del día, menos lo que sacó del cupo.</p>
          </div>
          <button type="button" className="boton-icono" onClick={onCerrar} aria-label="Cerrar">
            ✕
          </button>
        </div>

        <div className="campos">
          <label>
            <span>Nombre</span>
            <select value={persona.id} onChange={(ev) => (setQuien(ev.target.value), setDescuento(null), setValorDia(''))}>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Período</span>
            <input value={periodo} onChange={(ev) => setPeriodo(ev.target.value)} />
          </label>
          <label>
            <span>Días trabajados</span>
            <input type="number" min="0" step="0.5" autoFocus value={dias} onChange={(ev) => setDias(ev.target.value)} placeholder="0" />
          </label>
          <label>
            <span>Pago por día</span>
            <input type="number" min="0" value={valorDia === '' ? persona.pagoDia || '' : valorDia} onChange={(ev) => setValorDia(ev.target.value)} placeholder="0" />
          </label>
        </div>
        {diasConVentas > 0 && (
          <p className="gris" style={{ marginTop: 6 }}>
            Este mes vendió en {diasConVentas} {diasConVentas === 1 ? 'día' : 'días'}.{' '}
            <button type="button" className="enlace" onClick={() => setDias(String(diasConVentas))}>
              Usar ese número
            </button>
          </p>
        )}

        <div className="lineas" style={{ marginTop: 12 }}>
          <div>
            Total del sueldo ({nDias} × {dinero(vDia)}) <strong>{dinero(sueldo)}</strong>
          </div>
          <div>
            Lo que gastó del cupo (sin pagar) <strong>{dinero(e.pendiente)}</strong>
          </div>
          <div>
            Descuento por cupo{' '}
            <input type="number" min="0" max={e.pendiente} style={{ width: 110 }} value={descuento === null ? e.pendiente : descuento} onChange={(ev) => setDescuento(ev.target.value)} />
          </div>
        </div>
        <div className="resultado-neto" style={{ marginTop: 12 }}>
          <div>
            <small>A pagar en mano</small>
            <strong>{dinero(neto)}</strong>
          </div>
        </div>
        <p className="gris" style={{ marginTop: 8 }}>
          Al pagar, queda en el historial del trabajador y en Gastos (Nómina).
        </p>

        <div className="modal-pie">
          <button type="button" className="btn" onClick={onCerrar}>
            Cancelar
          </button>
          <button type="submit" className="btn oscuro" disabled={!(sueldo > 0)}>
            Registrar pago
          </button>
        </div>
      </form>
    </div>
  )
}

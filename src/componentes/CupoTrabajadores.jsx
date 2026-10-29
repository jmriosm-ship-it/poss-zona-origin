import { useState } from 'react'
import { useUsuarios, useNomina, guardarUsuario, registrarConsumo, anularConsumo } from '../almacen.js'
import PagarSueldo from './PagarSueldo.jsx'
import { estadoCupo } from '../nomina.js'
import { dinero, fechaHora } from '../utils.js'

// Cupo de cada trabajador, lo que ha sacado, y el pago del sueldo con el descuento
export default function CupoTrabajadores() {
  const usuarios = useUsuarios()
  const nomina = useNomina()
  const [consumo, setConsumo] = useState(null) // usuario al que se le registra un consumo
  const [pago, setPago] = useState(null) // usuario al que se le paga
  const [historial, setHistorial] = useState(null)

  return (
    <div className="panel" style={{ marginTop: 16 }}>
      <div className="panel-cabeza">
        <div>
          <h2>Cupo y pagos de trabajadores</h2>
          <p className="sub">Lo que cada uno puede sacar de la tienda. Al pagar el sueldo se descuenta y queda el registro.</p>
        </div>
      </div>
      <table className="tabla">
        <thead>
          <tr>
            <th>Trabajador</th>
            <th>Cupo</th>
            <th>Ha sacado (sin pagar)</th>
            <th>Disponible</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {usuarios.map((u) => {
            const e = estadoCupo(u, nomina)
            return (
              <tr key={u.id}>
                <td>
                  <strong>{u.nombre}</strong>
                  {u.sueldo > 0 && <small className="gris">Sueldo {dinero(u.sueldo)}</small>}
                </td>
                <td>
                  <input
                    type="number"
                    min="0"
                    style={{ width: 110 }}
                    value={u.cupo ?? ''}
                    placeholder="0"
                    onChange={(ev) => guardarUsuario({ ...u, cupo: Math.max(0, Number(ev.target.value) || 0) })}
                  />
                </td>
                <td>{e.pendiente > 0 ? <strong style={{ color: 'var(--rojo)' }}>{dinero(e.pendiente)}</strong> : '—'}</td>
                <td>{dinero(e.disponible)}</td>
                <td className="acciones">
                  <button className="enlace" onClick={() => setConsumo(u)}>
                    Registrar consumo
                  </button>
                  <button className="enlace" style={{ marginLeft: 10 }} onClick={() => setPago(u)}>
                    Pagar sueldo
                  </button>
                  <button className="enlace" style={{ marginLeft: 10 }} onClick={() => setHistorial(u)}>
                    Historial
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {consumo && <ModalConsumo usuario={consumo} nomina={nomina} onCerrar={() => setConsumo(null)} />}
      {pago && <PagarSueldo usuario={pago} onCerrar={() => setPago(null)} />}
      {historial && <ModalHistorial usuario={historial} nomina={nomina} onCerrar={() => setHistorial(null)} />}
    </div>
  )
}

function ModalConsumo({ usuario, nomina, onCerrar }) {
  const e = estadoCupo(usuario, nomina)
  const [concepto, setConcepto] = useState('')
  const [valor, setValor] = useState('')
  const v = Number(valor) || 0

  function guardar(ev) {
    ev.preventDefault()
    if (!(v > 0)) return
    if (v > e.disponible && !confirm('Pasa el cupo (' + dinero(Math.max(0, e.disponible)) + ' disponibles). ¿Registrar de todos modos?')) return
    registrarConsumo(usuario, concepto.trim() || 'Consumo', v)
    onCerrar()
  }

  return (
    <div className="fondo-modal" onMouseDown={(ev) => ev.target === ev.currentTarget && onCerrar()}>
      <form className="modal modal-chico" onSubmit={guardar}>
        <div className="panel-cabeza">
          <div>
            <h2>Consumo de {usuario.nombre}</h2>
            <p className="sub">Disponible del cupo: {dinero(e.disponible)}</p>
          </div>
        </div>
        <div className="campos">
          <label className="ancho">
            <span>Qué sacó</span>
            <input autoFocus value={concepto} onChange={(ev) => setConcepto(ev.target.value)} placeholder="Ej. perfume, funda, adelanto" />
          </label>
          <label>
            <span>Valor</span>
            <input type="number" min="0" value={valor} onChange={(ev) => setValor(ev.target.value)} />
          </label>
        </div>
        <div className="modal-pie">
          <button type="button" className="btn" onClick={onCerrar}>
            Cancelar
          </button>
          <button type="submit" className="btn oscuro">
            Registrar
          </button>
        </div>
      </form>
    </div>
  )
}

function ModalHistorial({ usuario, nomina, onCerrar }) {
  const lista = nomina.filter((r) => r.usuarioId === usuario.id).sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
  return (
    <div className="fondo-modal" onMouseDown={(ev) => ev.target === ev.currentTarget && onCerrar()}>
      <div className="modal">
        <div className="panel-cabeza">
          <div>
            <h2>Historial de {usuario.nombre}</h2>
            <p className="sub">Consumos del cupo y pagos de sueldo</p>
          </div>
          <button className="boton-icono" onClick={onCerrar} aria-label="Cerrar">
            ✕
          </button>
        </div>
        {lista.length === 0 ? (
          <div className="vacio chico">Todavía no hay movimientos.</div>
        ) : (
          <table className="tabla">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Qué</th>
                <th>Valor</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lista.map((r) => (
                <tr key={r.id} style={r.anulado ? { opacity: 0.5 } : undefined}>
                  <td>{fechaHora(r.fecha)}</td>
                  <td>
                    {r.tipo === 'pago' ? (
                      <>
                        <strong>Pago de sueldo{r.periodo ? ' · ' + r.periodo : ''}</strong>
                        <small className="gris">
                          {r.dias ? r.dias + ' días × ' + dinero(r.valorDia) + ' = ' : 'Sueldo '}{dinero(r.sueldo)} − cupo {dinero(r.descuento)}
                        </small>
                      </>
                    ) : (
                      <>
                        {r.concepto}
                        {r.anulado && <small className="gris">Anulado</small>}
                      </>
                    )}
                  </td>
                  <td>{r.tipo === 'pago' ? dinero(r.neto) + ' pagado' : dinero(r.valor)}</td>
                  <td className="acciones">
                    {r.tipo === 'consumo' && !r.anulado && (
                      <button className="enlace peligro" onClick={() => confirm('¿Anular este consumo?') && anularConsumo(r.id)}>
                        Anular
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="modal-pie">
          <button className="btn oscuro" onClick={onCerrar}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

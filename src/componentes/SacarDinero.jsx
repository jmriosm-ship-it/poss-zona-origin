import { useState } from 'react'
import { useCompras, useTurnos, useVentas, useMovimientos, useAbonos, useCreditos, abonarCompra, registrarSalidaDinero, registrarAccion } from '../almacen.js'
import { resumenTurno } from '../turno.js'
import { useCajaActual } from '../equipo.js'
import { cajaDe, dinero, saldoCompra } from '../utils.js'

// Sacar efectivo de la caja con un motivo (Ctrl G): pago a un proveedor (baja la deuda de la compra) u otro motivo.
// El efectivo sale de la caja y se descuenta del efectivo esperado del cierre.
export default function SacarDinero({ onCerrar }) {
  const compras = useCompras()
  const turnos = useTurnos()
  const ventas = useVentas()
  const movimientos = useMovimientos()
  const abonos = useAbonos()
  const creditos = useCreditos()
  const miCaja = useCajaActual()
  const turno = turnos.find((t) => !t.fechaCierre && cajaDe(t) === miCaja)
  // efectivo que hay ahora en la caja abierta
  const disponible = turno ? resumenTurno(turno, ventas, abonos, compras, movimientos, creditos).esperado : 0
  const deudas = compras.filter((c) => saldoCompra(c) > 0)
  const [tipo, setTipo] = useState(deudas.length ? 'proveedor' : 'otro')
  const [compraId, setCompraId] = useState(deudas[0]?.id || '')
  const [motivo, setMotivo] = useState('')
  const [valor, setValor] = useState('')
  const [aviso, setAviso] = useState('')
  const compra = deudas.find((c) => c.id === compraId)
  const v = Number(valor) || 0
  const sobra = v > disponible
  const valido = !!turno && !sobra && v > 0 && (tipo === 'proveedor' ? !!compra && v <= saldoCompra(compra) : !!motivo.trim())

  function elegirCompra(id) {
    setCompraId(id)
    const c = deudas.find((x) => x.id === id)
    setValor(c ? String(saldoCompra(c)) : '')
    setAviso('')
  }

  function aceptar(e) {
    e.preventDefault()
    if (!valido) return
    if (tipo === 'proveedor') {
      abonarCompra(compra.id, v, 'Efectivo')
      registrarAccion('Pagó a un proveedor desde la caja', compra.proveedor + ' · $' + v)
      setAviso('Pagado ' + dinero(v) + ' a ' + compra.proveedor + '.')
    } else {
      registrarSalidaDinero(motivo.trim(), v)
      setAviso('Salieron ' + dinero(v) + ' de la caja (' + motivo.trim() + ').')
    }
    setValor('')
    setMotivo('')
  }

  return (
    <div className="fondo-modal" onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <form className="modal modal-chico" onSubmit={aceptar}>
        <div className="panel-cabeza">
          <div>
            <h2>Sacar dinero de la caja</h2>
            <p className="sub">Sale en efectivo y baja el efectivo esperado del cierre.</p>
          </div>
          <button type="button" className="boton-icono" onClick={onCerrar} aria-label="Cerrar">
            ✕
          </button>
        </div>

        <div className="cupo-nombre">
          <span className="gris">Motivo</span>
          <select value={tipo} onChange={(e) => (setTipo(e.target.value), setAviso(''), e.target.value === 'proveedor' && elegirCompra(compraId || deudas[0]?.id))}>
            <option value="proveedor" disabled={!deudas.length}>
              Pago a proveedor {deudas.length ? '' : '(no hay deudas)'}
            </option>
            <option value="otro">Otro motivo</option>
          </select>
        </div>

        {tipo === 'proveedor' ? (
          <div className="cupo-nombre">
            <span className="gris">¿Qué compra se paga?</span>
            <select value={compraId} onChange={(e) => elegirCompra(e.target.value)}>
              {deudas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.proveedor} · {c.items.map((i) => `${i.cantidad} ${i.nombre}`).join(', ').slice(0, 40)} · debes {dinero(saldoCompra(c))}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="cupo-nombre">
            <span className="gris">Escribe el motivo</span>
            <input autoFocus value={motivo} onChange={(e) => (setMotivo(e.target.value), setAviso(''))} placeholder="Ej. almuerzo, domicilio, retiro" style={{ fontSize: 18 }} />
          </div>
        )}

        <label className="cupo-sacar">
          <span>¿Cuánto se saca?</span>
          <div>
            <b>$</b>
            <input type="number" min="0" placeholder="0" value={valor} onChange={(e) => (setValor(e.target.value), setAviso(''))} />
          </div>
        </label>
        {tipo === 'proveedor' && compra && v > saldoCompra(compra) && <p className="error">No puede ser más de lo que se debe ({dinero(saldoCompra(compra))}).</p>}
        <p className="gris" style={{ marginTop: 8 }}>{turno ? 'Efectivo en la caja ahora: ' + dinero(disponible) : 'La caja está cerrada.'}</p>
        {turno && sobra && v > 0 && <p className="error">No hay tanto efectivo en la caja. Solo puedes sacar hasta {dinero(Math.max(0, disponible))}.</p>}
        {aviso && <p className="gris" style={{ marginTop: 8 }}>{aviso}</p>}

        <div className="modal-pie">
          <button type="button" className="btn" onClick={onCerrar}>
            Cerrar
          </button>
          <button type="submit" className="btn oscuro" disabled={!valido}>
            Aceptar
          </button>
        </div>
      </form>
    </div>
  )
}

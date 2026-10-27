import { useState } from 'react'
import { useTurnos, useVentas, useAbonos, useCompras, useCreditos, useMovimientos, abrirCaja } from '../almacen.js'
import { resumenTurno } from '../turno.js'
import { dinero, fechaHora } from '../utils.js'

// Franja de arriba de la Caja: estado del turno, abrir caja y botón para el cierre del día
export default function BarraCaja({ onCerrar }) {
  const turnos = useTurnos()
  const ventas = useVentas()
  const abonos = useAbonos()
  const compras = useCompras()
  const creditos = useCreditos()
  const movimientos = useMovimientos()
  const [inicial, setInicial] = useState('')

  const turno = turnos.find((t) => !t.fechaCierre)

  if (!turno) {
    return (
      <form
        className="barra-caja cerrada"
        onSubmit={(e) => {
          e.preventDefault()
          abrirCaja(Number(inicial) || 0)
          setInicial('')
        }}
      >
        <span>
          <strong>Caja cerrada.</strong> Ábrela con el efectivo que dejas para dar cambio.
        </span>
        <span className="inline-form" style={{ marginBottom: 0 }}>
          <input type="number" min="0" placeholder="Efectivo inicial" value={inicial} onChange={(e) => setInicial(e.target.value)} />
          <button className="btn oscuro chico" type="submit">
            Abrir caja
          </button>
        </span>
      </form>
    )
  }

  const r = resumenTurno(turno, ventas, abonos, compras, movimientos, creditos)
  return (
    <div className="barra-caja">
      <span>
        <strong>Caja abierta</strong> desde {fechaHora(turno.fechaApertura)} · {r.nVentas} ventas · {dinero(r.vendido)}
      </span>
      <button className="btn chico" onClick={onCerrar}>
        Cerrar caja del día
      </button>
    </div>
  )
}

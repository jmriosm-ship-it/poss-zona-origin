import { useState } from 'react'
import { useTurnos, useVentas, useAbonos, useCompras, useCreditos, useMovimientos, abrirCaja } from '../almacen.js'
import { resumenTurno } from '../turno.js'
import { guardarNombreCaja, idEquipo, useCajaActual } from '../equipo.js'
import { useUsuario } from '../auth.js'
import CorregirBase from './CorregirBase.jsx'
import { cajaDe, dinero, fechaHora } from '../utils.js'

// Franja de arriba de la Caja: estado del turno, abrir caja y botón para el cierre del día
export default function BarraCaja({ onCerrar }) {
  const turnos = useTurnos()
  const ventas = useVentas()
  const abonos = useAbonos()
  const compras = useCompras()
  const creditos = useCreditos()
  const movimientos = useMovimientos()
  const [inicial, setInicial] = useState('')
  const [corrigiendo, setCorrigiendo] = useState(false)
  const [nombreNuevo, setNombreNuevo] = useState('Caja 2')
  const usuario = useUsuario()

  const miCaja = useCajaActual()
  const turno = turnos.find((t) => !t.fechaCierre && cajaDe(t) === miCaja)

  if (!turno) {
    return (
      <form
        className="barra-caja cerrada"
        onSubmit={(e) => {
          e.preventDefault()
          abrirCaja(Number(inicial) || 0, usuario)
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

  // la caja abierta es de otro computador que usa el mismo nombre: hay que darle un nombre distinto a este
  if (!usuario?.caja && turno.equipo && turno.equipo !== idEquipo()) {
    return (
      <form
        className="barra-caja cerrada"
        onSubmit={(e) => {
          e.preventDefault()
          if (nombreNuevo.trim() && nombreNuevo.trim() !== miCaja) guardarNombreCaja(nombreNuevo)
        }}
      >
        <span>
          <strong>Otro computador ya abrió "{miCaja}".</strong> Dos computadores no pueden tener el mismo nombre de caja. El administrador debe ponerle un nombre distinto a este (por ejemplo Caja 2).
        </span>
        {usuario?.rol === 'admin' ? (
          <span className="inline-form" style={{ marginBottom: 0 }}>
            <input value={nombreNuevo} onChange={(e) => setNombreNuevo(e.target.value)} placeholder="Caja 2" />
            <button className="btn oscuro chico" type="submit" disabled={!nombreNuevo.trim() || nombreNuevo.trim() === miCaja}>
              Guardar nombre
            </button>
          </span>
        ) : (
          <span className="gris">Avísale al administrador para que le ponga otro nombre.</span>
        )}
      </form>
    )
  }

  const r = resumenTurno(turno, ventas, abonos, compras, movimientos, creditos)
  return (
    <div className="barra-caja">
      <span>
        <strong>Caja abierta</strong> desde {fechaHora(turno.fechaApertura)} · {turno.abrioPor ? 'por ' + turno.abrioPor + ' ' : ''}con base {dinero(turno.inicial)} · {r.nVentas} {r.nVentas === 1 ? 'venta' : 'ventas'} · {dinero(r.vendido)}
      </span>
      <span style={{ display: "flex", gap: 8 }}>
        <button className="btn chico" onClick={() => setCorrigiendo(true)}>
          Corregir base
        </button>
        <button className="btn chico" onClick={onCerrar}>
          Cerrar caja del día
        </button>
      </span>
      {corrigiendo && <CorregirBase turno={turno} onCerrar={() => setCorrigiendo(false)} />}
    </div>
  )
}

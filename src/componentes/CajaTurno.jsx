import { imprimir } from '../impresion.js'
import { useState } from 'react'
import { useTurnos, useVentas, useMovimientos, useAbonos, useCompras, useCreditos, abrirCaja, registrarMovimiento } from '../almacen.js'
import { resumenTurno } from '../turno.js'
import { useCajaActual } from '../equipo.js'
import { useUsuario } from '../auth.js'
import CierreCaja, { TicketCierre } from './CierreCaja.jsx'
import { cajaDe, dinero, fechaHora } from '../utils.js'

// Caja del día para el administrador: apertura, ingresos y egresos, y el cierre (se hace en CierreCaja)
export default function CajaTurno() {
  const turnos = useTurnos()
  const ventas = useVentas()
  const movimientos = useMovimientos()
  const abonos = useAbonos()
  const compras = useCompras()
  const creditos = useCreditos()
  const [inicial, setInicial] = useState('')
  const usuario = useUsuario()
  const [mov, setMov] = useState({ tipo: 'egreso', valor: '', motivo: '' })
  const [cerrando, setCerrando] = useState(false)
  const [verUltimo, setVerUltimo] = useState(false)

  const miCaja = useCajaActual()
  const turno = turnos.find((t) => !t.fechaCierre && cajaDe(t) === miCaja)
  const ultimo = turnos.find((t) => t.fechaCierre && cajaDe(t) === miCaja)

  if (!turno) {
    return (
      <div className="panel turno">
        <div className="panel-cabeza">
          <div>
            <h2>Caja</h2>
            <p className="sub">Cerrada. Ábrela con el efectivo que dejas para dar cambio.</p>
          </div>
          <span className="badge agotado">Cerrada</span>
        </div>
        <form
          className="inline-form"
          onSubmit={(e) => {
            e.preventDefault()
            abrirCaja(Number(inicial) || 0, usuario)
            setInicial('')
          }}
        >
          <input type="number" min="0" placeholder="Efectivo inicial" value={inicial} onChange={(e) => setInicial(e.target.value)} />
          <button className="btn oscuro" type="submit">
            Abrir caja
          </button>
        </form>
        {ultimo && (
          <p className="gris" style={{ marginTop: 12 }}>
            Último cierre ({fechaHora(ultimo.fechaCierre)}): esperado {dinero(ultimo.esperado)} · contado {dinero(ultimo.contado)} · diferencia{' '}
            {dinero(ultimo.contado - ultimo.esperado)}{' '}
            {ultimo.resumen && (
              <button className="enlace" onClick={() => setVerUltimo(true)}>
                Ver / imprimir
              </button>
            )}
          </p>
        )}
        {verUltimo && ultimo?.resumen && (
          <div className="fondo-modal" onMouseDown={(e) => e.target === e.currentTarget && setVerUltimo(false)}>
            <div className="modal modal-chico">
              <TicketCierre turno={ultimo} resumen={ultimo.resumen} contado={ultimo.contado} esperado={ultimo.esperado} />
              <div className="modal-pie sin-imprimir">
                <button className="btn" onClick={() => setVerUltimo(false)}>
                  Cerrar
                </button>
                <button className="btn oscuro" onClick={() => imprimir()}>
                  Imprimir
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  const r = resumenTurno(turno, ventas, abonos, compras, movimientos, creditos)

  function agregarMovimiento(e) {
    e.preventDefault()
    if (!(Number(mov.valor) > 0) || !mov.motivo.trim()) return
    registrarMovimiento({ tipo: mov.tipo, valor: Number(mov.valor), motivo: mov.motivo.trim() })
    setMov({ ...mov, valor: '', motivo: '' })
  }

  return (
    <div className="panel turno">
      <div className="panel-cabeza">
        <div>
          <h2>Caja</h2>
          <p className="sub">Abierta desde {fechaHora(turno.fechaApertura)}</p>
        </div>
        <span className="badge ok">Abierta</span>
      </div>

      <div className="turno-grid">
        <div>
          <div className="lineas">
            <div>
              Efectivo inicial <strong>{dinero(turno.inicial)}</strong>
            </div>
            <div>
              + Ventas en efectivo <strong>{dinero(r.efectivoVentas)}</strong>
            </div>
            <div>
              + Abonos de clientes <strong>{dinero(r.abonosEfectivo)}</strong>
            </div>
            <div>
              − Devoluciones en efectivo <strong>{dinero(r.devEfectivo)}</strong>
            </div>
            <div>
              − Pagos a proveedores <strong>{dinero(r.pagoProveedores)}</strong>
            </div>
            <div>
              + Ingresos <strong>{dinero(r.ingresos)}</strong>
            </div>
            <div>
              − Egresos <strong>{dinero(r.egresos)}</strong>
            </div>
            <div className="fuerte">
              Efectivo esperado <strong>{dinero(r.esperado)}</strong>
            </div>
          </div>
          <p className="gris">
            Transferencias: {dinero(r.porMedio.Transferencia)} · Tarjeta: {dinero(r.porMedio.Tarjeta)} · Fiado: {dinero(r.porMedio.Fiado)}
          </p>
        </div>

        <div>
          <form className="inline-form" onSubmit={agregarMovimiento}>
            <select value={mov.tipo} onChange={(e) => setMov({ ...mov, tipo: e.target.value })}>
              <option value="egreso">Egreso (sale)</option>
              <option value="ingreso">Ingreso (entra)</option>
            </select>
            <input type="number" min="0" placeholder="Valor" value={mov.valor} onChange={(e) => setMov({ ...mov, valor: e.target.value })} style={{ width: 100 }} />
            <input placeholder="Motivo" value={mov.motivo} onChange={(e) => setMov({ ...mov, motivo: e.target.value })} />
            <button className="btn chico" type="submit">
              Registrar
            </button>
          </form>
          {r.movs.slice(0, 3).map((m) => (
            <p className="gris" key={m.id}>
              {m.tipo === 'egreso' ? '−' : '+'} {dinero(m.valor)} · {m.motivo}
            </p>
          ))}

          <div className="inline-form cierre">
            <button className="btn oscuro" onClick={() => setCerrando(true)}>
              Cerrar caja del día
            </button>
          </div>
        </div>
      </div>
      {cerrando && <CierreCaja onTerminar={() => setCerrando(false)} />}
    </div>
  )
}

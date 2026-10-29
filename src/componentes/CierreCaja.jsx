import { useState } from 'react'
import { useTurnos, useVentas, useAbonos, useCompras, useCreditos, useMovimientos, useConfig, cerrarCaja } from '../almacen.js'
import { resumenTurno, instantanea } from '../turno.js'
import { useCajaActual } from '../equipo.js'
import { useUsuario } from '../auth.js'
import { cajaDe, dinero, fechaHora } from '../utils.js'

// Ticket del cierre de caja (80 mm): sirve para imprimir y guardar en la carpeta del día
export function TicketCierre({ turno, resumen, contado, esperado }) {
  const config = useConfig()
  const dif = contado - esperado
  const medios = Object.entries(resumen.porMedio).filter(([, v]) => v > 0)

  return (
    <div className="ticket">
      <h3>{config.negocio.toUpperCase()}</h3>
      <p className="centro">CIERRE DE CAJA · {cajaDe(turno).toUpperCase()}</p>
      <p className="centro">Abierta: {fechaHora(turno.fechaApertura)}</p>
      <p className="centro">Cerrada: {fechaHora(turno.fechaCierre || new Date().toISOString())}</p>
      {turno.abrioPor && <p className="centro">Abrió: {turno.abrioPor}</p>}
      {turno.cerroPor && <p className="centro">Cerró: {turno.cerroPor}</p>}
      <hr />
      <div className="t-fila">
        <span>Ventas</span>
        <span>{resumen.nVentas}</span>
      </div>
      <div className="t-fila">
        <span>Unidades vendidas</span>
        <span>{resumen.unidades}</span>
      </div>
      {resumen.anuladas > 0 && (
        <div className="t-fila">
          <span>Ventas anuladas</span>
          <span>{resumen.anuladas}</span>
        </div>
      )}
      <div className="t-fila">
        <span>Se empezó con</span>
        <span>{dinero(resumen.inicial)}</span>
      </div>
      <div className="t-fila">
        <span>Se terminó con</span>
        <span>{dinero(contado)}</span>
      </div>
      <div className="t-fila t-total">
        <span>VENDIDO</span>
        <span>{dinero(resumen.vendido)}</span>
      </div>
      <hr />
      <p className="centro">Por medio de pago</p>
      {medios.length === 0 && <p className="centro">Sin ventas</p>}
      {medios.map(([m, v]) => (
        <div className="t-fila" key={m}>
          <span>{m}</span>
          <span>{dinero(v)}</span>
        </div>
      ))}
      {resumen.devTotal > 0 && (
        <div className="t-fila">
          <span>Devoluciones</span>
          <span>- {dinero(resumen.devTotal)}</span>
        </div>
      )}
      <hr />
      <p className="centro">Efectivo</p>
      <div className="t-fila">
        <span>Base inicial</span>
        <span>{dinero(resumen.inicial)}</span>
      </div>
      <div className="t-fila">
        <span>+ Ventas</span>
        <span>{dinero(resumen.efectivoVentas)}</span>
      </div>
      {resumen.abonosEfectivo > 0 && (
        <div className="t-fila">
          <span>+ Abonos clientes</span>
          <span>{dinero(resumen.abonosEfectivo)}</span>
        </div>
      )}
      {resumen.ingresos > 0 && (
        <div className="t-fila">
          <span>+ Ingresos</span>
          <span>{dinero(resumen.ingresos)}</span>
        </div>
      )}
      {resumen.devEfectivo > 0 && (
        <div className="t-fila">
          <span>- Devoluciones</span>
          <span>{dinero(resumen.devEfectivo)}</span>
        </div>
      )}
      {resumen.pagoProveedores > 0 && (
        <div className="t-fila">
          <span>- Proveedores</span>
          <span>{dinero(resumen.pagoProveedores)}</span>
        </div>
      )}
      {resumen.egresos > 0 && (
        <div className="t-fila">
          <span>- Egresos</span>
          <span>{dinero(resumen.egresos)}</span>
        </div>
      )}
      <div className="t-fila t-total">
        <span>ESPERADO</span>
        <span>{dinero(esperado)}</span>
      </div>
      <div className="t-fila">
        <span>CONTADO</span>
        <span>{dinero(contado)}</span>
      </div>
      <div className="t-fila t-total">
        <span>{dif === 0 ? 'CUADRA' : dif > 0 ? 'SOBRA' : 'FALTA'}</span>
        <span>{dif === 0 ? '' : dinero(Math.abs(dif))}</span>
      </div>
      {resumen.vendedores?.length > 0 && (
        <>
          <hr />
          <p className="centro">Por vendedor</p>
          {resumen.vendedores.map((v) => (
            <div className="t-fila" key={v.nombre}>
              <span>
                {v.nombre} ({v.ventas})
              </span>
              <span>{dinero(v.total)}</span>
            </div>
          ))}
        </>
      )}
      <hr />
      <p className="centro">Firma: ______________________</p>
    </div>
  )
}

// Cierre del día: muestra las cuentas, pide el efectivo contado y al confirmar imprime el reporte
export default function CierreCaja({ onTerminar }) {
  const turnos = useTurnos()
  const ventas = useVentas()
  const abonos = useAbonos()
  const compras = useCompras()
  const creditos = useCreditos()
  const movimientos = useMovimientos()
  const [contado, setContado] = useState('')
  const [cerrado, setCerrado] = useState(null) // { turno, resumen, contado, esperado } tras confirmar

  const miCaja = useCajaActual()
  const usuario = useUsuario()
  const turno = turnos.find((t) => !t.fechaCierre && cajaDe(t) === miCaja)

  if (cerrado) {
    return (
      <div className="fondo-modal">
        <div className="modal modal-chico">
          <TicketCierre {...cerrado} />
          <div className="modal-pie sin-imprimir">
            <button className="btn" onClick={onTerminar}>
              Listo
            </button>
            <button className="btn oscuro" onClick={() => window.print()}>
              Imprimir cierre
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!turno) {
    return (
      <div className="fondo-modal" onMouseDown={(e) => e.target === e.currentTarget && onTerminar()}>
        <div className="modal modal-chico">
          <p>La caja ya está cerrada.</p>
          <div className="modal-pie">
            <button className="btn oscuro" onClick={onTerminar}>
              Cerrar
            </button>
          </div>
        </div>
      </div>
    )
  }

  const resumen = resumenTurno(turno, ventas, abonos, compras, movimientos, creditos)
  const dif = (Number(contado) || 0) - resumen.esperado

  function confirmar(e) {
    e.preventDefault()
    if (contado === '') return
    const datos = { esperado: resumen.esperado, contado: Number(contado), resumen: instantanea(resumen) }
    cerrarCaja(turno.id, datos, usuario)
    setCerrado({ turno: { ...turno, cerroPor: usuario?.nombre, fechaCierre: new Date().toISOString() }, resumen, contado: Number(contado), esperado: resumen.esperado })
  }

  return (
    <div className="fondo-modal" onMouseDown={(e) => e.target === e.currentTarget && onTerminar()}>
      <form className="modal" onSubmit={confirmar}>
        <div className="panel-cabeza">
          <div>
            <h2>Cerrar caja del día</h2>
            <p className="sub">Abierta desde {fechaHora(resumen.desde)}</p>
          </div>
          <button type="button" className="boton-icono" onClick={onTerminar} aria-label="Cerrar">
            ✕
          </button>
        </div>

        <div className="tarjetas" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <div className="tarjeta">
            <div className="etiqueta">Vendido</div>
            <div className="valor">{dinero(resumen.vendido)}</div>
            <small>
              {resumen.nVentas} ventas · {resumen.unidades} unidades
            </small>
          </div>
          <div className="tarjeta">
            <div className="etiqueta">Efectivo esperado</div>
            <div className="valor">{dinero(resumen.esperado)}</div>
            <small>Base {dinero(resumen.inicial)} + movimientos</small>
          </div>
          <div className="tarjeta oscura">
            <div className="etiqueta">Por otros medios</div>
            <div className="valor">{dinero(resumen.porMedio.Transferencia + resumen.porMedio.Tarjeta)}</div>
            <small>Transferencia + tarjeta · Fiado {dinero(resumen.porMedio.Fiado)}</small>
          </div>
        </div>

        <div className="lineas">
          <div>
            Efectivo inicial <strong>{dinero(resumen.inicial)}</strong>
          </div>
          <div>
            + Ventas en efectivo <strong>{dinero(resumen.efectivoVentas)}</strong>
          </div>
          <div>
            + Abonos de clientes <strong>{dinero(resumen.abonosEfectivo)}</strong>
          </div>
          <div>
            + Ingresos <strong>{dinero(resumen.ingresos)}</strong>
          </div>
          <div>
            − Devoluciones en efectivo <strong>{dinero(resumen.devEfectivo)}</strong>
          </div>
          <div>
            − Pagos a proveedores <strong>{dinero(resumen.pagoProveedores)}</strong>
          </div>
          <div>
            − Egresos <strong>{dinero(resumen.egresos)}</strong>
          </div>
          <div className="fuerte">
            Efectivo esperado <strong>{dinero(resumen.esperado)}</strong>
          </div>
        </div>

        <div className="inline-form" style={{ marginTop: 14 }}>
          <input type="number" min="0" placeholder="Cuenta el efectivo y escríbelo aquí" value={contado} onChange={(e) => setContado(e.target.value)} autoFocus style={{ flex: 1 }} />
        </div>
        {contado !== '' && (
          <p style={{ fontWeight: 600, color: dif === 0 ? 'var(--verde)' : 'var(--rojo)' }}>
            {dif === 0 ? 'La caja cuadra ✓' : dif > 0 ? `Sobran ${dinero(dif)}` : `Faltan ${dinero(-dif)}`}
          </p>
        )}

        <div className="modal-pie">
          <button type="button" className="btn" onClick={onTerminar}>
            Cancelar
          </button>
          <button type="submit" className="btn oscuro" disabled={contado === ''}>
            Cerrar caja e imprimir
          </button>
        </div>
      </form>
    </div>
  )
}

import FacturaVenta from './FacturaVenta.jsx'
import { useConfig } from '../almacen.js'
import { dinero, etiquetaVenta, fechaHora, vencimientoGarantia } from '../utils.js'

const fechaCorta = (d) => d.toLocaleDateString('es-CO', { dateStyle: 'medium' })

// Ticket para impresora térmica de 80 mm
export default function Recibo({ venta, onCerrar, textoCerrar = 'Nueva venta' }) {
  const config = useConfig()
  const conGarantia = venta.items.some((i) => i.garantiaDias > 0)

  return (
    <div className="fondo-modal">
      <div className="modal modal-chico">
        <div className="ticket">
          <h3>{config.negocio.toUpperCase()}</h3>
          {config.nit && <p className="centro">NIT {config.nit}</p>}
          {config.direccion && <p className="centro">{config.direccion}</p>}
          {config.telefono && <p className="centro">Tel. {config.telefono}</p>}
          <hr />
          <p className="centro">Recibo de venta {etiquetaVenta(venta)}</p>
          <p className="centro">{fechaHora(venta.fecha)}</p>
          {venta.caja && <p className="centro">{venta.caja}</p>}
          {venta.vendedorNombre && <p className="centro">Atendió: {venta.vendedorNombre}</p>}
          {venta.clienteNombre && <p className="centro">Cliente: {venta.clienteNombre}</p>}
          <hr />
          {venta.items.map((i) => (
            <div className="t-item" key={i.varianteId}>
              <div>
                {i.cantidad} x {i.nombre}
                {i.detalle && <small> ({i.detalle})</small>}
                {i.condicion && i.condicion !== 'Nuevo' && <small> · {i.condicion}</small>}
              </div>
              {(i.imeis || []).map((m) => (
                <div key={m} className="t-imei">
                  IMEI/Serial: {m}
                </div>
              ))}
              {i.garantiaDias > 0 && (
                <div className="t-imei">
                  Garantía {i.garantiaDias} días · hasta {fechaCorta(vencimientoGarantia(venta.fecha, i.garantiaDias))}
                </div>
              )}
              <div className="t-fila">
                <span>{dinero(i.precio)} c/u</span>
                <span>{dinero(i.precio * i.cantidad)}</span>
              </div>
            </div>
          ))}
          <hr />
          <div className="t-fila">
            <span>Subtotal</span>
            <span>{dinero(venta.subtotal)}</span>
          </div>
          {venta.descuento > 0 && (
            <div className="t-fila">
              <span>Descuentos</span>
              <span>- {dinero(venta.descuento)}</span>
            </div>
          )}
          <div className="t-fila t-total">
            <span>TOTAL</span>
            <span>{dinero(venta.total)}</span>
          </div>
          <hr />
          {venta.pagos.map((p) => (
            <div className="t-fila" key={p.medio}>
              <span>{p.medio}</span>
              <span>{dinero(p.valor)}</span>
            </div>
          ))}
          {venta.credito && (
            <>
              <hr />
              <p className="centro">CRÉDITO EN CUOTAS</p>
              <div className="t-fila">
                <span>Cuota inicial</span>
                <span>{dinero(venta.credito.cuotaInicial)}</span>
              </div>
              <div className="t-fila">
                <span>{venta.credito.plazo} cuotas de</span>
                <span>{dinero(venta.credito.cuotaValor)}</span>
              </div>
              <div className="t-fila">
                <span>Interés mensual</span>
                <span>{venta.credito.tasa}%</span>
              </div>
              <div className="t-fila">
                <span>Primera cuota</span>
                <span>{new Date(venta.credito.primeraFecha + 'T12:00:00').toLocaleDateString('es-CO', { dateStyle: 'medium' })}</span>
              </div>
            </>
          )}
          {venta.cambio > 0 && (
            <div className="t-fila">
              <span>Cambio</span>
              <span>{dinero(venta.cambio)}</span>
            </div>
          )}
          {(venta.puntosGanados > 0 || venta.puntosUsados > 0) && (
            <>
              <hr />
              {venta.puntosUsados > 0 && <p className="centro">Puntos usados: {venta.puntosUsados}</p>}
              {venta.puntosGanados > 0 && <p className="centro">Puntos ganados: {venta.puntosGanados}</p>}
            </>
          )}
          {conGarantia && config.garantiaTexto && (
            <>
              <hr />
              <p className="t-garantia">{config.garantiaTexto}</p>
            </>
          )}
          <hr />
          <p className="centro">{config.mensajeRecibo}</p>
        </div>

        <div className="modal-pie sin-imprimir">
          <button className="btn" onClick={onCerrar}>
            {textoCerrar}
          </button>
          <FacturaVenta venta={venta} />
          <button className="btn oscuro" onClick={() => window.print()}>
            Imprimir recibo
          </button>
        </div>
      </div>
    </div>
  )
}

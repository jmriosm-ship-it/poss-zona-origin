import { imprimir } from '../impresion.js'
import FacturaVenta from './FacturaVenta.jsx'
import { useConfig } from '../almacen.js'
import { dinero, etiquetaVenta, vencimientoGarantia } from '../utils.js'

const fechaCorta = (d) => d.toLocaleDateString('es-CO', { dateStyle: 'medium' })
const fechaLarga = (iso) => new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }).replace(/ de /g, ' ')
const hora = (iso) => new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })

// Ticket para impresora térmica de 80 mm
export default function Recibo({ venta, onCerrar, textoCerrar = 'Nueva venta' }) {
  const config = useConfig()
  const conGarantia = venta.items.some((i) => i.garantiaDias > 0)
  const cantidad = venta.items.reduce((s, i) => s + i.cantidad, 0)

  return (
    <div className="fondo-modal">
      <div className="modal modal-chico">
        <div className="ticket">
          <img className="t-logo" src="./logo.png" alt="" />
          <h3>{config.negocio.toUpperCase()}</h3>
          {config.nit && <p className="centro">Nit: {config.nit}</p>}
          <p className="centro">RECIBO DE VENTA</p>
          {config.ciudad && <p className="centro">{config.ciudad}</p>}
          {config.direccion && <p className="centro">{config.direccion}</p>}
          {config.telefono && <p className="centro">Tel. {config.telefono}</p>}
          <hr />
          <p>Ticket POS Nro: {etiquetaVenta(venta)}</p>
          <p>
            Fecha: {fechaLarga(venta.fecha)} Hora: {hora(venta.fecha)}
          </p>
          {venta.caja && <p>Des: {venta.caja}</p>}
          {venta.vendedorNombre && <p>Atendido por: {venta.vendedorNombre}</p>}
          <p>Cliente: {venta.clienteNombre || 'cliente esporádico'}</p>
          <hr />
          <div className="t-fila t-enc">
            <span>Producto</span>
            <span>Cant</span>
            <span>Subto</span>
          </div>
          <hr />
          {venta.items.map((i) => (
            <div className="t-item" key={i.varianteId}>
              <div>
                {i.nombre.toUpperCase()}
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
              <div className="t-der">
                {dinero(i.precio)} X {i.cantidad} = {dinero(i.precio * i.cantidad)}
              </div>
            </div>
          ))}
          <hr />
          <p>Total ítems: {venta.items.length}</p>
          <p>Total cantidad: {cantidad}</p>
          <div className="t-fila">
            <span>Subtotal:</span>
            <span>{dinero(venta.subtotal)}</span>
          </div>
          <div className="t-fila">
            <span>Descuento:</span>
            <span>{dinero(venta.descuento || 0)}</span>
          </div>
          <div className="t-fila t-total">
            <span>Total:</span>
            <span>{dinero(venta.total)}</span>
          </div>
          <hr />
          {venta.pagos.map((p) => (
            <div className="t-fila" key={p.medio}>
              <span>{p.medio}:</span>
              <span>{dinero(p.valor)}</span>
            </div>
          ))}
          <div className="t-fila t-total">
            <span>Cambio:</span>
            <span>{dinero(venta.cambio || 0)}</span>
          </div>
          {venta.credito && (
            <>
              <hr />
              <p className="centro">CRÉDITO EN CUOTAS</p>
              <div className="t-fila">
                <span>Cuota inicial</span>
                <span>{dinero(venta.credito.cuotaInicial)}</span>
              </div>
              <div className="t-fila">
                <span>{venta.credito.plazo} cuotas {venta.credito.frecuencia === 'quincenal' ? 'quincenales ' : ''}de</span>
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
          <button className="btn oscuro" onClick={() => imprimir()}>
            Imprimir recibo
          </button>
        </div>
      </div>
    </div>
  )
}

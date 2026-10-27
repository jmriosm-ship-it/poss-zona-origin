import { useConfig } from '../almacen.js'
import { dinero, fechaHora, resumenCredito } from '../utils.js'

const fechaLarga = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('es-CO', { dateStyle: 'medium' })

// Plan de pagos y condiciones del crédito, para imprimir en hoja normal y firmar con el cliente.
// Es un modelo: conviene que un abogado lo revise (y definir si se firma también un pagaré).
export default function ContratoCredito({ credito, onCerrar }) {
  const config = useConfig()
  const r = resumenCredito(credito)
  const negocio = config.negocio
  const titular = config.titular || '[titular del negocio]'
  const id = config.identificacion || '[NIT o cédula]'

  return (
    <div className="fondo-modal">
      <div className="modal" style={{ width: 'min(820px, 100%)' }}>
        <div className="imprimible contrato">
          <h2 style={{ textAlign: 'center', marginBottom: 2 }}>{negocio.toUpperCase()}</h2>
          <p style={{ textAlign: 'center', margin: 0 }} className="gris">
            {[config.direccion, config.telefono && `Tel. ${config.telefono}`].filter(Boolean).join(' · ')}
          </p>
          <h3 style={{ textAlign: 'center', margin: '16px 0 4px' }}>CONDICIONES DEL CRÉDITO Y PLAN DE PAGOS</h3>
          <p style={{ textAlign: 'center', marginTop: 0 }} className="gris">
            Venta #{String(credito.ventaNumero).padStart(5, '0')} · {fechaHora(credito.fecha)}
          </p>

          <table className="tabla contrato-datos">
            <tbody>
              <tr>
                <td>
                  <strong>Acreedor</strong>
                </td>
                <td>
                  {titular} (identificación {id}) — {negocio}
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Deudor</strong>
                </td>
                <td>
                  {credito.clienteNombre} · C.C. {credito.clienteCedula || '____________'} · Tel. {credito.clienteTelefono || '____________'}
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Producto</strong>
                </td>
                <td>
                  {credito.descripcion}
                  {credito.imeis?.length > 0 && ` · IMEI/Serial: ${credito.imeis.join(', ')}`}
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Precio de la venta</strong>
                </td>
                <td>{dinero(credito.precio)}</td>
              </tr>
              <tr>
                <td>
                  <strong>Cuota inicial pagada</strong>
                </td>
                <td>{dinero(credito.cuotaInicial)}</td>
              </tr>
              <tr>
                <td>
                  <strong>Valor financiado</strong>
                </td>
                <td>{dinero(credito.financiado)}</td>
              </tr>
              <tr>
                <td>
                  <strong>Plazo e interés</strong>
                </td>
                <td>
                  {credito.plazo} cuotas mensuales · {credito.tasa}% mensual
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Cuota mensual</strong>
                </td>
                <td>{dinero(credito.cuotaValor)}</td>
              </tr>
              <tr>
                <td>
                  <strong>Total a pagar del crédito</strong>
                </td>
                <td>
                  {dinero(credito.totalCredito)} (intereses: {dinero(credito.intereses)})
                </td>
              </tr>
            </tbody>
          </table>

          <h4 style={{ marginTop: 16 }}>Plan de pagos</h4>
          <table className="tabla">
            <thead>
              <tr>
                <th>Cuota</th>
                <th>Fecha de pago</th>
                <th>Valor</th>
                <th>Pagado</th>
                <th>Pendiente</th>
              </tr>
            </thead>
            <tbody>
              {r.detalle.map((q) => (
                <tr key={q.n}>
                  <td>{q.n}</td>
                  <td>{fechaLarga(q.vence)}</td>
                  <td>{dinero(q.valor)}</td>
                  <td>{dinero(q.pagado)}</td>
                  <td>{dinero(q.pendiente)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h4 style={{ marginTop: 16 }}>Condiciones</h4>
          <ol className="contrato-clausulas">
            <li>El deudor se obliga a pagar las cuotas en las fechas indicadas, en la dirección del acreedor o por los medios que este informe.</li>
            <li>
              Si una cuota no se paga en su fecha, se causarán intereses de mora a la tasa máxima que permita la ley sobre el valor vencido, sin superar la tasa de usura
              certificada por la Superintendencia Financiera.
            </li>
            <li>El deudor puede pagar de forma anticipada. Los pagos se aplican primero a las cuotas más antiguas.</li>
            <li>El incumplimiento de dos o más cuotas faculta al acreedor para exigir el saldo pendiente, conforme a la ley y a lo que las partes pacten.</li>
            <li>La propiedad y la garantía del producto se rigen por el recibo de venta y la política de garantía del negocio.</li>
            <li>
              El deudor autoriza el tratamiento de sus datos personales para gestionar este crédito, conforme a la Ley 1581 de 2012 y a la política de datos del negocio, y declara que
              la información que entregó es veraz.
            </li>
            <li>
              Consulta y reporte ante operadores de información financiera (Ley 1266 de 2008): el deudor <strong>SÍ ☐ &nbsp; NO ☐</strong> autoriza la consulta y el reporte de su comportamiento de
              pago.
            </li>
          </ol>
          <p className="gris" style={{ fontSize: 11 }}>
            Modelo de condiciones. Debe ser revisado por un abogado antes de usarse; si se acuerda un pagaré o una garantía adicional, se firma por separado.
          </p>

          <div className="firmas">
            <div>
              <p>______________________________</p>
              <p>{credito.clienteNombre}</p>
              <p>C.C. {credito.clienteCedula || '____________'}</p>
            </div>
            <div>
              <p>______________________________</p>
              <p>{titular}</p>
              <p>{negocio}</p>
            </div>
          </div>
        </div>

        <div className="modal-pie sin-imprimir">
          <button className="btn" onClick={onCerrar}>
            Cerrar
          </button>
          <button className="btn oscuro" onClick={() => window.print()}>
            Imprimir contrato
          </button>
        </div>
      </div>
    </div>
  )
}

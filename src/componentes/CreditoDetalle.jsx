import { useState } from 'react'
import ContratoCredito from './ContratoCredito.jsx'
import { useCreditos, pagarCredito, cancelarCredito } from '../almacen.js'
import { useUsuario } from '../auth.js'
import { dinero, fechaHora, resumenCredito } from '../utils.js'

const fechaLarga = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('es-CO', { dateStyle: 'medium' })

export function recordatorioCredito(c) {
  const r = resumenCredito(c)
  const tel = (c.clienteTelefono || '').replace(/\D/g, '')
  if (!tel) return null
  const numero = tel.length === 10 ? '57' + tel : tel
  const texto =
    r.mora > 0
      ? `Hola ${c.clienteNombre}, te recordamos que tienes ${r.vencidas.length} cuota(s) vencida(s) de tu crédito por ${dinero(r.mora)}. Tu saldo total es ${dinero(r.saldo)}. ¿Cuándo podemos esperar tu pago? ¡Gracias!`
      : `Hola ${c.clienteNombre}, te recordamos que tu próxima cuota de ${dinero(r.proxima?.pendiente || 0)} vence el ${r.proxima ? fechaLarga(r.proxima.vence) : ''}. ¡Gracias!`
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`
}

// Detalle de un crédito: cuotas, pagos, contrato y recordatorio
export default function CreditoDetalle({ creditoId, onCerrar, onPagar }) {
  const credito = useCreditos().find((c) => c.id === creditoId)
  const admin = useUsuario()?.rol === 'admin'
  const [contrato, setContrato] = useState(false)
  if (!credito) return null

  const r = resumenCredito(credito)
  const enlace = recordatorioCredito(credito)

  return (
    <div className="fondo-modal" onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className="modal">
        <div className="panel-cabeza">
          <div>
            <h2>Crédito · {credito.clienteNombre}</h2>
            <p className="sub">
              Venta {credito.ventaEtiqueta || '#' + String(credito.ventaNumero).padStart(5, '0')} · {credito.plazo} cuotas de {dinero(credito.cuotaValor)} · {credito.tasa}% mensual
            </p>
          </div>
          <button className="boton-icono" onClick={onCerrar} aria-label="Cerrar">
            ✕
          </button>
        </div>

        <div className="tarjetas" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <div className="tarjeta">
            <div className="etiqueta">Saldo</div>
            <div className="valor">{dinero(r.saldo)}</div>
            <small>Pagado {dinero(r.pagado)} de {dinero(credito.totalCredito)}</small>
          </div>
          <div className={'tarjeta' + (r.mora > 0 ? ' oscura' : '')}>
            <div className="etiqueta">{r.mora > 0 ? 'En mora' : 'Próxima cuota'}</div>
            <div className="valor">{r.mora > 0 ? dinero(r.mora) : r.proxima ? dinero(r.proxima.pendiente) : '—'}</div>
            <small>{r.mora > 0 ? `${r.diasMora} días de atraso` : r.proxima ? `Vence ${fechaLarga(r.proxima.vence)}` : 'Sin cuotas pendientes'}</small>
          </div>
          <div className="tarjeta">
            <div className="etiqueta">Estado</div>
            <div className="valor" style={{ fontSize: 22, textTransform: 'capitalize' }}>{r.estado}</div>
            <small>Intereses del crédito: {dinero(credito.intereses)}</small>
          </div>
        </div>

        <table className="tabla">
          <thead>
            <tr>
              <th>Cuota</th>
              <th>Vence</th>
              <th>Valor</th>
              <th>Pagado</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {r.detalle.map((q) => {
              const vencida = q.pendiente > 0 && q.vence < new Date().toLocaleDateString('en-CA')
              return (
                <tr key={q.n} className={q.pendiente === 0 ? 'cuota-pagada' : vencida ? 'cuota-vencida' : ''}>
                  <td>{q.n}</td>
                  <td>{fechaLarga(q.vence)}</td>
                  <td>{dinero(q.valor)}</td>
                  <td>{dinero(q.pagado)}</td>
                  <td>{q.pendiente === 0 ? 'Pagada' : vencida ? 'Vencida' : q.pagado > 0 ? 'Parcial' : 'Pendiente'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {credito.pagos.length > 0 && (
          <>
            <h3 className="sub-titulo">Pagos recibidos</h3>
            {credito.pagos.map((p) => (
              <p className="gris" key={p.id}>
                {fechaHora(p.fecha)} · {dinero(p.valor)} por {p.medio}
              </p>
            ))}
          </>
        )}

        <div className="modal-pie" style={{ flexWrap: 'wrap' }}>
          {admin && credito.estado === 'activo' && r.saldo > 0 && (
            <button
              className="btn"
              style={{ color: 'var(--rojo)', marginRight: 'auto' }}
              onClick={() => confirm('¿Cancelar este crédito? Lo que el cliente ya pagó hay que devolverlo aparte.') && cancelarCredito(credito.id)}
            >
              Cancelar crédito
            </button>
          )}
          {enlace && (
            <a className="btn" href={enlace} target="_blank" rel="noreferrer">
              Recordar por WhatsApp
            </a>
          )}
          <button className="btn" onClick={() => setContrato(true)}>
            Contrato y plan de pagos
          </button>
          {credito.estado === 'activo' && r.saldo > 0 && (
            <button className="btn oscuro" onClick={() => onPagar(credito, r)}>
              Registrar pago
            </button>
          )}
        </div>
      </div>

      {contrato && <ContratoCredito credito={credito} onCerrar={() => setContrato(false)} />}
    </div>
  )
}

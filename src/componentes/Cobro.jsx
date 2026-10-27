import { useState } from 'react'
import { useClientes, useConfig } from '../almacen.js'
import { aFechaISO, calcularCuota, dinero, listaNumeros, nuevoId, sumarMeses } from '../utils.js'
import { constanciaAutorizacion } from '../legal.js'
import { abrirVisor } from '../visor.js'

const MEDIOS = [
  ['efectivo', 'Efectivo'],
  ['transferencia', 'Transferencia'],
  ['tarjeta', 'Tarjeta'],
  ['fiado', 'Fiado'],
  ['credito', 'Crédito (cuotas)'],
]

// Ventana de cobro: permite combinar medios de pago, incluido el fiado y el crédito en cuotas.
// Si la venta ya tiene un cliente elegido en la caja, el fiado y el crédito quedan a su nombre.
export default function Cobro({ total, clienteInicial, onCancelar, onConfirmar }) {
  const clientes = useClientes()
  const config = useConfig()
  const tasas = listaNumeros(config.creditoTasas)
  const plazos = listaNumeros(config.creditoPlazos)
  const tasaMax = Number(config.tasaMaximaMensual) || 0

  const [v, setV] = useState({ efectivo: '', transferencia: '', tarjeta: '', fiado: '', credito: '' })
  const [clienteId, setClienteId] = useState('')
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [autoriza, setAutoriza] = useState(false)
  const [cedula, setCedula] = useState(clienteInicial?.cedula || '')
  const [plazo, setPlazo] = useState(plazos.includes(12) ? 12 : plazos[0] || 12)
  const [tasa, setTasa] = useState(tasas[0] ?? 2)
  const [primera, setPrimera] = useState(sumarMeses(aFechaISO(new Date()), 1))

  const num = (k) => Number(v[k]) || 0
  const pagado = num('efectivo') + num('transferencia') + num('tarjeta') + num('fiado') + num('credito')
  const falta = total - pagado
  const cambio = Math.max(0, pagado - total)
  const hayFiado = num('fiado') > 0
  const hayCredito = num('credito') > 0
  const pideCliente = (hayFiado || hayCredito) && !clienteInicial
  const clienteListo = !pideCliente || clienteId !== '' || (nombre.trim() !== '' && autoriza)

  // Crédito en cuotas: lo que no se financia ni se fía es la cuota inicial
  const inicial = total - num('credito') - num('fiado')
  const inicialPct = total > 0 ? (inicial / total) * 100 : 0
  const cuota = hayCredito ? calcularCuota(num('credito'), Number(plazo), Number(tasa)) : 0
  const totalCredito = cuota * Number(plazo)
  const errorCredito = !hayCredito
    ? ''
    : cedula.trim() === ''
      ? 'Escribe la cédula del cliente para el crédito.'
      : inicialPct + 0.0001 < (Number(config.creditoInicialMin) || 0)
        ? `La cuota inicial mínima es ${config.creditoInicialMin}% (${dinero((total * config.creditoInicialMin) / 100)}).`
        : tasaMax && Number(tasa) > tasaMax
          ? `El interés (${tasa}%) supera el tope mensual permitido (${tasaMax}%).`
          : ''

  const valido = pagado >= total && cambio <= num('efectivo') && clienteListo && !errorCredito

  // Llena el medio con lo que falta para completar el total
  const completar = (k) => setV({ ...v, [k]: String(Math.max(0, total - (pagado - num(k)))) })

  function confirmar(e) {
    e.preventDefault()
    if (!valido) return
    const pagos = MEDIOS.filter(([k]) => num(k) > 0).map(([k, texto]) => ({ medio: k === 'credito' ? 'Crédito' : texto, valor: num(k) }))
    let cliente = clienteInicial || null
    if (pideCliente) {
      cliente = clientes.find((c) => c.id === clienteId) || {
        id: nuevoId(),
        nombre: nombre.trim(),
        telefono: telefono.trim(),
        autorizacion: constanciaAutorizacion(),
        nuevo: true,
      }
    }
    if (cliente && hayCredito) cliente = { ...cliente, cedula: cedula.trim() }
    const credito = hayCredito
      ? { financiado: num('credito'), plazo: Number(plazo), tasa: Number(tasa), primeraFecha: primera, cuotaInicial: inicial }
      : null
    onConfirmar(pagos, cambio, cliente, credito)
  }

  return (
    <div className="fondo-modal" onMouseDown={(e) => e.target === e.currentTarget && onCancelar()}>
      <form className="modal modal-chico" onSubmit={confirmar}>
        <div className="panel-cabeza">
          <h2>Cobrar</h2>
          <button type="button" className="boton-icono" onClick={onCancelar} aria-label="Cerrar">
            ✕
          </button>
        </div>

        <div className="total-grande">
          <span>Total a pagar</span>
          <strong>{dinero(total)}</strong>
        </div>

        {MEDIOS.map(([k, texto], i) => (
          <div className="pago-fila" key={k}>
            <label>
              <span>{texto}</span>
              <input
                type="number"
                min="0"
                value={v[k]}
                onChange={(e) => setV({ ...v, [k]: e.target.value })}
                autoFocus={i === 0}
                placeholder="0"
              />
            </label>
            <button type="button" className="btn chico" onClick={() => completar(k)}>
              Completar
            </button>
          </div>
        ))}

        {(hayFiado || hayCredito) && clienteInicial && (
          <p className="gris">
            {hayCredito ? 'El crédito' : 'El fiado'} queda a nombre de {clienteInicial.nombre}.
          </p>
        )}

        {pideCliente && (
          <div className="cliente-box">
            <label>
              <span>Cliente que queda debiendo</span>
              <select
                value={clienteId}
                onChange={(e) => {
                  setClienteId(e.target.value)
                  setCedula(clientes.find((c) => c.id === e.target.value)?.cedula || '')
                }}
              >
                <option value="">— Cliente nuevo —</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </label>
            {clienteId === '' && (
              <>
                <div className="inline-form" style={{ marginTop: 8 }}>
                  <input placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
                  <input placeholder="Teléfono (WhatsApp)" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
                </div>
                <label className="casilla-acepto">
                  <input type="checkbox" checked={autoriza} onChange={(e) => setAutoriza(e.target.checked)} />
                  <span>
                    El cliente <strong>autorizó</strong> guardar sus datos.{' '}
                    <button type="button" className="enlace" onClick={() => abrirVisor('legal', 'clientes')}>
                      Ver texto
                    </button>
                  </span>
                </label>
              </>
            )}
          </div>
        )}

        {hayCredito && (
          <div className="cliente-box">
            <div className="credito-campos">
              <label>
                <span>Cédula del cliente</span>
                <input value={cedula} onChange={(e) => setCedula(e.target.value)} />
              </label>
              <label>
                <span>Plazo (cuotas)</span>
                <select value={plazo} onChange={(e) => setPlazo(Number(e.target.value))}>
                  {plazos.map((p) => (
                    <option key={p} value={p}>
                      {p} meses
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Interés mensual (%)</span>
                <select value={tasa} onChange={(e) => setTasa(Number(e.target.value))}>
                  {tasas.map((t) => (
                    <option key={t} value={t}>
                      {t}%
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Primera cuota</span>
                <input type="date" value={primera} onChange={(e) => setPrimera(e.target.value)} />
              </label>
            </div>
            <div className="lineas" style={{ marginTop: 10 }}>
              <div>
                Cuota inicial ({Math.round(inicialPct)}%) <strong>{dinero(inicial)}</strong>
              </div>
              <div>
                Valor financiado <strong>{dinero(num('credito'))}</strong>
              </div>
              <div>
                Cuota mensual <strong>{dinero(cuota)}</strong>
              </div>
              <div className="fuerte">
                Total del crédito ({plazo} cuotas) <strong>{dinero(totalCredito)}</strong>
              </div>
            </div>
            {errorCredito && <p className="error">{errorCredito}</p>}
          </div>
        )}

        <div className="lineas">
          <div>
            Pagado <strong>{dinero(pagado)}</strong>
          </div>
          {falta > 0 ? (
            <div className="fuerte">
              Falta <strong style={{ color: 'var(--rojo)' }}>{dinero(falta)}</strong>
            </div>
          ) : (
            <div className="fuerte">
              Cambio <strong>{dinero(cambio)}</strong>
            </div>
          )}
        </div>
        {pagado > total && cambio > num('efectivo') && <p className="error">El cambio solo se puede dar en efectivo.</p>}
        {pideCliente && !clienteListo && <p className="error">Elige un cliente, o escribe el nombre del nuevo y marca su autorización.</p>}

        <div className="modal-pie">
          <button type="button" className="btn" onClick={onCancelar}>
            Cancelar
          </button>
          <button type="submit" className="btn oscuro" disabled={!valido}>
            Confirmar venta
          </button>
        </div>
      </form>
    </div>
  )
}

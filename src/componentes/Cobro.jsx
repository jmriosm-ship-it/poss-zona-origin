import { useEffect, useState } from 'react'
import { useClientes, useConfig } from '../almacen.js'
import { aFechaISO, calcularCuota, dinero, esQuincenal, listaNumeros, nuevoId, sumarDias, sumarMeses } from '../utils.js'
import { constanciaAutorizacion } from '../legal.js'
import { abrirVisor } from '../visor.js'

const MEDIOS = [
  ['efectivo', 'Efectivo'],
  ['transferencia', 'Transferencia'],
  ['tarjeta', 'Tarjeta'],
  ['fiado', 'Fiado'],
  ['credito', 'Crédito (cuotas)'],
]
const BILLETES = [10000, 20000, 50000, 100000]

// Cobro en pantalla completa: combina medios de pago, incluido el fiado y el crédito en cuotas.
// Si la venta ya tiene un cliente elegido en la caja, el fiado y el crédito quedan a su nombre.
const PORCENTAJES_INICIAL = [10, 20, 30, 40, 50]

export default function Cobro({ total, ticket, articulos, clienteInicial, onCancelar, onConfirmar }) {
  const clientes = useClientes()
  const config = useConfig()
  const tasas = listaNumeros(config.creditoTasas)
  const plazosMensual = listaNumeros(config.creditoPlazos)
  const plazosQuincenal = listaNumeros(config.creditoPlazosQuincenal || '24, 36, 48')
  const tasaMax = Number(config.tasaMaximaMensual) || 0

  const [v, setV] = useState({ efectivo: '', transferencia: '', tarjeta: '', fiado: '', credito: '' })
  const [clienteId, setClienteId] = useState('')
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [autoriza, setAutoriza] = useState(false)
  const [cedula, setCedula] = useState(clienteInicial?.cedula || '')
  const [frecuencia, setFrecuencia] = useState('mensual') // 'mensual' o 'quincenal' (cada 15 días)
  const plazos = esQuincenal(frecuencia) ? plazosQuincenal : plazosMensual
  const [plazo, setPlazo] = useState(plazosMensual.includes(12) ? 12 : plazosMensual[0] || 12)
  const [tasa, setTasa] = useState(tasas[0] ?? 2)
  const [primera, setPrimera] = useState(sumarMeses(aFechaISO(new Date()), 1))

  // Esc vuelve a la venta
  useEffect(() => {
    const alTeclear = (e) => e.key === 'Escape' && onCancelar()
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [onCancelar])

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
  const cuota = hayCredito ? calcularCuota(num('credito'), Number(plazo), Number(tasa), frecuencia) : 0
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

  // Cuota inicial por porcentaje: lo demás se financia; la inicial se anota en efectivo (se puede cambiar de medio)
  const aplicarInicial = (p) => {
    const ini = Math.round((total * p) / 100)
    const otroMedio = num('transferencia') > 0 || num('tarjeta') > 0
    setV({ ...v, credito: String(Math.max(0, total - ini - num('fiado'))), efectivo: otroMedio ? v.efectivo : String(ini) })
  }

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
      ? { financiado: num('credito'), plazo: Number(plazo), tasa: Number(tasa), primeraFecha: primera, cuotaInicial: inicial, frecuencia }
      : null
    onConfirmar(pagos, cambio, cliente, credito)
  }

  return (
    <div className="cobro-pantalla">
      <form className="cobro-form" onSubmit={confirmar}>
        <div className="cobro-cab">
          <div>
            <h1>Cobrar</h1>
            <span className="gris">
              Ticket {ticket} · {articulos} {articulos === 1 ? 'artículo' : 'artículos'}
              {clienteInicial ? ` · ${clienteInicial.nombre}` : ''}
            </span>
          </div>
          <button type="button" className="btn" onClick={onCancelar}>
            ← Volver a la venta (Esc)
          </button>
        </div>

        <div className="cobro-cuerpo">
          <div className="cobro-izq">
            <div className="metodos">
              {MEDIOS.map(([k, texto], i) => (
                <div className={'metodo' + (num(k) > 0 ? ' con-valor' : '')} key={k}>
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
                  <div className="metodo-botones">
                    <button type="button" className="btn chico" onClick={() => completar(k)}>
                      Completar
                    </button>
                    {k === 'credito' && (
                      <>
                        <span className="gris" style={{ alignSelf: 'center' }}>
                          Inicial:
                        </span>
                        {PORCENTAJES_INICIAL.map((p) => (
                          <button
                            type="button"
                            key={p}
                            className={'btn chico' + (hayCredito && Math.round(inicialPct) === p ? ' oscuro' : '')}
                            disabled={p < (Number(config.creditoInicialMin) || 0)}
                            title={p < (Number(config.creditoInicialMin) || 0) ? 'Menos del mínimo permitido (' + config.creditoInicialMin + '%)' : ''}
                            onClick={() => aplicarInicial(p)}
                          >
                            {p}%
                          </button>
                        ))}
                      </>
                    )}
                    {k === 'efectivo' &&
                      BILLETES.map((b) => (
                        <button type="button" key={b} className="btn chico" onClick={() => setV({ ...v, efectivo: String(b) })}>
                          {dinero(b)}
                        </button>
                      ))}
                    {num(k) > 0 && (
                      <button type="button" className="enlace" onClick={() => setV({ ...v, [k]: '' })}>
                        Borrar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

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
                    <span>Las cuotas se pagan</span>
                    <select
                      value={frecuencia}
                      onChange={(e) => {
                        const f = e.target.value
                        setFrecuencia(f)
                        const lista = esQuincenal(f) ? plazosQuincenal : plazosMensual
                        setPlazo(lista.includes(esQuincenal(f) ? 24 : 12) ? (esQuincenal(f) ? 24 : 12) : lista[0] || 12)
                        setPrimera(esQuincenal(f) ? sumarDias(aFechaISO(new Date()), 15) : sumarMeses(aFechaISO(new Date()), 1))
                      }}
                    >
                      <option value="mensual">Cada mes</option>
                      <option value="quincenal">Cada 15 días (quincenal)</option>
                    </select>
                  </label>
                  <label>
                    <span>Plazo (cuotas)</span>
                    <select value={plazo} onChange={(e) => setPlazo(Number(e.target.value))}>
                      {plazos.map((p) => (
                        <option key={p} value={p}>
                          {esQuincenal(frecuencia) ? p + ' quincenas (' + (p % 2 === 0 ? p / 2 + ' meses' : p * 0.5 + ' meses') + ')' : p + ' meses'}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Interés mensual (%){esQuincenal(frecuencia) ? ' · en cada quincena se cobra la mitad' : ''}</span>
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
                    Cuota {esQuincenal(frecuencia) ? 'quincenal' : 'mensual'} <strong>{dinero(cuota)}</strong>
                  </div>
                  <div className="fuerte">
                    Total del crédito ({plazo} cuotas) <strong>{dinero(totalCredito)}</strong>
                  </div>
                </div>
                {errorCredito && <p className="error">{errorCredito}</p>}
              </div>
            )}
          </div>

          <aside className="cobro-der">
            <div className="total-gigante">
              <small>Total a pagar</small>
              <strong>{dinero(total)}</strong>
            </div>

            <div className="lineas cobro-lineas">
              <div>
                Pagado <strong>{dinero(pagado)}</strong>
              </div>
              {falta > 0 ? (
                <div className="fuerte">
                  Falta <strong style={{ color: 'var(--rojo)' }}>{dinero(falta)}</strong>
                </div>
              ) : (
                <div className="fuerte">
                  Cambio <strong style={{ color: 'var(--verde)' }}>{dinero(cambio)}</strong>
                </div>
              )}
            </div>

            {(hayCredito || hayFiado) && falta > 0 && (
              <div className="aviso-legal" style={{ margin: '8px 0' }}>
                <strong>Falta cobrar la cuota inicial: {dinero(falta)}.</strong> Lo del crédito solo es lo que se financia; lo demás el cliente lo paga ahora en efectivo, transferencia o tarjeta.{' '}
                <button type="button" className="enlace" onClick={() => setV({ ...v, efectivo: String(num('efectivo') + falta) })}>
                  Cobrarla en efectivo
                </button>
              </div>
            )}
            {pagado > total && cambio > num('efectivo') && <p className="error">El cambio solo se puede dar en efectivo.</p>}
            {pideCliente && !clienteListo && <p className="error">Elige un cliente, o escribe el nombre del nuevo y marca su autorización.</p>}

            <button type="submit" className="btn oscuro btn-cobrar" disabled={!valido}>
              Confirmar venta
            </button>
          </aside>
        </div>
      </form>
    </div>
  )
}

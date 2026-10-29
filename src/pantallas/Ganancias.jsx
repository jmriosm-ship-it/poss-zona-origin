import { useState } from 'react'
import Grafica from '../componentes/Grafica.jsx'
import Calendario from '../componentes/Calendario.jsx'
import { useVentas, useGastos, useCreditos, registrarGasto, borrarGasto } from '../almacen.js'
import { calcular } from '../reportes.js'
import { PERIODOS, aFechaISO, dinero, fechaLarga, rangoPeriodo } from '../utils.js'

const CATEGORIAS_GASTO = ['Arriendo', 'Servicios', 'Nómina', 'Publicidad', 'Bolsas y empaques', 'Transporte', 'Otros']

export default function Ganancias() {
  const ventas = useVentas()
  const gastos = useGastos()
  const creditos = useCreditos()
  const [periodo, setPeriodo] = useState('mes')
  const [desde, setDesde] = useState(aFechaISO(new Date(new Date().getFullYear(), new Date().getMonth(), 1)))
  const [hasta, setHasta] = useState(aFechaISO(new Date()))
  const [form, setForm] = useState({ categoria: CATEGORIAS_GASTO[0], concepto: '', valor: '' })

  // "Fechas": del día de inicio al día final, incluido
  const rangoFechas = [new Date(desde + 'T00:00:00'), new Date(new Date(hasta + 'T00:00:00').getTime() + 864e5)]
  const rango = periodo === 'rango' ? rangoFechas : rangoPeriodo(periodo === 'calendario' ? 'mes' : periodo)
  const r = calcular(ventas, gastos, rango, creditos)
  const margen = r.ingresos > 0 ? Math.round((r.neta / r.ingresos) * 100) : 0

  function agregarGasto(e) {
    e.preventDefault()
    if (!(Number(form.valor) > 0)) return
    registrarGasto({ categoria: form.categoria, concepto: form.concepto.trim() || form.categoria, valor: Number(form.valor) })
    setForm({ ...form, concepto: '', valor: '' })
  }

  const opciones = [...PERIODOS, ['rango', 'Fechas'], ['calendario', 'Calendario']]
  const encabezado = (
    <>
      <div className="cabecera">
        <div>
          <p className="kicker">La plata de verdad</p>
          <h1 className="titulo">Ganancias</h1>
          <p className="subtitulo">Ventas, menos lo que costó la mercancía, menos los gastos del local.</p>
        </div>
        <div className="segmentos">
          {opciones.map(([k, t]) => (
            <button key={k} className={periodo === k ? 'activo' : ''} onClick={() => setPeriodo(k)}>
              {t}
            </button>
          ))}
        </div>
      </div>
      {periodo === 'rango' && (
        <div className="rango-fechas">
          Desde <input type="date" value={desde} max={hasta} onChange={(e) => e.target.value && setDesde(e.target.value)} />
          hasta <input type="date" value={hasta} min={desde} onChange={(e) => e.target.value && setHasta(e.target.value)} />
        </div>
      )}
    </>
  )

  if (periodo === 'calendario') {
    return (
      <>
        {encabezado}
        <Calendario />
      </>
    )
  }

  return (
    <>
      {encabezado}

      <div className="tarjetas">
        <div className="tarjeta">
          <div className="etiqueta">Ingresos por ventas</div>
          <div className="valor">{dinero(r.ingresos)}</div>
          <small>
            {r.nVentas} ventas · {r.unidades} unidades
          </small>
        </div>
        <div className="tarjeta">
          <div className="etiqueta">Costo de la mercancía vendida</div>
          <div className="valor">{dinero(r.costos)}</div>
          <small>Lo que te costó lo que vendiste</small>
        </div>
        <div className="tarjeta">
          <div className="etiqueta">Ganancia bruta</div>
          <div className="valor">{dinero(r.bruta)}</div>
          <small>Antes de gastos</small>
        </div>
        <div className="tarjeta oscura">
          <div className="etiqueta">Ganancia neta</div>
          <div className="valor">{dinero(r.neta)}</div>
          <small>{margen}% sobre los ingresos</small>
        </div>
      </div>

      <div className="rejilla">
        <div className="panel">
          <div className="panel-cabeza">
            <div>
              <h2>Ingresos y costos</h2>
              <p className="sub">Por día</p>
            </div>
          </div>
          <Grafica dias={r.dias} />
        </div>

        <div className="panel">
          <div className="panel-cabeza">
            <div>
              <h2>La cuenta</h2>
              <p className="sub">Paso a paso</p>
            </div>
          </div>
          <div className="lineas">
            <div>
              Ingresos por ventas <strong>{dinero(r.ingresos)}</strong>
            </div>
            <div>
              Costo de mercancía vendida <strong>− {dinero(r.costos)}</strong>
            </div>
            <div className="fuerte">
              Ganancia bruta <strong>{dinero(r.bruta)}</strong>
            </div>
            <div>
              Intereses de créditos <strong>+ {dinero(r.intereses)}</strong>
            </div>
            <div>
              Gastos del local <strong>− {dinero(r.gastos)}</strong>
            </div>
          </div>
          <div className="resultado-neto">
            <div>
              <small>Ganancia neta</small>
              <strong>{dinero(r.neta)}</strong>
            </div>
            <span>{margen}%</span>
          </div>
        </div>
      </div>

      <div className="rejilla">
        <div className="panel">
          <div className="panel-cabeza">
            <div>
              <h2>Gastos del local</h2>
              <p className="sub">Si no los anotas, la ganancia sale más alta de lo real</p>
            </div>
          </div>
          <form className="inline-form" onSubmit={agregarGasto}>
            <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
              {CATEGORIAS_GASTO.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <input placeholder="Detalle (opcional)" value={form.concepto} onChange={(e) => setForm({ ...form, concepto: e.target.value })} />
            <input type="number" min="0" placeholder="Valor" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} style={{ width: 120 }} />
            <button className="btn oscuro chico" type="submit">
              Agregar gasto
            </button>
          </form>
          {r.gastosLista.length === 0 ? (
            <div className="vacio">Sin gastos en este período.</div>
          ) : (
            <table className="tabla">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Gasto</th>
                  <th>Valor</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {r.gastosLista.map((g) => (
                  <tr key={g.id}>
                    <td>{fechaLarga(g.fecha)}</td>
                    <td>
                      <strong>{g.categoria}</strong>
                      {g.concepto !== g.categoria && <small className="gris">{g.concepto}</small>}
                    </td>
                    <td>{dinero(g.valor)}</td>
                    <td className="acciones">
                      <button className="enlace peligro" onClick={() => confirm('¿Borrar este gasto?') && borrarGasto(g.id)}>
                        Borrar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="panel">
          <div className="panel-cabeza">
            <div>
              <h2>Ganancia por categoría</h2>
              <p className="sub">Qué deja más</p>
            </div>
          </div>
          {r.categorias.length === 0 ? (
            <div className="vacio">Aún no hay ventas en este período.</div>
          ) : (
            <table className="tabla">
              <thead>
                <tr>
                  <th>Categoría</th>
                  <th>Unidades</th>
                  <th>Ganancia</th>
                </tr>
              </thead>
              <tbody>
                {r.categorias.map((c) => (
                  <tr key={c.nombre}>
                    <td>
                      <strong>{c.nombre}</strong>
                    </td>
                    <td>{c.cantidad}</td>
                    <td>{dinero(c.ganancia)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="panel-cabeza" style={{ marginTop: 20 }}>
            <div>
              <h2>Ventas por vendedor</h2>
            </div>
          </div>
          {r.vendedores.length === 0 ? (
            <div className="vacio">Sin ventas.</div>
          ) : (
            <table className="tabla">
              <thead>
                <tr>
                  <th>Vendedor</th>
                  <th>Ventas</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {r.vendedores.map((v) => (
                  <tr key={v.nombre}>
                    <td>
                      <strong>{v.nombre}</strong>
                    </td>
                    <td>{v.ventas}</td>
                    <td>{dinero(v.ingresos)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  )
}

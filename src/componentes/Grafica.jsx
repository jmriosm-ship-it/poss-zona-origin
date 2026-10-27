import { dinero } from '../utils.js'

// Barras de ingresos contra costos por día
export default function Grafica({ dias }) {
  if (!dias.length) return <div className="vacio">Cuando registres ventas, aquí verás la gráfica de ingresos contra costos.</div>

  const max = Math.max(...dias.flatMap((d) => [d.ingresos, d.costos]), 1)
  const alto = (v) => Math.max(2, Math.round((v / max) * 100)) + '%'
  const etiqueta = (f) => f.slice(8, 10) + '/' + f.slice(5, 7)

  return (
    <div>
      <div className="grafica">
        {dias.map((d) => (
          <div className="grafica-dia" key={d.fecha} title={`${etiqueta(d.fecha)} · Ingresos ${dinero(d.ingresos)} · Costos ${dinero(d.costos)}`}>
            <div className="barras">
              <span className="barra-ingreso" style={{ height: alto(d.ingresos) }} />
              <span className="barra-costo" style={{ height: alto(d.costos) }} />
            </div>
            <small>{etiqueta(d.fecha)}</small>
          </div>
        ))}
      </div>
      <div className="leyenda">
        <span>
          <i className="punto ingreso" /> Ingresos
        </span>
        <span>
          <i className="punto costo" /> Costos
        </span>
        <span className="gris">Máximo: {dinero(max)}</span>
      </div>
    </div>
  )
}

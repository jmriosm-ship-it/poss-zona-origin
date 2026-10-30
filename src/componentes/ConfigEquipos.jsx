import { useEffect, useRef, useState } from 'react'
import { guardarEquipo, useEquipo } from '../equipo.js'
import { hayImpresora, imprimir } from '../impresion.js'
import { useConfig } from '../almacen.js'
import { pitar } from '../lector.js'

// Impresora de recibos y pistola de códigos de ESTE computador
export default function ConfigEquipos() {
  const equipo = useEquipo()
  const config = useConfig()
  const [impresoras, setImpresoras] = useState([])
  const [prueba, setPrueba] = useState(false)

  useEffect(() => {
    if (hayImpresora()) window.zoImpresora.listar().then(setImpresoras)
  }, [])

  return (
    <>
      <div className="panel">
        <div className="panel-cabeza">
          <div>
            <h2>Impresora de recibos</h2>
            <p className="sub">Se configura en cada computador. Conecta la impresora, instálale el driver de Windows y elígela aquí.</p>
          </div>
        </div>
        {!hayImpresora() ? (
          <p className="gris">Imprimir directo funciona en la aplicación de escritorio. En el navegador siempre se abre la ventana de impresión.</p>
        ) : (
          <div className="campos">
            <label className="ancho">
              <span>Impresora</span>
              <select value={equipo.impresora || ''} onChange={(e) => guardarEquipo({ impresora: e.target.value })}>
                <option value="">— Elegir —</option>
                {impresoras.map((p) => (
                  <option key={p.nombre} value={p.nombre}>
                    {p.nombre}
                    {p.predeterminada ? ' (predeterminada)' : ''}
                  </option>
                ))}
              </select>
            </label>
            <label className="casilla-acepto ancho">
              <input type="checkbox" checked={Boolean(equipo.impresionDirecta)} onChange={(e) => guardarEquipo({ impresionDirecta: e.target.checked })} />
              <span>Imprimir directo, sin abrir la ventana de impresión (recomendado para el recibo de la caja)</span>
            </label>
          </div>
        )}
        <div className="cabecera-acciones" style={{ marginTop: 12 }}>
          <button className="btn oscuro" onClick={() => setPrueba(true)}>
            Imprimir prueba
          </button>
        </div>
      </div>

      <PruebaPistola />

      {prueba && (
        <div className="fondo-modal">
          <div className="modal modal-chico">
            <div className="ticket">
              <h3>{config.negocio.toUpperCase()}</h3>
              <p className="centro">PRUEBA DE IMPRESIÓN</p>
              <hr />
              <div className="t-fila">
                <span>Producto de ejemplo</span>
                <span>$10.000</span>
              </div>
              <div className="t-fila t-total">
                <span>TOTAL</span>
                <span>$10.000</span>
              </div>
              <hr />
              <p className="centro">Si lees esto completo y centrado, la impresora quedó bien.</p>
            </div>
            <div className="modal-pie sin-imprimir">
              <button className="btn" onClick={() => setPrueba(false)}>
                Cerrar
              </button>
              <button className="btn oscuro" onClick={() => imprimir()}>
                Imprimir
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// Prueba de la pistola: pasa un código por el lector y se ve si el computador lo reconoce como pistola
function PruebaPistola() {
  const campo = useRef(null)
  const tiempos = useRef([])
  const [resultado, setResultado] = useState(null)

  function tecla(e) {
    const t = performance.now()
    if (e.key === 'Enter') {
      e.preventDefault()
      const codigo = e.target.value
      const ts = tiempos.current
      const promedio = ts.length > 1 ? (ts[ts.length - 1] - ts[0]) / (ts.length - 1) : null
      const pistola = codigo.length >= 4 && promedio !== null && promedio < 50
      setResultado({ codigo, largo: codigo.length, promedio, pistola })
      pitar(pistola)
      tiempos.current = []
      e.target.value = ''
    } else if (e.key.length === 1) tiempos.current.push(t)
  }

  return (
    <div className="panel" style={{ marginTop: 16 }}>
      <div className="panel-cabeza">
        <div>
          <h2>Probar la pistola de códigos</h2>
          <p className="sub">Conéctala por USB, haz clic en el campo y pasa cualquier producto por el lector.</p>
        </div>
      </div>
      <input ref={campo} placeholder="Haz clic aquí y escanea un código…" onKeyDown={tecla} style={{ width: '100%', maxWidth: 420 }} />
      {resultado && (
        <div style={{ marginTop: 12 }}>
          <p>
            Código leído: <strong>{resultado.codigo || '(vacío)'}</strong> · {resultado.largo} caracteres
            {resultado.promedio !== null && <> · {resultado.promedio.toFixed(1)} ms por tecla</>}
          </p>
          {resultado.pistola ? (
            <p className="badge ok">Pistola detectada: en la Caja el producto aparecerá solo.</p>
          ) : (
            <p className="aviso-legal">
              Esto parece escrito a mano o la pistola es lenta. Si pasaste un código con la pistola y sale este mensaje, revisa que esté en modo "teclado USB (HID)" y que termine cada código con Enter.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

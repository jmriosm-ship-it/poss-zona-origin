import { useState } from 'react'
import Icono from './Iconos.jsx'
import { useConfig } from '../almacen.js'
import { PRIMEROS_PASOS, REGLAS, SECCIONES } from '../ayuda.js'
import { VERSION_LEGAL, crearAutorizacion, crearDocumentos, datosPendientes } from '../legal.js'
import { abrirVisor, cerrarVisor, useVisor } from '../visor.js'

const PESTANAS = [
  ['ayuda', null, 'Guía de uso'],
  ['legal', 'privacidad', 'Privacidad'],
  ['legal', 'terminos', 'Términos'],
  ['legal', 'garantia', 'Garantía'],
  ['legal', 'credito', 'Crédito'],
  ['legal', 'clientes', 'Autorización'],
]

// Pantalla que se abre encima de todo: la guía de uso y los documentos legales
export default function Visor() {
  const visor = useVisor()
  const config = useConfig()
  const [copiado, setCopiado] = useState(false)
  if (!visor) return null

  const docs = crearDocumentos(config)
  const autorizacion = crearAutorizacion(config)
  const faltan = visor.tipo === 'legal' ? datosPendientes(config) : []

  async function copiar() {
    try {
      await navigator.clipboard.writeText(autorizacion.texto)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      alert('No se pudo copiar. Usa el botón de WhatsApp.')
    }
  }

  return (
    <div className="visor">
      <div className="visor-barra sin-imprimir">
        <div className="segmentos">
          {PESTANAS.map(([tipo, doc, texto]) => (
            <button key={texto} className={visor.tipo === tipo && (visor.doc || null) === doc ? 'activo' : ''} onClick={() => abrirVisor(tipo, doc)}>
              {texto}
            </button>
          ))}
        </div>
        <div className="cabecera-acciones">
          <button className="btn chico" onClick={() => window.print()}>
            Imprimir
          </button>
          <button className="btn oscuro chico" onClick={cerrarVisor}>
            Cerrar
          </button>
        </div>
      </div>

      <div className="visor-cuerpo">
        <div className="visor-contenido imprimible">
          {visor.tipo === 'ayuda' && (
            <>
              <h1 className="titulo" style={{ fontSize: 28 }}>Guía de uso</h1>
              <p className="subtitulo">Qué hace cada parte del sistema. Toca una sección para ver los detalles.</p>

              <div className="panel" style={{ marginTop: 18 }}>
                <h2>Primeros pasos</h2>
                <ol className="lista-guia">
                  {PRIMEROS_PASOS.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ol>
              </div>

              <div className="ayuda-lista">
                {SECCIONES.map((s) => (
                  <details key={s.id} className="ayuda-item">
                    <summary>
                      <span className="ayuda-icono">
                        <Icono nombre={s.icono} tam={20} />
                      </span>
                      <span className="ayuda-titulo">
                        <strong>{s.titulo}</strong>
                        <small>{s.sirve}</small>
                      </span>
                      <span className="ayuda-flecha">⌄</span>
                    </summary>
                    <ul>
                      {s.puntos.map((p, i) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  </details>
                ))}
              </div>

              <div className="panel">
                <h2>Reglas importantes</h2>
                <ol className="lista-guia">
                  {REGLAS.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ol>
              </div>
            </>
          )}

          {visor.tipo === 'legal' && faltan.length > 0 && (
            <div className="aviso-legal sin-imprimir">
              Faltan datos del titular para que este documento esté completo: {faltan.join(', ')}. Complétalos en Configuración → Negocio. Los textos
              son un modelo y deben ser revisados por un abogado.
            </div>
          )}

          {visor.tipo === 'legal' && visor.doc === 'clientes' && (
            <>
              <h1 className="titulo" style={{ fontSize: 28 }}>{autorizacion.titulo}</h1>
              <p className="subtitulo">{autorizacion.resumen}</p>
              <div className="nota sin-imprimir">{autorizacion.intro}</div>
              <div className="panel">
                <pre className="vista-mensaje">{autorizacion.texto}</pre>
                <p className="firma-linea">
                  Nombre: ______________________ &nbsp; Cédula: ______________ &nbsp; Firma: ______________ &nbsp; Fecha: ___/___/______
                </p>
                <div className="cabecera-acciones sin-imprimir">
                  <button className="btn" onClick={copiar}>
                    {copiado ? '¡Copiado!' : 'Copiar texto'}
                  </button>
                  <a className="btn oscuro" href={`https://wa.me/?text=${encodeURIComponent(autorizacion.texto)}`} target="_blank" rel="noreferrer">
                    Enviar por WhatsApp
                  </a>
                </div>
              </div>
            </>
          )}

          {visor.tipo === 'legal' && visor.doc !== 'clientes' && docs[visor.doc] && (
            <>
              <h1 className="titulo" style={{ fontSize: 28 }}>{docs[visor.doc].titulo}</h1>
              <p className="subtitulo">{docs[visor.doc].resumen}</p>
              <p className="gris" style={{ marginTop: 4 }}>Versión {VERSION_LEGAL}</p>
              {docs[visor.doc].secciones.map((s) => (
                <div key={s.titulo} className="panel legal-seccion">
                  <h2>{s.titulo}</h2>
                  {s.parrafos?.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                  {s.lista && (
                    <ul>
                      {s.lista.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  )}
                  {s.despues?.map((p, i) => (
                    <p key={'d' + i}>{p}</p>
                  ))}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

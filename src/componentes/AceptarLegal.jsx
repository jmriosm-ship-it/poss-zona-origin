import { useState } from 'react'
import { guardarConfig } from '../almacen.js'
import { cerrarSesion } from '../auth.js'
import { VERSION_LEGAL } from '../legal.js'
import { abrirVisor } from '../visor.js'

// Antes de usar el sistema hay que aceptar los términos y la política de datos (la primera vez y cuando cambien).
// Solo el administrador puede aceptar en nombre del negocio.
export default function AceptarLegal({ usuario }) {
  const [acepto, setAcepto] = useState(false)
  const admin = usuario.rol === 'admin'

  function aceptar() {
    guardarConfig({ legalAceptado: { version: VERSION_LEGAL, fecha: new Date().toISOString(), por: usuario.nombre, usuarioId: usuario.id } })
  }

  return (
    <div className="acceso">
      <div className="acceso-caja" style={{ width: 'min(460px, 100%)' }}>
        <img src="./logo.png" alt="Zona Originals" />
        <h2 style={{ marginTop: 18 }}>Términos y privacidad</h2>
        {admin ? (
          <form
            style={{ textAlign: 'left' }}
            onSubmit={(e) => {
              e.preventDefault()
              if (acepto) aceptar()
            }}
          >
            <p className="gris">
              Para usar el sistema, el negocio debe aceptar cómo se usan y se protegen los datos de sus clientes y las reglas de uso. Léelos antes de aceptar.
            </p>
            <div className="acepto-enlaces">
              <button type="button" className="enlace" onClick={() => abrirVisor('legal', 'terminos')}>
                Términos y condiciones
              </button>
              <button type="button" className="enlace" onClick={() => abrirVisor('legal', 'privacidad')}>
                Política de datos personales
              </button>
              <button type="button" className="enlace" onClick={() => abrirVisor('legal', 'garantia')}>
                Garantía
              </button>
            </div>
            <label className="casilla-acepto">
              <input type="checkbox" checked={acepto} onChange={(e) => setAcepto(e.target.checked)} />
              <span>He leído y acepto los términos y la política de tratamiento de datos personales, en nombre del negocio.</span>
            </label>
            <button className="btn oscuro" type="submit" disabled={!acepto} style={{ width: '100%', justifyContent: 'center' }}>
              Aceptar y continuar
            </button>
          </form>
        ) : (
          <div>
            <p className="gris">El administrador debe aceptar primero los términos y la política de datos. Avísale para que entre y los acepte.</p>
          </div>
        )}
        <button className="btn" style={{ width: '100%', justifyContent: 'center', marginTop: 10 }} onClick={cerrarSesion}>
          Salir
        </button>
      </div>
    </div>
  )
}

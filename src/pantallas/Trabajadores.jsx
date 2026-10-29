import { useState } from 'react'
import Calendario from '../componentes/Calendario.jsx'
import CupoTrabajadores from '../componentes/CupoTrabajadores.jsx'
import { useUsuarios, useVentas, useTurnos } from '../almacen.js'
import { nombreRol } from '../auth.js'
import { aFechaISO, cajaDe, dinero, fechaHora, netoVenta } from '../utils.js'

// Ventas de cada usuario (de todas las cajas): hoy, el mes y un calendario por trabajador
export default function Trabajadores() {
  const usuarios = useUsuarios()
  const ventas = useVentas().filter((v) => v.estado !== 'anulada')
  const turnos = useTurnos()
  const [elegido, setElegido] = useState('')

  const hoy = aFechaISO(new Date())
  const mesActual = hoy.slice(0, 7)
  const filas = usuarios.map((u) => {
    const propias = ventas.filter((v) => v.vendedorId === u.id)
    const deHoy = propias.filter((v) => aFechaISO(new Date(v.fecha)) === hoy)
    const delMes = propias.filter((v) => aFechaISO(new Date(v.fecha)).startsWith(mesActual))
    const suma = (l) => l.reduce((s, v) => s + netoVenta(v), 0)
    return { u, hoyN: deHoy.length, hoyTotal: suma(deHoy), mesN: delMes.length, mesTotal: suma(delMes), totalN: propias.length }
  })
  const sinDueno = ventas.filter((v) => !v.vendedorId || !usuarios.some((u) => u.id === v.vendedorId)).length
  const usuario = usuarios.find((u) => u.id === elegido)
  const turnosUsuario = turnos.filter((t) => t.abrioId === elegido || t.cerroId === elegido).slice(0, 10)

  return (
    <>
      <div className="cabecera">
        <div>
          <h1 className="titulo">Trabajadores</h1>
          <p className="subtitulo">Cuántas ventas hizo cada usuario, en las dos cajas.</p>
        </div>
      </div>

      <div className="panel">
        <table className="tabla">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Ventas hoy</th>
              <th>Vendido hoy</th>
              <th>Ventas del mes</th>
              <th>Vendido en el mes</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.u.id} className={elegido === f.u.id ? 'fila-elegida' : ''}>
                <td>
                  <strong>{f.u.nombre}</strong>
                  <small className="gris">{nombreRol(f.u.rol)}</small>
                </td>
                <td>{f.hoyN}</td>
                <td>{dinero(f.hoyTotal)}</td>
                <td>{f.mesN}</td>
                <td>{dinero(f.mesTotal)}</td>
                <td className="acciones">
                  <button className="enlace" onClick={() => setElegido(elegido === f.u.id ? '' : f.u.id)}>
                    {elegido === f.u.id ? 'Ocultar calendario' : 'Ver calendario'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sinDueno > 0 && <p className="gris" style={{ marginTop: 10 }}>{sinDueno} {sinDueno === 1 ? 'venta' : 'ventas'} sin vendedor registrado (hechas antes de crear los usuarios).</p>}
      </div>

      <CupoTrabajadores />

      {usuario && (
        <>
          <h2 style={{ margin: '24px 0 12px' }}>Calendario de {usuario.nombre}</h2>
          <Calendario vendedorId={usuario.id} />
          <div className="panel" style={{ marginTop: 16 }}>
            <div className="panel-cabeza">
              <div>
                <h2>Cajas que abrió o cerró</h2>
                <p className="sub">Con cuánto empezó y con cuánto terminó.</p>
              </div>
            </div>
            {turnosUsuario.length === 0 ? (
              <div className="vacio chico">Todavía no ha abierto ni cerrado cajas.</div>
            ) : (
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Caja</th>
                    <th>Abierta</th>
                    <th>Empezó con</th>
                    <th>Cerrada</th>
                    <th>Terminó con</th>
                  </tr>
                </thead>
                <tbody>
                  {turnosUsuario.map((t) => (
                    <tr key={t.id}>
                      <td>{cajaDe(t)}</td>
                      <td>{fechaHora(t.fechaApertura)}</td>
                      <td>{dinero(t.inicial)}</td>
                      <td>{t.fechaCierre ? fechaHora(t.fechaCierre) : 'Abierta'}</td>
                      <td>{t.fechaCierre ? dinero(t.contado) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </>
  )
}

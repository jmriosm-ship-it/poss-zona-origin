// Cupo de los trabajadores: lo que pueden sacar de la tienda y se les descuenta del sueldo
const suma = (lista) => lista.reduce((s, r) => s + (Number(r.valor) || 0), 0)

export function estadoCupo(usuario, registros) {
  const mios = registros.filter((r) => r.usuarioId === usuario.id && !r.anulado)
  const consumido = suma(mios.filter((r) => r.tipo === 'consumo'))
  const descontado = mios.filter((r) => r.tipo === 'pago').reduce((s, r) => s + (Number(r.descuento) || 0), 0)
  const cupo = Number(usuario.cupo) || 0
  const pendiente = Math.max(0, consumido - descontado)
  return { cupo, pendiente, disponible: cupo - pendiente }
}

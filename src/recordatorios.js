import { fechaLarga, resumenCredito, dinero, aFechaISO } from './utils.js'

// Avisos de vencimiento de cuotas por WhatsApp: el sistema te dice a quién avisar hoy y deja el mensaje listo
export const PLANTILLA_AVISO =
  '¡Hola {nombre}! 😊 Te escribimos de {negocio} para recordarte que {cuando} vence tu cuota {n} de {cuotas}, por {valor}. Cualquier duda nos escribes. ¡Que tengas un lindo día!'
export const PLANTILLA_MORA =
  '¡Hola {nombre}! Te recordamos de {negocio} que tu cuota {n} por {valor} venció el {fecha}. Si ya pagaste, ignora este mensaje. Si no, cuéntanos cuándo podrías hacerlo. 🙏'

export const llenarPlantilla = (texto, vars) => texto.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m))

// 3142757163 -> 573142757163
export function numeroWhatsapp(tel) {
  const t = String(tel || '').replace(/\D/g, '')
  if (!t) return ''
  return t.length === 10 ? '57' + t : t
}

// Texto del mensaje de una cuota con las plantillas de Configuración
function armarTexto(c, r, q, tipo, dias, nombre, config) {
  const cuando = dias === 0 ? 'hoy' : dias === 1 ? 'mañana' : 'el ' + fechaLarga(q.vence)
  const vars = { nombre, negocio: config.negocio, n: q.n, cuotas: c.plazo, valor: dinero(q.pendiente), fecha: fechaLarga(q.vence), cuando, saldo: dinero(r.saldo) }
  return llenarPlantilla(tipo === 'aviso' ? config.waPlantilla || PLANTILLA_AVISO : config.waPlantillaMora || PLANTILLA_MORA, vars)
}

const dif = (iso, hoy) => Math.round((new Date(iso + 'T12:00:00') - new Date(aFechaISO(hoy) + 'T12:00:00')) / 864e5)
const ENVIO_MORA_DIAS = 3 // un crédito en mora se vuelve a avisar cada 3 días

// Cuotas a las que hoy toca avisar: vencen hoy o dentro de "diasAntes" días, y la cuota más vieja vencida de cada crédito en mora
export function cuotasPorAvisar(creditos, clientes, config, hoy = new Date()) {
  const diasAntes = Math.max(0, Number(config.waDiasAntes ?? 1))
  const filas = []
  for (const c of creditos) {
    if (c.estado !== 'activo') continue
    const r = resumenCredito(c, hoy)
    if (r.saldo <= 0) continue
    const cliente = clientes.find((x) => x.id === c.clienteId)
    const numero = numeroWhatsapp(cliente?.whatsapp || cliente?.telefono || c.clienteTelefono)
    const nombre = (cliente?.nombre || c.clienteNombre || '').split(' ')[0]
    const registrar = (q, tipo, dias) => {
      const clave = tipo + ':' + q.n
      const ultimo = c.recordatorios?.[clave]
      if (ultimo && (tipo === 'aviso' || Math.abs(dif(aFechaISO(new Date(ultimo)), hoy)) < ENVIO_MORA_DIAS)) return
      const texto = armarTexto(c, r, q, tipo, dias, nombre, config)
      filas.push({
        credito: c,
        clave,
        tipo,
        dias,
        cuota: q,
        cliente: c.clienteNombre,
        numero,
        enlace: numero ? 'https://wa.me/' + numero + '?text=' + encodeURIComponent(texto) : '',
      })
    }
    for (const q of r.detalle) {
      if (q.pendiente <= 0) continue
      const dias = dif(q.vence, hoy)
      if (dias >= 0 && dias <= diasAntes) registrar(q, 'aviso', dias)
    }
    const vencida = r.vencidas[0]
    if (vencida) registrar(vencida, 'mora', dif(vencida.vence, hoy))
  }
  return filas.sort((a, b) => a.dias - b.dias)
}

// Enlace de WhatsApp de un crédito (botón del detalle del crédito): avisa la cuota vencida o, si no hay, la próxima
export function enlaceRecordatorio(c, cliente, config, hoy = new Date()) {
  const numero = numeroWhatsapp(cliente?.whatsapp || cliente?.telefono || c.clienteTelefono)
  const r = resumenCredito(c, hoy)
  const q = r.vencidas[0] || r.proxima
  if (!numero || !q) return null
  const nombre = (cliente?.nombre || c.clienteNombre || '').split(' ')[0]
  const texto = armarTexto(c, r, q, r.vencidas[0] ? 'mora' : 'aviso', dif(q.vence, hoy), nombre, config)
  return 'https://wa.me/' + numero + '?text=' + encodeURIComponent(texto)
}

// Combinar dos versiones del mismo registro cuando los dos computadores lo cambiaron a la vez.
// Se compara con la versión que ambos tenían la última vez que sincronizaron (la "base"):
//  - un campo que solo cambió un computador se queda con ese cambio;
//  - el stock suma lo que hizo cada uno (si cada uno vendió 1, baja 2);
//  - los IMEI que uno agregó o quitó se respetan, aunque el otro haya hecho otros cambios;
//  - listas con id (pagos, devoluciones) se juntan sin duplicar;
//  - si los dos cambiaron el mismo campo de forma distinta, gana el cambio más reciente.

const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const escalar = (b, l, r, localGana) => (igual(l, r) ? l : igual(l, b) ? r : igual(r, b) ? l : localGana ? l : r)
const esListaConId = (v) => Array.isArray(v) && v.length > 0 && v.every((x) => x && typeof x === 'object' && 'id' in x)

function unirPorId(l, r) {
  const ids = new Set(l.map((x) => x.id))
  return [...l, ...r.filter((x) => !ids.has(x.id))]
}

// IMEI: se conserva lo que ambos tienen, más lo que cada uno agregó; lo que alguno quitó se quita
function unirImeis(b = [], l = [], r = []) {
  const B = new Set(b)
  const L = new Set(l)
  const R = new Set(r)
  const salida = new Set()
  for (const x of L) if (R.has(x) || !B.has(x)) salida.add(x)
  for (const x of R) if (L.has(x) || !B.has(x)) salida.add(x)
  return [...salida]
}

function fusionarVariante(b, l, r, localGana) {
  const out = {}
  for (const k of new Set([...Object.keys(l), ...Object.keys(r)])) {
    if (k === 'stock' || k === 'imeis') continue
    out[k] = escalar(b?.[k], l[k], r[k], localGana)
  }
  const conImei = (l.imeis && l.imeis.length) || (r.imeis && r.imeis.length) || (b?.imeis && b.imeis.length)
  if (conImei) {
    out.imeis = unirImeis(b?.imeis, l.imeis, r.imeis)
    out.stock = out.imeis.length
  } else {
    out.imeis = []
    out.stock = b ? Math.max(0, (l.stock || 0) + (r.stock || 0) - (b.stock || 0)) : (localGana ? l.stock : r.stock) || 0
  }
  return out
}

function fusionarVariantes(b = [], l = [], r = [], localGana) {
  const pb = new Map(b.map((v) => [v.id, v]))
  const pl = new Map(l.map((v) => [v.id, v]))
  const pr = new Map(r.map((v) => [v.id, v]))
  const orden = [...l.map((v) => v.id), ...r.map((v) => v.id).filter((id) => !pl.has(id))]
  const salida = []
  for (const id of orden) {
    const vb = pb.get(id)
    const vl = pl.get(id)
    const vr = pr.get(id)
    if (vl && vr) salida.push(fusionarVariante(vb, vl, vr, localGana))
    else if (vl) {
      // el otro computador la borró: se respeta, salvo que aquí se haya cambiado después
      if (!(vb && igual(vl, vb))) salida.push(vl)
    } else if (vr) {
      if (!(vb && igual(vr, vb))) salida.push(vr)
    }
  }
  return salida
}

export function fusionarTres(base, local, remoto, localGana) {
  const out = {}
  for (const k of new Set([...Object.keys(local), ...Object.keys(remoto)])) {
    if (k === 'variantes') out[k] = fusionarVariantes(base?.variantes, local.variantes, remoto.variantes, localGana)
    else if (esListaConId(local[k]) || esListaConId(remoto[k])) out[k] = unirPorId(local[k] || [], remoto[k] || [])
    else out[k] = escalar(base?.[k], local[k], remoto[k], localGana)
  }
  return out
}

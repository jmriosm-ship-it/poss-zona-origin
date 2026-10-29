// Textos legales del sistema: política de tratamiento de datos, términos de uso, garantía y autorización de clientes.
// Pensados para Colombia: Ley 1581 de 2012 y Decreto 1377 de 2013 (datos personales), Ley 1480 de 2011 (Estatuto del Consumidor).
// Son TEXTOS MODELO: un abogado debe revisarlos antes de usarlos de forma definitiva.
//
// Los datos del titular del negocio se completan en Configuración → Negocio y se insertan solos en cada texto.
// Si cambias el contenido de forma importante, sube VERSION_LEGAL: el sistema volverá a pedir la aceptación.

export const VERSION_LEGAL = '2026-10-27'
const VIGENCIA = '27 de octubre de 2026'

// Datos que deben estar completos para que los textos sean válidos
export function datosPendientes(c) {
  const faltan = []
  if (!c.titular?.trim()) faltan.push('nombre o razón social del titular')
  if (!c.identificacion?.trim()) faltan.push('NIT o cédula')
  if (!c.correoContacto?.trim()) faltan.push('correo de contacto')
  if (!c.direccion?.trim()) faltan.push('dirección')
  return faltan
}

function datos(c) {
  const pend = (v, texto) => (v && v.trim() ? v.trim() : `[${texto}]`)
  return {
    negocio: c.negocio || 'Zona Originals',
    titular: pend(c.titular, 'nombre del titular'),
    id: pend(c.identificacion, 'NIT o cédula'),
    correo: pend(c.correoContacto, 'correo de contacto'),
    whatsapp: pend(c.whatsapp, 'WhatsApp'),
    direccion: pend(c.direccion, 'dirección'),
    ciudad: c.ciudad || 'Ocaña, Norte de Santander, Colombia',
    garantia: (c.garantiaTexto || '').trim(),
  }
}

export function crearDocumentos(config) {
  const d = datos(config)

  return {
    privacidad: {
      titulo: 'Política de tratamiento de datos personales',
      resumen: 'Cómo se cuidan y se usan los datos que se guardan en el sistema.',
      secciones: [
        {
          titulo: '1. Responsable del tratamiento',
          parrafos: [
            `Esta política explica cómo el sistema de punto de venta de ${d.negocio} (el "Sistema") trata los datos personales, conforme al artículo 15 de la Constitución, la Ley 1581 de 2012, el Decreto 1377 de 2013 y las normas que los complementan.`,
          ],
          lista: [
            `Responsable: ${d.titular}, identificación ${d.id}, titular del establecimiento ${d.negocio} (el "Negocio").`,
            `Dirección: ${d.direccion}, ${d.ciudad}.`,
            `Correo: ${d.correo}`,
            `WhatsApp: ${d.whatsapp}`,
          ],
          despues: [
            'El Sistema fue desarrollado por un proveedor tecnológico que actúa como encargado del tratamiento: guarda y procesa los datos por cuenta del Negocio y solo para prestar el servicio.',
          ],
        },
        {
          titulo: '2. Qué datos se tratan',
          lista: [
            'De los usuarios del Sistema (administradores y trabajadores): nombre y rol. El PIN no se guarda en texto: se guarda como una huella cifrada.',
            'De los clientes que el Negocio decida registrar: nombre, teléfono, correo, notas, historial de compras, puntos de fidelidad, ventas a crédito (fiado), abonos y la constancia de su autorización.',
            'De las ventas: productos, valores, medios de pago, vendedor, IMEI o serial de los equipos vendidos y garantía.',
            'De los proveedores: nombre, compras y pagos.',
            'Del Negocio: inventario, costos, gastos, cierres de caja y configuración.',
          ],
          parrafos: ['El Sistema no pide ni guarda datos sensibles (salud, biometría, origen étnico, etc.) ni datos de menores de edad.'],
        },
        {
          titulo: '3. Para qué se usan (finalidades)',
          lista: [
            'Registrar y consultar las compras de los clientes y expedir comprobantes de venta.',
            'Atender garantías, cambios y devoluciones, identificando el equipo por su IMEI o serial.',
            'Llevar el control de ventas a crédito, pagos y saldos pendientes, y contactar al cliente por WhatsApp o llamada para recordarle pagos o informarle novedades de su compra.',
            'Administrar los puntos de fidelidad y las promociones.',
            'Llevar el inventario, las compras, las deudas, los gastos y las ganancias del Negocio.',
            'Sincronizar los datos entre los computadores del Negocio, hacer copias de seguridad y mantener segura la cuenta.',
            'Cumplir obligaciones legales, contables y tributarias, y atender requerimientos de autoridades.',
          ],
          parrafos: ['No se venden los datos ni se usan para publicidad de terceros. Si el Negocio quisiera enviarte promociones, te pedirá una autorización aparte.'],
        },
        {
          titulo: '4. Autorización',
          parrafos: [
            'Antes de guardar tus datos, el Negocio debe informarte para qué los usará y pedir tu autorización previa, expresa e informada. Dar tus datos es voluntario: puedes comprar sin registrarte.',
            'El Sistema guarda la constancia de que se otorgó la autorización (fecha y versión del texto). En la sección "Clientes" hay un modelo de autorización para mostrarte, imprimirte o enviarte por WhatsApp.',
          ],
        },
        {
          titulo: '5. Dónde se guardan y transferencia internacional',
          parrafos: [
            'Los datos se guardan en el computador del Negocio. Si se activa la nube, también se copian en los servidores de Supabase, un proveedor de infraestructura que puede tener sus servidores fuera de Colombia.',
            'Al aceptar esta política se autoriza de forma expresa la transmisión y transferencia de los datos a esos servidores, únicamente para prestar el servicio. Cada cuenta solo puede ver sus propios datos.',
          ],
        },
        {
          titulo: '6. Con quién se comparten',
          parrafos: [
            'No se comparten con otras personas ni empresas, salvo con los proveedores tecnológicos necesarios para operar el Sistema (por ejemplo, el que aloja la base de datos), con las autoridades cuando la ley lo exija, o, si el Negocio activa la facturación electrónica, con su proveedor tecnológico autorizado y con la DIAN, solo con los datos que la factura requiera.',
            'Cuando se usa "WhatsApp" o "Recordatorio", el Sistema abre WhatsApp con un mensaje ya escrito. El mensaje solo se envía si la persona lo envía.',
          ],
        },
        {
          titulo: '7. Seguridad',
          parrafos: [
            'Las conexiones con la nube van cifradas (HTTPS), el acceso al Sistema exige PIN y cuenta, y cada rol ve solo lo que necesita (el trabajador no ve costos ni ganancias). Ningún sistema es 100% seguro: hay que cuidar las contraseñas y los PIN, y descargar copias de seguridad con frecuencia.',
          ],
        },
        {
          titulo: '8. Cuánto tiempo se conservan',
          parrafos: [
            'Mientras sea necesario para las finalidades anteriores y para cumplir las obligaciones contables, tributarias y legales del Negocio. Cuando se elimina un cliente, su nombre se borra de la ficha y de sus ventas anteriores (queda como "Cliente eliminado"); los valores de las ventas se conservan porque la ley exige conservar la contabilidad.',
          ],
        },
        {
          titulo: '9. Derechos de los titulares',
          parrafos: ['Como titular de datos personales tienes derecho a:'],
          lista: [
            'Conocer, actualizar y rectificar tus datos.',
            'Solicitar prueba de la autorización que diste.',
            'Ser informado del uso que se ha dado a tus datos.',
            'Presentar quejas ante la Superintendencia de Industria y Comercio (SIC) por infracciones a la ley, una vez agotado el trámite ante el Negocio.',
            'Revocar la autorización y pedir la supresión de tus datos cuando no se respeten los principios, derechos y garantías, y siempre que no exista un deber legal o contractual de conservarlos.',
            'Acceder de forma gratuita a tus datos personales.',
          ],
        },
        {
          titulo: '10. Cómo ejercer tus derechos (consultas y reclamos)',
          parrafos: [
            `Escribe a ${d.correo} o por WhatsApp al ${d.whatsapp}, o acércate a ${d.direccion}, indicando tu nombre, tu identificación y lo que solicitas. El área responsable de atenderte es el titular del Negocio.`,
            'Las consultas se responden en máximo 10 días hábiles y los reclamos en máximo 15 días hábiles. Si no es posible responder en ese plazo, se te informará el motivo y la nueva fecha, que no podrá superar 5 días hábiles (consultas) u 8 días hábiles (reclamos) adicionales.',
          ],
        },
        {
          titulo: '11. Registro Nacional de Bases de Datos',
          parrafos: ['El Negocio registrará sus bases de datos en el Registro Nacional de Bases de Datos (RNBD) de la SIC cuando la ley lo exija.'],
        },
        {
          titulo: '12. Cambios y vigencia',
          parrafos: [
            'Si esta política cambia de forma importante, el Sistema mostrará la nueva versión y pedirá aceptarla otra vez.',
            `Esta política rige desde el ${VIGENCIA} (versión ${VERSION_LEGAL}).`,
          ],
        },
      ],
    },

    terminos: {
      titulo: 'Términos y condiciones de uso',
      resumen: 'Las reglas para usar el sistema y lo que se puede esperar de él.',
      secciones: [
        {
          titulo: '1. Aceptación',
          parrafos: [
            `Al usar el sistema de punto de venta de ${d.negocio} (el "Sistema") se aceptan estos términos y la política de tratamiento de datos personales. Quien no esté de acuerdo no debe usarlo. El Sistema es para el uso de ${d.titular} (identificación ${d.id}), titular del establecimiento ${d.negocio} (el "Negocio"), y de las personas que el Negocio autorice. Debe usarlo una persona mayor de edad.`,
          ],
        },
        {
          titulo: '2. Qué es el Sistema y qué no es',
          parrafos: [
            'El Sistema es una herramienta de apoyo para llevar el inventario, las ventas, las compras, las deudas, los clientes y los gastos de un negocio.',
            'Los cálculos que muestra (ganancias, costos, márgenes, cierres de caja y estadísticas) son informativos y dependen de los datos que se registren. No son contabilidad oficial ni asesoría contable, tributaria o legal.',
            'Los recibos que imprime el Sistema son comprobantes internos de venta. NO son facturas electrónicas ni documentos equivalentes de la DIAN, y el Sistema no cumple por el Negocio sus obligaciones tributarias. El Negocio debe llevar su contabilidad y facturar conforme a la ley.',
          ],
        },
        {
          titulo: '3. Responsabilidades del Negocio y sus usuarios',
          lista: [
            'Registrar información veraz y completa. Si no se anota una venta, una compra o un gasto, los resultados no serán correctos.',
            'Cuidar los PIN, las contraseñas y los computadores. Cada persona debe usar su propio usuario y no compartir su PIN.',
            'Descargar copias de seguridad con frecuencia y guardarlas en un lugar seguro.',
            'Contar con la autorización de los clientes antes de guardar sus datos personales y atender sus solicitudes (consultar, corregir o eliminar) en los plazos de la ley.',
            'Verificar que los equipos que se registran y venden tienen origen lícito y que su IMEI o serial es el correcto. El Negocio responde por la procedencia de lo que vende.',
            'Respetar el Estatuto del Consumidor (Ley 1480 de 2011) en garantías, cambios y devoluciones.',
            'Usar WhatsApp y los demás medios de contacto respetando la ley y la voluntad de las personas, sin enviar mensajes no deseados.',
            'No usar el Sistema para actividades ilegales.',
          ],
        },
        {
          titulo: '4. Usuarios y roles',
          parrafos: [
            'El administrador ve y puede cambiar todo. El trabajador solo accede a la Caja y al inventario sin costos. El administrador es responsable de crear, cambiar y retirar los usuarios y de la actividad hecha con ellos.',
          ],
        },
        {
          titulo: '5. Disponibilidad y copias de seguridad',
          parrafos: [
            'El Sistema se ofrece "tal como está". Puede tener errores o interrupciones, y depende de servicios de terceros (como el proveedor de la nube) que pueden fallar. Funciona sin internet y sincroniza cuando vuelve la conexión.',
            'Los datos pueden perderse si se borra el Sistema, si se daña o se pierde el computador, o por fallas de terceros. Por eso es responsabilidad del Negocio mantener copias de seguridad.',
          ],
        },
        {
          titulo: '6. Límite de responsabilidad',
          parrafos: [
            'En la máxima medida permitida por la ley, el proveedor del Sistema no responde por pérdidas indirectas, lucro cesante, decisiones de negocio tomadas con base en la información del Sistema, ni por pérdidas de datos causadas por el usuario, su equipo o terceros.',
            'Nada en estos términos limita los derechos que la ley reconoce y que no se pueden renunciar.',
          ],
        },
        {
          titulo: '7. Propiedad intelectual',
          parrafos: [
            `El código y el diseño del Sistema pertenecen a su desarrollador. La marca y el logo "${d.negocio}" pertenecen al Negocio. Los datos que se guardan en el Sistema son del Negocio: nadie más reclama derechos sobre ellos.`,
          ],
        },
        {
          titulo: '8. Terminación',
          parrafos: ['Se puede dejar de usar el Sistema cuando se quiera y pedir la eliminación de los datos de la nube escribiendo a los contactos de abajo. Se puede suspender una cuenta que se use de forma indebida.'],
        },
        {
          titulo: '9. Cambios',
          parrafos: ['Estos términos pueden actualizarse. Si el cambio es importante, el Sistema pedirá aceptarlos de nuevo.'],
        },
        {
          titulo: '10. Ley aplicable y contacto',
          parrafos: [
            `Estos términos se rigen por las leyes de la República de Colombia. Ante cualquier desacuerdo primero se buscará una solución amistosa; si no es posible, serán competentes los jueces de ${d.ciudad}.`,
            `Contacto: ${d.negocio} · ${d.titular} · ${d.correo} · WhatsApp ${d.whatsapp} · ${d.direccion}.`,
            `Vigentes desde el ${VIGENCIA} (versión ${VERSION_LEGAL}).`,
          ],
        },
      ],
    },

    credito: {
      titulo: 'Condiciones de los créditos en cuotas',
      resumen: 'Reglas para vender a crédito. Muéstralas al cliente antes de firmar.',
      secciones: [
        {
          titulo: '1. Qué es un crédito en cuotas',
          parrafos: [
            `${d.negocio} puede vender algunos productos a crédito: el cliente paga una cuota inicial y el resto se financia en cuotas mensuales con un interés. El valor de la cuota, el plazo, el interés y las fechas de pago se le muestran antes de aceptar y quedan escritos en el "Plan de pagos" que se imprime y se firma.`,
          ],
        },
        {
          titulo: '2. Información que debe recibir el cliente antes de aceptar',
          lista: [
            'El precio del producto, la cuota inicial y el valor financiado.',
            'El plazo, el valor de cada cuota, el interés mensual y el total que pagará.',
            'Las fechas de pago y a dónde o cómo pagar.',
            'Qué pasa si se atrasa: intereses de mora y consecuencias del incumplimiento.',
            'Que puede pagar de forma anticipada y que sus pagos se aplican a las cuotas más antiguas.',
          ],
        },
        {
          titulo: '3. Límites legales',
          lista: [
            'Los intereses no pueden superar la tasa de usura que certifica la Superintendencia Financiera de Colombia. Esa tasa cambia cada mes; el sistema permite fijar un tope y no deja hacer créditos por encima.',
            'Los intereses de mora tampoco pueden superar el máximo legal.',
            'El cobro debe ser respetuoso: sin amenazas, sin publicar la deuda y sin contactar a terceros para presionar. Los recordatorios por WhatsApp o llamada deben ir dirigidos solo al deudor y en horarios razonables.',
          ],
        },
        {
          titulo: '4. Datos personales y centrales de riesgo',
          parrafos: [
            'Para dar un crédito se piden datos como nombre, cédula, teléfono y correo, que se tratan según la política de datos personales y con la autorización del cliente.',
            'Consultar o reportar el comportamiento de pago a centrales de información financiera (Ley 1266 de 2008) requiere una autorización expresa y separada del cliente, que se marca en el contrato. Si el cliente no la da, no se puede consultar ni reportar.',
          ],
        },
        {
          titulo: '5. Documentos y garantías',
          parrafos: [
            'Se imprime el contrato con el plan de pagos y se firma por las dos partes. Se guarda una copia con la cédula del cliente.',
            'Si el negocio pide un pagaré u otra garantía, se firma por separado y debe prepararlo un abogado. Este sistema no genera pagarés.',
          ],
        },
        {
          titulo: '6. Aviso',
          parrafos: ['Estos textos son un modelo informativo y no reemplazan la asesoría de un abogado o contador. El crédito es una actividad con reglas propias: confirma con un profesional cómo debe manejarlo el negocio.'],
        },
      ],
    },

    garantia: {
      titulo: 'Garantía, cambios y devoluciones',
      resumen: 'Condiciones para los clientes. Puedes mostrarlas o imprimirlas en el local.',
      secciones: [
        {
          titulo: '1. Garantía',
          parrafos: [
            `Los productos que vende ${d.negocio} tienen la garantía que se indica en el recibo, contada desde la fecha de la compra. En los equipos con IMEI o serial, la garantía se identifica con ese número, que aparece en el recibo.`,
            'Esto no limita la garantía legal ni los demás derechos que la Ley 1480 de 2011 (Estatuto del Consumidor) reconoce al consumidor.',
          ],
        },
        {
          titulo: '2. Qué cubre y qué no cubre',
          parrafos: [d.garantia || 'Cubre el mal funcionamiento del producto. No cubre daños causados por mal uso.'],
          despues: ['Si hay desacuerdo sobre la causa de la falla, el Negocio la revisará con el cliente y, de ser necesario, con un concepto técnico.'],
        },
        {
          titulo: '3. Cómo hacer válida la garantía',
          lista: [
            'Presenta el recibo de venta y el producto, con sus accesorios y empaque cuando sea posible.',
            'Acércate a la dirección del Negocio o escríbele por WhatsApp para coordinar la revisión.',
            'En equipos con IMEI, el IMEI del equipo debe coincidir con el del recibo.',
          ],
        },
        {
          titulo: '4. Cambios y devoluciones',
          parrafos: [
            'Si el producto tiene un defecto de calidad o no corresponde a lo ofrecido, tienes derecho a que se repare, se cambie o se te devuelva el dinero, según lo que establece la ley.',
            'Si la compra se hizo a distancia (por internet, redes sociales o WhatsApp), puedes ejercer el derecho de retracto dentro de los 5 días hábiles siguientes a recibir el producto, conforme al artículo 47 de la Ley 1480 de 2011 y sus excepciones.',
          ],
        },
        {
          titulo: '5. Reclamos',
          parrafos: [
            `Escríbenos a ${d.correo} o al WhatsApp ${d.whatsapp}. Si no quedas conforme con la respuesta, puedes acudir a la Superintendencia de Industria y Comercio (SIC).`,
          ],
        },
      ],
    },
  }
}

// Modelo de autorización que el negocio le da a sus clientes (impreso, en un cartel o por WhatsApp)
export function crearAutorizacion(config) {
  const d = datos(config)
  return {
    titulo: 'Autorización de tratamiento de datos personales',
    resumen: 'Texto modelo para que el cliente autorice guardar sus datos.',
    intro:
      'La ley colombiana pide avisarle al cliente para qué usarás sus datos y tener su autorización antes de guardarlos. Puedes mostrarle este texto, imprimírselo o mandárselo por WhatsApp. El sistema guarda la constancia al marcar que el cliente autorizó, pero conserva también una prueba: su firma, su "acepto" por WhatsApp o un registro de que se le informó.',
    texto: `Autorizo a ${d.negocio} (${d.titular}, identificación ${d.id}) para recolectar, almacenar y usar mis datos personales (nombre, teléfono y correo) con estas finalidades: registrar mis compras, atender garantías y cambios, llevar el control de mis pagos y saldos pendientes, administrar mis puntos de fidelidad y contactarme por WhatsApp, llamada o correo para recordatorios de pago y novedades de mi compra.\n\nSé que no es obligatorio dar estos datos, que no serán vendidos a terceros, y que como titular puedo conocerlos, actualizarlos, corregirlos, pedir que se eliminen o revocar esta autorización en cualquier momento escribiendo a ${d.correo} o al WhatsApp ${d.whatsapp}, o en ${d.direccion}. También puedo consultar la política de tratamiento de datos en el local. Esta autorización se rige por la Ley 1581 de 2012 y el Decreto 1377 de 2013.`,
  }
}

// Constancia que se guarda en la ficha del cliente
export const constanciaAutorizacion = () => ({ fecha: new Date().toISOString(), version: VERSION_LEGAL })

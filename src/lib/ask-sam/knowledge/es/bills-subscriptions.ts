import type { IntentText } from '@/lib/ask-sam/types';

export const billsSubscriptionsEs: IntentText[] = [
  // ---------------------------------------------------------------------------------------------
  // What bills and subscriptions are, and where they live
  // ---------------------------------------------------------------------------------------------
  {
    id: 'bills.basics.difference',
    title: '¿Qué diferencia hay entre una factura y una suscripción?',
    questions: [
      '¿Qué diferencia hay entre una factura y una suscripción?',
      'factura vs suscripción',
      'netflix va como factura o como suscripción',
      '¿La renta es una factura o una suscripción en Skip?',
      'donde pongo la membresía del gimnasio, en facturas o en suscripciones',
      'qué cuenta como factura',
      'q es una suscripción en esta app',
      '¿Importa si agrego algo como factura en vez de suscripción?',
      'mi plan del teléfono es factura o suscripción',
      'por qué hay facturas y suscripciones por separado',
      'diferencia entre facturas y suscripciones',
      'cual uso para el seguro del auto',
    ],
    answer:
      'Las dos son pagos que se repiten, y Skip las cuenta igual: cada una sale en su fecha y baja tu **Saldo actual**. La diferencia está en cómo las describes.\n\n' +
      '- Una **factura** es algo como la renta, la luz, el agua, el internet, el teléfono, el seguro o la colegiatura. Eliges una **Categoría**, una **Fecha de pago** y cada cuánto **Se repite**.\n' +
      '- Una **suscripción** es un servicio que se renueva solo, como Netflix, Spotify o el gimnasio. Buscas el **Servicio** (su logo viene incluido), eliges un **Ciclo de cobro** y su **Próxima renovación**, y después puedes marcarla como **Cancelada**.\n\n' +
      'Elige la que te parezca más natural. Las facturas están en **Facturas mensuales** y las suscripciones en **Suscripciones**. Los préstamos tienen su propia página de **Préstamos**.',
    keywords: ['factura', 'suscripción', 'diferencia', 'pago recurrente'],
  },
  {
    id: 'bills.find.where',
    title: '¿Dónde veo mis facturas?',
    questions: [
      '¿Dónde veo mis facturas?',
      'donde estan mis factruas',
      'no encuentro la página de facturas',
      'como llego a facturas mensuales',
      '¿Dónde está la lista de todas mis facturas?',
      'pagina de facturas',
      'a dónde se fueron mis facturas',
      'hay una pestaña de facturas?',
      'como abro una factura que agregué',
      'dónde reviso qué facturas vencen',
      'muéstrame mis facturas recurrentes',
      'qué pasó con la página Tus facturas',
      'donde veo lo q tengo q pagar este mes',
    ],
    answer:
      'Tus facturas están en la página **Facturas mensuales**. Hay dos formas de llegar:\n\n' +
      '- En **Inicio**, debajo de **A dónde se fue tu dinero**, toca **Facturas mensuales**.\n' +
      '- Ve a **Ajustes → Tu dinero → Facturas**.\n\n' +
      'La página muestra lo que vence en el mes, lo que todavía está en **Próximos**, todas las facturas en **Todas las facturas** y las que detuviste en **Detenidas**. Toca una factura para abrir su página. Para agregar una, toca el **+** de arriba a la derecha.\n\n' +
      'Si todavía no agregaste ninguna, dice **Aún no hay facturas** con un botón **Agregar una factura**.',
    keywords: ['facturas mensuales', 'página de facturas', 'tus facturas', 'lista de facturas'],
  },
  {
    id: 'subscriptions.find.where',
    title: '¿Dónde veo mis suscripciones?',
    questions: [
      '¿Dónde veo mis suscripciones?',
      'donde estan mis suscripciones',
      'pagina de suscripciones',
      'como encuentro el netflix que agregué',
      'no encuentro mis suscripciones por ningun lado',
      '¿Dónde está la lista de todas mis suscripciones?',
      'como abro suscripciones',
      'donde reviso mis servicios de streaming',
      'muéstrame qué suscripciones tengo',
      'hay una página para las suscripciones?',
      'a dónde se fueron mis subs',
    ],
    answer:
      'Tus suscripciones están en la página **Suscripciones**. Hay dos formas de llegar:\n\n' +
      '- En **Inicio**, debajo de **A dónde se fue tu dinero**, toca **Suscripciones**.\n' +
      '- Ve a **Ajustes → Tu dinero → Suscripciones**.\n\n' +
      'La página muestra lo que vence en el mes, lo que todavía está en **Próximos**, las activas en **Todas las suscripciones** y las canceladas en **Canceladas**. Toca una para abrir su página, o el **+** de arriba a la derecha para agregar una.',
    keywords: ['página de suscripciones', 'subs', 'mis suscripciones', 'streaming'],
  },

  // ---------------------------------------------------------------------------------------------
  // Adding a bill
  // ---------------------------------------------------------------------------------------------
  {
    id: 'bills.add.how',
    title: '¿Cómo agrego una factura?',
    questions: [
      '¿Cómo agrego una factura?',
      'agregar factura',
      'como pongo mi renta',
      'quiero agregar mi factura de luz',
      'como agrego una factura que se repite',
      '¿Dónde pongo mi factura del teléfono?',
      'nueva factura',
      'como llevo la cuenta de mi internet',
      'agregar un pago mensual',
      'cómo configuro mis facturas',
      'pasos para agregar una factura',
      'cual es la forma mas rapida de agregar una factura',
      'le pago al casero cada mes, como lo agrego',
      'Facturas mensuales dice Aún no hay facturas',
    ],
    answer:
      'Toca **Agregar rápido → Factura** en **Inicio**, o el **+** en **Facturas mensuales**. Luego:\n\n' +
      '1. Elige para qué es, como **Vivienda** o **Internet**. Al tocar, pasas directo al siguiente paso.\n' +
      '2. Escribe el importe y toca **Continuar**.\n' +
      '3. Completa **Nombre**, **Fecha de pago**, cada cuánto **Se repite**, **Se paga con** y **Recordatorio**. **Nota** es opcional.\n' +
      '4. Toca **Guardar factura**.\n\n' +
      'Verás **Factura agregada** en la parte de abajo de la pantalla. Todo se puede cambiar después desde la página de la factura.\n\n' +
      'Consejo: en **Fecha de pago**, elige la próxima fecha en que vence. Si eliges una fecha pasada, Skip registra todos los pagos desde entonces.',
    keywords: ['agregar factura', 'nueva factura', 'agregar rápido', 'renta'],
  },
  {
    id: 'bills.add.categories',
    title: '¿Qué significan las categorías de las facturas?',
    questions: [
      '¿Qué significan las categorías de las facturas?',
      'en que categoria va mi renta',
      'q va en Otra',
      'lista de categorías de facturas',
      '¿Puedo crear mi propia categoría de factura?',
      'no hay categoría para mi factura',
      'dónde está Préstamos y crédito en las categorías',
      'qué pasó con Familia y salud',
      'en qué categoría pongo el gas',
      'qué son las opciones con íconos cuando agrego una factura',
      'categoría personalizada para facturas',
      'hay una categoría para guardería o cuidado de niños',
    ],
    answer:
      'La primera página de **Agregar una factura** pregunta “¿De qué es esta factura?” con 10 opciones. Cada una dice qué cubre:\n\n' +
      '- **Vivienda**: renta, hipoteca, mantenimiento\n' +
      '- **Luz y gas**: luz, calefacción, gas\n' +
      '- **Agua y basura**: agua, drenaje, basura\n' +
      '- **Internet**: internet de casa y wifi\n' +
      '- **Celular**: planes y equipos\n' +
      '- **Seguros**: auto, gastos médicos, casa, vida\n' +
      '- **Transporte**: gasolina, transporte público, casetas\n' +
      '- **Salud y gastos médicos**: médico, dentista, medicinas\n' +
      '- **Educación**: colegiaturas y cursos\n' +
      '- **Otra**: cualquier otra cosa\n\n' +
      'La categoría define el ícono de la factura. No puedes crear la tuya, así que usa **Otra** para lo que no encaje. Los préstamos no están aquí: agrégalos en la página de **Préstamos**. Las facturas que estaban en Familia y salud en una versión anterior ahora aparecen como **Salud y gastos médicos**.',
    keywords: ['categoría', 'categorías', 'vivienda', 'otra'],
  },
  {
    id: 'bills.add.name',
    title: '¿Qué pongo en el Nombre de la factura?',
    questions: [
      '¿Qué pongo en el Nombre de la factura?',
      'mi compañía de luz no sale en la lista',
      'como le pongo nombre a una factura',
      'puedo escribir mi propio nombre para una factura',
      'el cuadro de nombre solo muestra empresas',
      'mi casero no es una empresa, qué escribo',
      'campo nombre de la factura',
      '¿Por qué el cuadro de nombre muestra nombres de empresas?',
      'como le cambio el nombre a una factura',
      'cambiar el nombre de mi factura',
      'qué es el texto gris del cuadro de nombre',
    ],
    answer:
      '**Nombre** es cómo se llama la factura en todo Skip, y es obligatorio. Empieza a escribir y luego:\n\n' +
      '- Elige una empresa de la lista. Su logo viene incluido, y los nombres que ya usaste salen primero.\n' +
      '- O usa tus propias palabras. Toca la fila **Agregar** de abajo, como **Agregar “Arrendador”**, o simplemente deja lo que escribiste. También cuenta como nombre.\n\n' +
      'El texto gris cambia según la categoría, por ejemplo “Renta, hipoteca o tu arrendador” en **Vivienda**.\n\n' +
      'Para cambiarle el nombre después, ábrela, toca el lápiz, toca la **X** del cuadro **Nombre** y escribe el nuevo. Si ya se pagó antes, Skip te pregunta si los pagos anteriores también deben tomar el nombre nuevo.',
    keywords: ['nombre', 'empresa', 'cambiar nombre', 'arrendador'],
  },
  {
    id: 'bills.add.amount',
    title: '¿Cómo ingreso el importe de una factura?',
    questions: [
      '¿Cómo ingreso el importe de una factura?',
      'como pongo los centavos en el monto',
      'para qué sirve el botón de calculadora en la factura',
      'puedo sumar dos montos en una sola factura',
      'hay un máximo para el importe de una factura',
      'el botón Continuar está gris en el importe',
      'puedo poner una factura de $0',
      'cómo cambio el importe después de guardar',
      'teclado del importe',
      'dónde cambio cuánto es la factura',
      'puedo poner una cantidad enorme',
      'se pueden sumar dos cosas al escribir el monto de una factura',
      'sumar renta y estacionamiento en el monto de la factura',
      'hay calculadora cuando escribo el monto de la factura',
    ],
    answer:
      'Escríbelo en el teclado, con centavos incluidos, y toca **Continuar**. En una factura, el botón **Calculadora** arriba del teclado te deja sumar antes, por ejemplo la renta más el estacionamiento.\n\n' +
      '- El importe debe ser mayor que cero, así que **Continuar** no se activa hasta que escribas uno.\n' +
      '- Hasta dos decimales, y hasta $999,999,999.99.\n' +
      '- Para cambiarlo después, abre la factura, toca el lápiz y luego toca el importe en la parte de arriba de la página.\n\n' +
      'Una suscripción funciona igual, sin la **Calculadora**. Si el importe cambia de un mes a otro, usa tu importe habitual y actualízalo cuando cambie.',
    keywords: ['importe', 'monto', 'calculadora', 'teclado'],
  },
  {
    id: 'bills.add.payment-on',
    title: '¿Qué fecha elijo en Fecha de pago?',
    questions: [
      '¿Qué fecha elijo en Fecha de pago?',
      'qué significa fecha de pago',
      'q fecha pongo para mi factura',
      '¿Pongo la primera fecha en que pagué o la próxima?',
      'fecha de pago',
      'la fecha de pago es la fecha de vencimiento?',
      'como cambio la fecha de vencimiento de una factura',
      'qué es Empieza el en vez de Fecha de pago',
      'puedo elegir una fecha futura para mi factura',
      'el cuadro de fecha en la factura',
      'dónde veo cuándo vence mi próxima factura',
      'por qué fecha de pago muestra otra fecha cuando edito',
    ],
    answer:
      '**Fecha de pago** es la fecha en que vence la factura la próxima vez. Toca el cuadro y elige un día en el calendario. Skip la repite desde ahí según lo que elijas en **Se repite**, así que una renta del día 1 se queda en el día 1.\n\n' +
      '- Elige la próxima fecha en que saldrá si quieres que Skip cuente desde ahora.\n' +
      '- Una fecha futura está bien: no cuenta nada hasta que llegue.\n' +
      '- Una fecha pasada hace que Skip registre como pagado cada pago desde entonces.\n\n' +
      'En la página de la factura esta fecha aparece como **Próximo vencimiento**, y cuando editas la factura el cuadro muestra esa próxima fecha, no la primera. En una factura de **Periodo específico**, el cuadro se llama **Empieza el**.',
    keywords: ['fecha de pago', 'vencimiento', 'próximo vencimiento', 'empieza el'],
  },
  {
    id: 'bills.add.recurring',
    title: '¿Qué significan las opciones de Se repite?',
    questions: [
      '¿Qué significan las opciones de Se repite?',
      'cada cuánto se repite mi factura',
      'qué significa cada 3 meses',
      'opciones semanal mensual anual',
      'como hago que una factura sea anual',
      'mi seguro se paga una vez al año',
      'qué es el ciclo de cobro en una suscripción',
      'trimestral o cada 3 meses',
      'cómo pongo una factura semanal',
      'opciones de repetición',
      'una factura mensual cae siempre el mismo día?',
      'en qué día de la semana cae una factura semanal',
      'mi factura se paga cada trimestre',
      'mi suscripción es anual',
    ],
    answer:
      '**Se repite** es cada cuánto vuelve la factura. Elige una opción:\n\n' +
      '- **Semanal**: cada 7 días, el mismo día de la semana que **Fecha de pago**.\n' +
      '- **Mensual**: el mismo día de cada mes. Las facturas nuevas empiezan con esta opción.\n' +
      '- **Cada 3 meses**: el mismo día cada tres meses, como 15 de enero, 15 de abril, 15 de julio y 15 de octubre.\n' +
      '- **Anual**: una vez al año en esa fecha.\n' +
      '- **Periodo específico**: se cuenta una sola vez, el día de **Empieza el**. No se repite.\n\n' +
      'Las suscripciones tienen las mismas opciones en **Ciclo de cobro**, excepto **Periodo específico**, y cada 3 meses se llama **Trimestral**. Lo puedes cambiar después con el lápiz en la página de la factura.',
    keywords: ['se repite', 'ciclo de cobro', 'trimestral', 'anual'],
  },
  {
    id: 'bills.add.period',
    title: '¿Qué es una factura de Periodo específico?',
    questions: [
      '¿Qué es una factura de Periodo específico?',
      'qué significa periodo fijo en mi factura',
      'opción periodo específico',
      'mi factura dura solo 6 meses',
      'periodo específico cobra cada mes entre las fechas',
      'por qué mi factura de periodo específico solo se contó una vez',
      'qué es el campo Hasta en una factura',
      'cómo le pongo fecha de fin a una factura',
      'qué hace Borrar — sin fecha de fin',
      'una factura puede terminar sola después de varios pagos',
      'continúa sin fecha de fin qué significa',
      'factura con día de inicio y día de fin',
      'poner fecha de inicio y de fin a una factura',
      'qué hacen los campos Empieza el y Hasta',
    ],
    answer:
      '**Periodo específico** es para un pago que ocurre una sola vez, no con un calendario. Skip lo cuenta una vez, el día de **Empieza el**.\n\n' +
      '- **Empieza el** (obligatorio): el día en que se paga.\n' +
      '- **Hasta** (opcional): el día en que termina. Ese día la factura pasa a **Detenidas**. Sin uno (“Continúa — sin fecha de fin”) se queda en **Todas las facturas**. **Borrar — sin fecha de fin** quita el día final.\n' +
      '- En las listas aparece como **Periodo fijo**.\n\n' +
      'No se repite entre las dos fechas. Para algo mensual que termina en una fecha conocida, elige **Mensual**, y en su último día detenla con **Conservar los cargos anteriores**.',
    keywords: ['periodo específico', 'periodo fijo', 'fecha de fin', 'empieza el'],
  },
  {
    id: 'bills.add.paid-with',
    title: '¿Qué significa Se paga con?',
    questions: [
      '¿Qué significa Se paga con?',
      'qué es Se cobra a en una suscripción',
      'qué hace la opción Skip en se paga con',
      'pago mi factura en efectivo qué elijo',
      'es obligatorio se paga con?',
      'por qué tengo que elegir una tarjeta para una factura',
      'mi factura no se paga con tarjeta',
      'mi segunda tarjeta no sale en la lista de se paga con',
      'qué tarjeta paga esta factura',
      'qué pasa si elijo Skip',
      'puedo dejar se paga con vacío',
      'pagué la renta con mi tarjeta de crédito',
      'pago mi teléfono desde mi cuenta de ahorros',
      'qué toco si la factura no se carga a ninguna de mis cuentas',
    ],
    answer:
      '**Se paga con** dice de qué tarjeta o cuenta bancaria sale la factura. En una suscripción se llama **Se cobra a**. Debes tocar una opción antes de guardar:\n\n' +
      '- Una tarjeta: cada pago se suma a lo que debes en esa tarjeta.\n' +
      '- Una cuenta bancaria: cada pago se resta del saldo de esa cuenta.\n' +
      '- **Skip**: no está ligada a ninguna tarjeta ni cuenta, para efectivo o cualquier otra cosa. Igual cuenta en tus gastos y en tu **Saldo actual**.\n\n' +
      'Las facturas con **Skip** muestran un enlace **Agregar una tarjeta** en **Facturas mensuales**, y sus pagos dicen **Sin tarjeta**.\n\n' +
      'En el plan gratis, en esta lista solo aparecen tu primera tarjeta y tu primera cuenta bancaria. Las facturas que ya se pagaron con otra tarjeta siguen usándola.',
    keywords: ['se paga con', 'se cobra a', 'omitir', 'efectivo'],
  },
  {
    id: 'bills.add.reminder',
    title: '¿Cómo funciona el recordatorio de una factura?',
    questions: [
      '¿Cómo funciona el recordatorio de una factura?',
      'por qué tengo que elegir un recordatorio',
      'puedo recibir una notificación antes de que venza mi factura',
      'avísame antes de que venza la renta',
      'a qué hora llega el recordatorio de la factura',
      'a qué hora llega el recordatorio de una suscripción',
      'opciones de recordatorio para una factura',
      'qué significa El mismo día en el recordatorio',
      'skip me avisa antes de que se renueve netflix?',
      'el recordatorio es obligatorio',
      'skip tiene que estar abierto para mandar recordatorios',
      'qué dice el recordatorio de la factura',
      'cómo me avisan antes de que venza una factura',
      'activar un recordatorio al agregar una factura',
    ],
    answer:
      'Cada factura y suscripción pide un **Recordatorio** antes de guardarse. Elige **Sin recordatorio**, **El mismo día**, o **1 día**, **3 días** o **1 semana** antes de que venza (antes de que se renueve, en una suscripción).\n\n' +
      'Si eliges cualquier opción menos **Sin recordatorio**, aparece un botón con la hora, **a las 9:00 a. m.** al principio. Tócalo para elegir otra hora.\n\n' +
      'La notificación llega ese día, a esa hora o un poco después, en tu propia zona horaria (en unos 15 minutos). Muestra el nombre, cuándo vence y el importe, como “Due in 3 days · $50.00” (vence en 3 días) o “Renews tomorrow · $15.00” (se renueva mañana). Al tocarla se abre la factura.\n\n' +
      'Vuelve a llegar antes de cada nueva fecha de vencimiento, y Skip no necesita estar abierto. Las facturas detenidas y las suscripciones canceladas ya no reciben recordatorios. Los recordatorios son gratis en todos los planes.',
    keywords: ['recordatorio', 'notificación', 'aviso', 'sin recordatorio'],
  },
  {
    id: 'bills.add.note',
    title: '¿Puedo agregar una nota a una factura?',
    questions: [
      '¿Puedo agregar una nota a una factura?',
      'dónde escribo el número de cuenta de mi factura',
      'agregar una nota a una suscripción',
      'la nota es obligatoria?',
      'para qué sirve la nota',
      'puedo escribir qué plan tengo',
      'dónde aparece la nota',
      'cómo edito una nota en una factura',
      'nota de factura',
      'puedo agregar un apunte',
      'campo de texto para apuntes en una factura o suscripción',
      'detalles extra en una factura, dónde los escribo',
      'hay campo de notas en las facturas',
      'dónde dejo un comentario en una suscripción',
    ],
    answer:
      'Sí. Puedes agregar una en el formulario de la factura o suscripción, al agregarla o después de tocar el lápiz.\n\n1. Toca **Nota**, que dice **Agregar una nota**.\n2. Escribe lo que quieras (“Algo que quieras recordar” en una factura, “Qué plan, por ejemplo” en una suscripción).\n3. Toca **Listo**.\n\nLa nota es opcional. Aparece como **Nota** en la página de la factura o suscripción. Para cambiarla o borrarla, toca el lápiz, toca **Nota**, edítala y toca **Guardar cambios**.',
    keywords: ['nota', 'apunte', 'comentario'],
  },
  {
    id: 'bills.add.missing',
    title: '¿Por qué no se guarda mi factura o suscripción?',
    questions: [
      '¿Por qué no se guarda mi factura o suscripción?',
      'dice para guardar la factura completa',
      'xq no se guarda la factura',
      'guardar suscripción no funciona',
      'qué campos son obligatorios en una factura',
      'qué se necesita para agregar una suscripción',
      'sigue diciendo que complete recordatorio',
      'la fecha de fin no puede ser antes de la fecha de inicio',
      'el botón guardar no hace nada',
      'dice algo salió mal al guardar mi factura',
      'me pide completar campos al guardar',
      'no me deja guardar la suscripción',
    ],
    answer:
      '**Guardar** nunca se pone gris. En cambio te dice qué falta, por ejemplo “Para guardar la factura, completa: Se paga con, Recordatorio.”\n\n' +
      '- Una factura necesita **Importe**, **Nombre**, **Categoría**, **Fecha de pago** (o **Empieza el**), **Se paga con** y **Recordatorio**.\n' +
      '- Una suscripción necesita **Importe**, **Servicio**, **Próxima renovación**, **Se cobra a** y **Recordatorio**.\n\n' +
      'En **Se paga con**, toca una tarjeta, una cuenta o **Skip**. En **Recordatorio**, **Sin recordatorio** cuenta como respuesta. **Nota** siempre es opcional. En una factura de **Periodo específico**, el día de **Hasta** no puede ser anterior a **Empieza el**.\n\n' +
      'Si dice “Algo salió mal. Inténtalo de nuevo.”, revisa tu conexión y toca Guardar otra vez. Lo que llenaste se queda en la página.',
    keywords: ['guardar', 'obligatorio', 'completa', 'falta'],
  },
  {
    id: 'bills.add.cancel',
    title: '¿Cómo salgo de una factura sin guardar?',
    questions: [
      '¿Cómo salgo de una factura sin guardar?',
      'cancelar agregar esta factura',
      'cómo salgo de la página de agregar suscripción',
      'empecé a agregar una factura por error',
      'qué hace la X en la página de la factura',
      '¿Dejar de editar esta factura? qué pasa',
      'no se guardará nada de lo que ingresaste aquí',
      'descartar cambios de una suscripción',
      'regresar sin guardar la factura',
      'si toco la flecha de atrás pierdo lo que escribí',
    ],
    answer:
      'Toca la **X** de arriba. Skip pregunta “¿Dejar de agregar esta factura?” (o “¿Dejar de editar esta factura?”) y dice “No se guardará nada de lo que ingresaste aquí.” Toca **Sí** para salir, o **Volver** para seguir.\n\n' +
      'La flecha de atrás retrocede una página. Al agregar, regresa al teclado y conserva lo que escribiste. En la primera página del formulario, sale sin guardar. Las suscripciones funcionan igual. No se guarda nada hasta que toques **Guardar factura**, **Guardar suscripción** o **Guardar cambios**.',
    keywords: ['cancelar', 'descartar', 'cerrar', 'salir'],
  },
  {
    id: 'bills.one-time',
    title: '¿Puedo agregar una factura de una sola vez?',
    questions: [
      '¿Puedo agregar una factura de una sola vez?',
      'factura única',
      'solo pago esto una vez',
      'cómo agrego una factura que no se repite',
      'factura de un solo pago',
      'una cuenta del médico que pago una sola vez',
      'un pago único va como recibo o como factura',
      'factura que no es recurrente',
      'agregar una factura sin repetición',
      'recordatorio de un pago único',
      'como registro la factura de una reparación que pago una vez',
      'plomero, dentista o reparación que pago una vez, cómo lo agrego',
      'factura de una sola vez, dónde va',
    ],
    answer:
      'Las facturas están hechas para pagos que se repiten. Para algo de una sola vez tienes dos opciones:\n\n' +
      '- Agrégalo como recibo con **Agregar rápido → Recibo**. Es lo más sencillo para algo que ya pagaste.\n' +
      '- Agrégalo como factura con **Se repite** en **Periodo específico**. Skip lo cuenta una vez, el día de **Empieza el**, y aun así puedes tener un **Recordatorio** antes. Pon **Hasta** en el mismo día para que después pase a **Detenidas**.',
    keywords: ['una vez', 'pago único', 'sin repetir', 'una sola vez'],
  },

  // ---------------------------------------------------------------------------------------------
  // Adding a subscription
  // ---------------------------------------------------------------------------------------------
  {
    id: 'subscriptions.add.how',
    title: '¿Cómo agrego una suscripción?',
    questions: [
      '¿Cómo agrego una suscripción?',
      'agregar suscripción',
      'como agrego netflx',
      'quiero llevar la cuenta de mi spotify',
      'agregar mi membresía del gimnasio',
      'nueva suscripción',
      'cómo agrego un servicio de streaming',
      'dónde pongo mi apple music',
      'cómo llevo mis suscripciones en skip',
      'pasos para agregar una suscripción',
      'agregar disney plus',
      'configurar mis suscripciones',
      'Suscripciones dice Aún no hay suscripciones',
    ],
    answer:
      'Toca **Agregar rápido → Suscripción** en **Inicio**, o el **+** en **Suscripciones**. Luego:\n\n' +
      '1. Escribe cuánto cuesta y toca **Continuar**.\n' +
      '2. En **Servicio**, empieza a escribir y elígelo de la lista, como Netflix. Su logo viene incluido.\n' +
      '3. Elige el **Ciclo de cobro**: **Semanal**, **Mensual**, **Trimestral** o **Anual**.\n' +
      '4. Pon la **Próxima renovación**, la próxima fecha en que te cobrarán.\n' +
      '5. Elige **Se cobra a** (una tarjeta, una cuenta o **Skip**) y un **Recordatorio**. **Nota** es opcional.\n' +
      '6. Toca **Guardar suscripción**.\n\n' +
      'Verás **Suscripción agregada**. Todo se puede cambiar después con el lápiz en su página.',
    keywords: ['agregar suscripción', 'nueva suscripción', 'netflix', 'spotify'],
  },
  {
    id: 'subscriptions.add.service',
    title: '¿Cómo elijo el servicio de una suscripción?',
    questions: [
      '¿Cómo elijo el servicio de una suscripción?',
      'mi servicio no está en la lista',
      'qué significa Archivada en',
      'puedo cambiar la categoría de una suscripción',
      'cómo cambio qué servicio es',
      'cuadro de búsqueda de servicio',
      'mi gimnasio local no sale en la búsqueda',
      'por qué dice archivada en entretenimiento',
      'me preguntó parece que es qué significa',
      'escribir el nombre de mi propia suscripción',
      'cambiar el nombre de una suscripción',
      'agregar una suscripción personalizada',
      'mi servicio no está, cómo escribo el mío',
    ],
    answer:
      'Escribe en el cuadro **Servicio** (“Busca un servicio”) y elige de la lista. Los servicios que ya usaste salen primero, y al elegir uno viene su logo.\n\n' +
      '¿No está en la lista? Toca la fila **Agregar** de abajo, o simplemente deja lo que escribiste: cuenta como el nombre. Skip puede preguntar entonces “Parece que es…” para encontrar un logo. Toca **Sí, es ese**, **No es este**, o una opción sin logo.\n\n' +
      'Debajo del cuadro, **Archivada en** muestra el tipo de gasto en que Skip la puso, como Entretenimiento. Skip lo elige según el servicio y no se puede cambiar a mano.\n\n' +
      'Para elegir otro servicio, toca la **X** del cuadro.',
    keywords: ['servicio', 'archivada en', 'categoría', 'busca un servicio'],
  },
  {
    id: 'subscriptions.add.next-renewal',
    title: '¿Qué fecha elijo en Próxima renovación?',
    questions: [
      '¿Qué fecha elijo en Próxima renovación?',
      'qué es próxima renovación',
      'estoy en una prueba gratis, cómo la agrego',
      'mi suscripción empieza después de una prueba gratuita',
      'qué hago si no sé cuándo se renueva',
      'es obligatoria la próxima renovación?',
      'cuándo se renueva mi suscripción',
      'qué fecha pongo para spotify',
      'la prueba termina la próxima semana qué fecha pongo',
      'pongo el día en que me registré?',
      'fecha de renovación de una suscripción',
      'mi prueba gratis termina pronto, qué fecha va en próxima renovación',
      'la prueba termina el viernes, qué fecha de renovación pongo',
      'pongo la fecha en que termina la prueba o la que me registré',
    ],
    answer:
      '**Próxima renovación** es la próxima fecha en que te cobrarán, y es obligatoria. Skip la repite según el **Ciclo de cobro**: el mismo día de cada semana, mes, trimestre o año.\n\n' +
      '- Elige una fecha futura para contar desde ahora. Una fecha pasada hace que Skip registre como pagada cada renovación desde entonces.\n' +
      '- En una prueba gratis, elige el día en que termina la prueba y escribe el precio que pagarás después. No cuenta nada hasta entonces.\n' +
      '- ¿No estás seguro? El día de tu último cargo, avanzado un ciclo, suele ser correcto. Lo puedes cambiar después.\n\n' +
      'En la página de la suscripción aparece como **Próxima renovación**.',
    keywords: ['próxima renovación', 'renovación', 'prueba gratis', 'se renueva'],
  },

  // ---------------------------------------------------------------------------------------------
  // Detail pages and editing
  // ---------------------------------------------------------------------------------------------
  {
    id: 'bills.detail.page',
    title: '¿Qué hay en la página de una factura?',
    questions: [
      '¿Qué hay en la página de una factura?',
      'qué pasa cuando toco una factura',
      'qué significa Próximo vencimiento',
      'qué es Se paga con en mi factura',
      'sin forma de pago en la página de mi factura',
      'qué son los botones de mes y año en la factura',
      'qué es la lista de Próximos en una factura',
      'qué significa Vence debajo de próximos',
      'detalles de la factura',
      'qué significa Inicio en una factura',
      'qué es la fila Termina',
      'qué sale cuando toco una factura',
      'toqué una factura, qué es todo eso',
      'qué son las filas de la factura como próximo vencimiento e inicio',
    ],
    answer:
      'Toca cualquier factura para abrir su página. Arriba verás su logo o ícono, el importe y cada cuánto se repite. Después:\n\n' +
      '- **Próximo vencimiento**: la próxima fecha en que vence\n' +
      '- **Se paga con**: su tarjeta o cuenta (“Sin forma de pago” cuando está en **Skip**)\n' +
      '- **Categoría**\n' +
      '- **Inicio**: la fecha desde la que Skip la cuenta\n' +
      '- **Termina**: solo en una factura con fecha de fin\n' +
      '- **Nota**, si tiene una\n\n' +
      'Más abajo, elige **Mes** o **Año** (abre en Año, el año calendario actual). **Pagados** lista los pagos hasta ahora, con su cantidad y total junto al título. **Próximos** lista las fechas que faltan, cada una marcada con **Vence**.\n\n' +
      'El lápiz de arriba a la derecha edita la factura. Toca el logo para cambiarlo.',
    keywords: ['página de la factura', 'detalles', 'próximo vencimiento', 'se paga con'],
  },
  {
    id: 'subscriptions.detail.page',
    title: '¿Qué hay en la página de una suscripción?',
    questions: [
      '¿Qué hay en la página de una suscripción?',
      'qué pasa cuando toco una suscripción',
      'detalles de la suscripción',
      'dónde veo cuándo se renueva netflix',
      'qué significa Aún sin fecha en mi suscripción',
      'qué es Se paga con en una suscripción',
      'por qué no hay lápiz en mi suscripción',
      'para qué sirve el cambio de mes y año en una suscripción',
      'la página de la suscripción muestra pagados y próximos',
      'qué significa Inicio en una suscripción',
      'qué se muestra en la página de una suscripción',
      'toqué netflix en mi lista, qué es todo esto',
      'explícame la página de una sola suscripción',
      'qué significan renovación, se paga con e inicio en la página de una suscripción',
    ],
    answer:
      'Toca cualquier suscripción para abrir su página. Arriba verás su logo, el precio y su ciclo de cobro (o “Cancelada · último cargo el” y una fecha). Después:\n\n' +
      '- **Próxima renovación**: la próxima fecha de cobro (“Aún sin fecha” si no tiene)\n' +
      '- **Se paga con**: su tarjeta o cuenta (“Sin forma de pago” cuando está en **Skip**)\n' +
      '- **Inicio**: la fecha desde la que Skip la cuenta\n' +
      '- **Nota**, si tiene una\n\n' +
      'Más abajo, elige **Mes** o **Año**. **Pagados** lista las renovaciones hasta ahora con su cantidad y total. **Próximos** lista las que faltan, marcadas con **Vence**.\n\n' +
      'El lápiz de arriba a la derecha la edita. Una suscripción cancelada no tiene lápiz, solo **Eliminar suscripción** al final.',
    keywords: ['página de la suscripción', 'próxima renovación', 'se paga con', 'detalles'],
  },
  {
    id: 'bills.detail.no-charges',
    title: '¿Por qué la página de mi factura no muestra pagos?',
    questions: [
      '¿Por qué la página de mi factura no muestra pagos?',
      'no hay cargos de esta factura en este periodo',
      'no hay cargos de esta suscripción en este periodo',
      'la página de mi factura está vacía',
      'falta el año pasado en la lista de pagados',
      'por qué faltan pagos viejos en mi factura',
      'la página de la factura no muestra mi primer pago',
      'no hay nada en pagados de mi suscripción',
      'tu historial anterior está guardado en la página de mi factura',
      'dónde están los pagos del año pasado de esta factura',
    ],
    answer:
      '“No hay cargos de esta factura en este periodo.” significa que no se pagó ni vence nada en el **Mes** o **Año** que elegiste. Prueba con la otra opción.\n\n- Una factura nueva no tiene pagos hasta que llega su primera fecha.\n- **Mes** y **Año** son este mes y este año calendario, así que los pagos del año pasado no están aquí. Usa **Historial de pagos** y elige el año.\n- En el plan gratis la lista muestra los últimos 90 días. Los pagos más antiguos se conservan, y **Tu historial anterior está guardado** aparece justo debajo de las opciones **Mes** y **Año**. La cantidad y el total junto a **Pagados** igual los incluyen.',
    keywords: ['no hay cargos', 'vacío', 'faltan pagos', 'periodo'],
  },
  {
    id: 'bills.detail.total',
    title: '¿Cuánto he pagado en una sola factura?',
    questions: [
      '¿Cuánto he pagado en una sola factura?',
      'cuánto he gastado en netflix este año',
      'total pagado de mi renta',
      'cuánto me costó mi factura del teléfono el año pasado',
      'ver todo lo que le he pagado a una empresa',
      'total de una sola suscripción',
      'cuánto he pagado en total por spotify',
      'total anual de una factura',
      'suma de todos los pagos de esta factura',
      'cuánto me ha costado el gimnasio',
    ],
    answer:
      'Para este año, abre la factura o suscripción y deja la opción en **Año**. La cantidad y el total están junto al título **Pagados**.\n\n' +
      'Para otros años, abre **Historial de pagos**, toca **Buscar pagos** y escribe su nombre. Los resultados se agrupan por año, y cada año muestra su total y cuántos pagos tuvo.\n\n' +
      'En el plan gratis, los totales cuentan todos los pagos, pero las filas solo llegan 90 días atrás.',
    keywords: ['total', 'cuánto he pagado', 'gastado en', 'suma'],
  },
  {
    id: 'bills.edit.how',
    title: '¿Cómo edito una factura?',
    questions: [
      '¿Cómo edito una factura?',
      'cambiar mi factura',
      'editar factura',
      'cómo corrijo un error en mi factura de renta',
      'dónde está el botón de editar de una factura',
      'cómo actualizo una factura',
      'me equivoqué al escribir mi factura',
      'lápiz en la página de la factura',
      '¿Puedo cambiar una factura después de guardarla?',
      'al tocar una factura no me deja editarla',
      'factura actualizada mensaje',
      'cómo cambio los datos de una factura ya guardada',
      'se puede modificar una factura existente',
      'una factura se puede editar después de guardar',
    ],
    answer:
      '1. Abre **Facturas mensuales** y toca la factura. Se abre su página.\n' +
      '2. Toca el lápiz de arriba a la derecha. Se abre **Editar factura** con todo lleno.\n' +
      '3. Toca el importe de arriba para cambiarlo, toca **Categoría** o **Nota** para abrir sus páginas, o cambia los cuadros y opciones ahí mismo.\n' +
      '4. Toca **Guardar cambios**.\n\n' +
      'Si cambiaste el nombre, el importe o **Se paga con** y la factura ya se pagó antes, Skip te pregunta si los pagos anteriores también deben cambiar. Verás **Factura actualizada** cuando se guarde.\n\n' +
      'Las facturas detenidas no tienen lápiz y no se pueden editar. Un préstamo abre su propia página de préstamo, que editas desde ahí.',
    keywords: ['editar', 'cambiar', 'lápiz', 'corregir'],
  },
  {
    id: 'subscriptions.edit.how',
    title: '¿Cómo edito una suscripción?',
    questions: [
      '¿Cómo edito una suscripción?',
      'cambiar mi suscripción',
      'editar suscripción',
      'cómo actualizo el precio de netflix',
      'cambiar la fecha de renovación de mi suscripción',
      'cómo paso una suscripción de mensual a anual',
      'corregir una suscripción que agregué mal',
      'dónde está el lápiz de las suscripciones',
      '¿Puedo editar una suscripción cancelada?',
      'suscripción actualizada',
      'cambiar a qué tarjeta se cobra netflix',
    ],
    answer:
      '1. Abre **Suscripciones** y toca la suscripción. Se abre su página.\n' +
      '2. Toca el lápiz de arriba a la derecha. Se abre **Editar suscripción**.\n' +
      '3. Cambia el importe (tócalo arriba), **Servicio**, **Ciclo de cobro**, **Próxima renovación**, **Se cobra a**, **Recordatorio**, **Nota** o **Estado**.\n' +
      '4. Toca **Guardar cambios**.\n\n' +
      'Si cambiaste el nombre, el importe o la tarjeta y ya se cobró antes, Skip te pregunta si también debe cambiar los cargos anteriores. Verás **Suscripción actualizada**.\n\n' +
      'Las suscripciones canceladas no se pueden editar. Su página no tiene lápiz.',
    keywords: ['editar suscripción', 'cambiar suscripción', 'lápiz', 'ciclo de cobro'],
  },
  {
    id: 'bills.edit.past-or-upcoming',
    title: '¿Qué hacen Anteriores y próximos y Solo los próximos?',
    questions: [
      '¿Qué hacen Anteriores y próximos y Solo los próximos?',
      '¿Cambiar también los cargos anteriores?',
      'me preguntó si cambiar los cargos anteriores, qué elijo',
      'qué significa anteriores y próximos',
      'qué significa solo los próximos',
      'editar mi factura cambia los meses pasados',
      'cambiar el importe cambia mi historial',
      'por qué skip me preguntó por los cargos anteriores',
      'cambié el importe y se cambiaron mis meses anteriores',
      'cómo corrijo el importe de todos los pagos pasados',
      'editar solo los pagos futuros',
      'por qué no preguntó por cargos anteriores cuando cambié la fecha',
      'Ya hubo 4 cargos de Renta. ¿Cambiarlos también o solo los próximos?',
    ],
    answer:
      'Cuando editas una factura o suscripción que ya se pagó antes, y cambiaste su nombre, importe o tarjeta, Skip pregunta “¿Cambiar también los cargos anteriores?”\n\n' +
      '- **Anteriores y próximos**: todos los pagos ya registrados toman el nuevo nombre, importe y tarjeta. Úsalo para corregir un error, como una falta de ortografía.\n' +
      '- **Solo los próximos**: los pagos anteriores se quedan como estaban. Solo los pagos de ahora en adelante usan los datos nuevos. Úsalo cuando el precio sí cambió.\n' +
      '- **Cancelar**: no se guarda nada.\n\n' +
      'Ejemplo: una renta de $1,000 pagada 3 veces, ahora de $1,100. **Solo los próximos** deja $3,000 en los meses pasados. **Anteriores y próximos** lo cambia a $3,300, y tus saldos cambian para coincidir.\n\n' +
      'Cambiar solo la fecha, la categoría, el ciclo, el recordatorio o la nota nunca pregunta, porque los pagos anteriores conservan sus propias fechas.',
    keywords: ['anteriores y próximos', 'solo los próximos', 'cargos anteriores', 'historial'],
  },
  {
    id: 'bills.edit.amount-change',
    title: 'Cambió el precio de mi factura o suscripción',
    questions: [
      'Cambió el precio de mi factura o suscripción',
      'netflix subió su precio',
      'subió mi renta, cómo la actualizo',
      'aumento de precio en mi suscripción',
      'cómo cambio el importe de una factura',
      'mi factura del teléfono bajó',
      'actualizar el precio de una suscripción sin cambiar los meses viejos',
      'el importe de la factura ya no es el correcto',
      'el seguro se renovó más caro este año',
      'cómo cambiar el monto mensual',
      'mi gimnasio subió el precio',
    ],
    answer:
      'Actualiza el importe y deja los meses anteriores como estaban:\n\n' +
      '1. Abre la factura o suscripción y toca el lápiz.\n' +
      '2. Toca el importe de arriba, escribe el nuevo y toca **Listo**.\n' +
      '3. Toca **Guardar cambios**.\n' +
      '4. Cuando Skip pregunte “¿Cambiar también los cargos anteriores?”, toca **Solo los próximos**.\n\n' +
      'Los pagos ya registrados conservan el precio anterior. Cada pago de ahora en adelante usa el nuevo. Cámbialo antes de la próxima fecha de vencimiento para que ese pago tome el precio nuevo.\n\n' +
      'Si el importe anterior estaba mal desde el principio, elige mejor **Anteriores y próximos**.',
    keywords: ['subió el precio', 'aumento', 'nuevo importe', 'cambió el precio'],
  },
  {
    id: 'bills.amount.varies',
    title: 'Mi factura cambia de importe cada mes',
    questions: [
      'Mi factura cambia de importe cada mes',
      'mi factura de luz cambia cada mes',
      'importe variable de una factura',
      'cómo llevo una factura que nunca es igual',
      'la factura del agua es distinta cada vez',
      'puedo poner un importe distinto para cada mes',
      'mi luz sube en invierno',
      'qué importe pongo para una factura que cambia',
      'el importe de los servicios varía',
      'skip puede usar el importe real de cada mes',
    ],
    answer:
      'Skip guarda un solo importe por factura, y cada pago usa el importe que tiene la factura en su fecha de vencimiento. Para facturas que cambian, como la luz o el agua:\n\n' +
      '- Usa tu importe habitual o promedio, para que el total del mes se acerque.\n' +
      '- Cuando llegue una factura nueva, cambia el importe antes de su fecha de vencimiento y elige **Solo los próximos**. Ese pago toma el importe nuevo y los meses anteriores se quedan como estaban.\n\n' +
      'Una vez registrado un pago, no puedes cambiar ese mes solo. Si quieres un importe distinto para cada mes, cuéntanoslo en **Ajustes → Soporte y comentarios → Comparte una idea**.',
    keywords: ['variable', 'importe distinto', 'cambia', 'promedio'],
  },
  {
    id: 'bills.edit.date-change',
    title: '¿Cómo cambio cuándo vence una factura?',
    questions: [
      '¿Cómo cambio cuándo vence una factura?',
      'cambiar la fecha de vencimiento de mi factura',
      'mi renta pasó del 1 al 15',
      'como cambio el día de renovación de una suscripción',
      'elegí mal la fecha de mi factura',
      'mover la factura a otro día',
      'por qué al cambiar la fecha se saltó este mes',
      'cambié la fecha y el próximo pago es el mes que viene',
      'mi factura ahora sale otro día',
      'editar la fecha de próxima renovación',
    ],
    answer:
      'Cambia la fecha en **Fecha de pago**.\n\n1. Abre la factura y toca el lápiz.\n2. Toca **Fecha de pago** y elige la nueva fecha.\n3. Toca **Guardar cambios**.\n\nEn una suscripción, cambia **Próxima renovación** de la misma forma. Skip no pregunta por los pagos anteriores, porque conservan las fechas en que salieron.\n\nSkip nunca cobra el mismo mes dos veces (ni la misma semana, trimestre o año). Si el pago de este mes ya está registrado y mueves la fecha más tarde dentro del mes, la nueva fecha empieza el mes que viene.\n\nEjemplo: la renta se registró el 1 de octubre y la cambias al día 15. El próximo pago es el 15 de noviembre, no el 15 de octubre.',
    keywords: ['fecha de vencimiento', 'cambiar fecha', 'fecha de pago', 'mover'],
  },
  {
    id: 'bills.edit.started-date',
    title: '¿Por qué Inicio muestra una fecha que no elegí?',
    questions: [
      '¿Por qué Inicio muestra una fecha que no elegí?',
      'la fecha de inicio de mi factura está mal',
      'por qué mi factura dice que inicia el mes que viene',
      'la fila de inicio cambió después de editar',
      'fecha de inicio distinta de la fecha de pago',
      'qué es la fecha de inicio de una suscripción',
      'la fecha de inicio de mi suscripción se movió',
      'por qué inicio es después de mi primer pago',
      'inicio muestra el 1 del mes que viene',
      'qué significa la fecha de inicio',
    ],
    answer:
      '**Inicio** es la primera fecha desde la que Skip cuenta la factura o suscripción. Cuando agregas una, es la fecha que elegiste.\n\nUna vez que se ha pagado al menos una vez, guardar cualquier edición mueve **Inicio** hacia adelante, aunque solo hayas cambiado la nota. Eso evita que se cobre dos veces el mismo mes (o semana, trimestre o año):\n\n- El **Inicio** de una factura pasa a ser su próxima fecha de vencimiento, o el comienzo del mes siguiente (o semana, trimestre o año) si esa fecha todavía cae en uno ya pagado.\n- El **Inicio** de una suscripción pasa a ser el comienzo del mes (o semana, trimestre o año) después de su último pago, casi siempre el 1 del mes que viene.\n\nTus pagos anteriores se quedan como están, en tu historial y tus saldos.\n\nElegir una **Próxima renovación** más temprana en una suscripción que aún no se ha cobrado también puede mover **Inicio** antes, y Skip entonces registra las renovaciones intermedias.',
    keywords: ['inicio', 'fecha de inicio', 'cuenta desde'],
  },
  {
    id: 'bills.edit.card-change',
    title: '¿Cómo cambio la tarjeta con la que se paga una factura?',
    questions: [
      '¿Cómo cambio la tarjeta con la que se paga una factura?',
      'tengo una tarjeta nueva, cómo paso mis facturas',
      'cambiar una suscripción a otra tarjeta',
      'cambiar se paga con en una factura',
      'pasar netflix a mi tarjeta de débito',
      'ahora mi factura sale de mi cuenta de banco',
      'cambiar se cobra a',
      'cambiar la tarjeta mueve mis pagos anteriores?',
      'factura en la tarjeta equivocada',
      'mi tarjeta venció, cómo actualizo las facturas',
    ],
    answer:
      'Abre la factura, toca el lápiz, toca otra tarjeta o cuenta en **Se paga con** (**Se cobra a** en una suscripción) y luego **Guardar cambios**.\n\n' +
      'Si ya se pagó antes, Skip pregunta “¿Cambiar también los cargos anteriores?”\n\n' +
      '- **Solo los próximos**: los pagos anteriores se quedan en la tarjeta anterior y los nuevos van a la nueva. Úsalo cuando de verdad cambiaste de tarjeta.\n' +
      '- **Anteriores y próximos**: todos los pagos anteriores también pasan a la tarjeta nueva, así que cambian los saldos de las dos tarjetas.\n\n' +
      'En el plan gratis, en la lista solo aparecen tu primera tarjeta y tu primera cuenta bancaria.',
    keywords: ['cambiar tarjeta', 'tarjeta nueva', 'se paga con', 'se cobra a'],
  },
  {
    id: 'bills.edit.category',
    title: '¿Cómo cambio la categoría de una factura?',
    questions: [
      '¿Cómo cambio la categoría de una factura?',
      'categoría equivocada en mi factura',
      'pasar mi factura a otra categoría',
      'cambiar factura de Otra a Vivienda',
      'cómo cambio el ícono de una factura',
      'editar categoría',
      'puse mi factura en la categoría equivocada',
      'recategorizar una factura',
      'cambiar el tipo de factura',
      'mi factura muestra el ícono equivocado',
      'cómo cambio qué tipo de factura es',
      'mi factura de internet está en el grupo equivocado, cómo la muevo',
    ],
    answer:
      'Cámbiala desde el formulario de la factura.\n\n1. Abre la factura y toca el lápiz.\n2. Toca **Categoría** y elige otra opción. Regresas directo al formulario.\n3. Toca **Guardar cambios**.\n\nLa categoría define el ícono de la factura, a menos que muestre el logo de una empresa. Nunca cambia importes ni fechas, y Skip no pregunta por los pagos anteriores.',
    keywords: ['categoría', 'cambiar categoría', 'ícono', 'categoría equivocada'],
  },

  // ---------------------------------------------------------------------------------------------
  // Deleting, stopping, cancelling
  // ---------------------------------------------------------------------------------------------
  {
    id: 'bills.delete.how',
    title: '¿Cómo elimino una factura?',
    questions: [
      '¿Cómo elimino una factura?',
      'eliminar factura',
      'como elimino una facutra',
      'cómo me deshago de una factura',
      'dónde está el botón de eliminar facturas',
      'quiero quitar mi renta vieja',
      'cómo borrar una factura',
      'factura eliminada',
      'eliminar una factura que agregué por error',
      'tirar una factura a la basura',
      'no encuentro eliminar en mi factura',
    ],
    answer:
      '1. Abre la factura desde **Facturas mensuales**.\n' +
      '2. Toca el lápiz de arriba a la derecha.\n' +
      '3. Toca **Eliminar factura**, debajo de **Guardar cambios**.\n' +
      '4. Elige:\n\n' +
      '- Si nunca se ha pagado: Skip pregunta “¿Eliminar Renta?” con “Esto no se puede deshacer.” Toca **Eliminar**.\n' +
      '- Si ya se pagó antes: **Conservar los cargos anteriores** la detiene hoy y conserva su historial. **Eliminar todo** la elimina junto con todos sus pagos anteriores.\n\n' +
      'Verás **Factura detenida** o **Factura eliminada**. Una factura detenida tiene **Eliminar factura** al final de su propia página.',
    keywords: ['eliminar', 'quitar', 'borrar'],
  },
  {
    id: 'subscriptions.delete.how',
    title: '¿Cómo elimino una suscripción?',
    questions: [
      '¿Cómo elimino una suscripción?',
      'eliminar suscripción',
      'quitar netflix de skip',
      'cómo me deshago de una suscripción',
      'eliminar una suscripción que agregué dos veces',
      'suscripción eliminada',
      'borrar una suscripción',
      'dónde está eliminar suscripción',
      'quitar de la lista una suscripción cancelada',
      'sacar una suscripción de la app',
    ],
    answer:
      '1. Ábrela desde **Suscripciones**.\n' +
      '2. Toca el lápiz.\n' +
      '3. Toca **Eliminar suscripción**, debajo de **Guardar cambios**.\n' +
      '4. Elige:\n\n' +
      '- Si nunca se ha cobrado: toca **Eliminar** (“Esto no se puede deshacer.”).\n' +
      '- Si ya se cobró antes: **Conservar los cargos anteriores** la cancela y conserva su historial. **Eliminar todo** la elimina con todos sus pagos anteriores y su recordatorio.\n\n' +
      'Verás **Suscripción cancelada** o **Suscripción eliminada**. Para eliminar una que ya está cancelada, ábrela y toca **Eliminar suscripción** al final de su página, y luego **Eliminar todo** (o **Eliminar** si nunca se cobró).',
    keywords: ['eliminar suscripción', 'quitar suscripción', 'borrar'],
  },
  {
    id: 'bills.delete.choices',
    title: '¿Conservar los cargos anteriores o Eliminar todo?',
    questions: [
      '¿Conservar los cargos anteriores o Eliminar todo?',
      'qué hace conservar los cargos anteriores',
      'qué hace eliminar todo',
      'si elimino una factura desaparece mi historial',
      'eliminar una suscripción cambia mi saldo',
      'al eliminar pregunta si conservar en el historial o quitar',
      'no se registra nada después de hoy qué significa',
      'cuál elijo al eliminar',
      'eliminar todo cambia los meses pasados',
      'eliminar la factura pero conservar el historial',
      'se puede deshacer eliminar todo',
      'si elimino una factura que ya se pagó, se quedan los pagos viejos',
      'si borro una factura qué pasa con los pagos que ya hice',
      'al eliminar una factura con pagos anteriores, esos pagos se quedan en mi historial',
    ],
    answer:
      'Cuando eliminas una factura o suscripción que ya se pagó antes, Skip te dice cuántos pagos anteriores tiene y pregunta qué hacer con ellos. En cualquier caso, no se registra nada después de hoy.\n\n' +
      '- **Conservar los cargos anteriores**: se detiene hoy. Los pagos anteriores se quedan en tu historial, tus saldos y **Historial de pagos**. Una factura pasa a **Detenidas**, una suscripción a **Canceladas**. En una factura, un pago que vence hoy sí cuenta.\n' +
      '- **Eliminar todo**: se elimina con todos sus pagos anteriores y su recordatorio. Los meses pasados, los saldos de las tarjetas y tu **Saldo actual** cambian como si nunca hubiera existido. Esto no se puede deshacer.\n' +
      '- **Cancelar**: no cambia nada.\n\n' +
      'Si solo dejaste de pagarla, **Conservar los cargos anteriores** es la opción segura.',
    keywords: ['conservar los cargos anteriores', 'eliminar todo', 'eliminar', 'historial'],
  },
  {
    id: 'bills.stop.how',
    title: '¿Cómo detengo una factura sin perder su historial?',
    questions: [
      '¿Cómo detengo una factura sin perder su historial?',
      'ya no pago esta factura',
      'detener una factura',
      'terminar una factura',
      'me mudé, cómo detengo mi renta',
      'mi préstamo o contrato terminó, detén la factura',
      'cómo terminar una factura sin eliminarla',
      'factura detenida',
      'archivar una factura',
      'ocultar una factura que ya no pago',
      'dejar de llevar una factura',
    ],
    answer:
      'Detenerla termina la factura hoy y conserva todos los pagos anteriores:\n\n' +
      '1. Abre la factura y toca el lápiz.\n' +
      '2. Toca **Eliminar factura**.\n' +
      '3. Toca **Conservar los cargos anteriores**.\n\n' +
      'Verás **Factura detenida**. Pasa a la sección **Detenidas** al final de **Facturas mensuales**, con la fecha en que se detuvo. Después de hoy no se cuenta ni se recuerda nada.\n\n' +
      'Si la factura nunca se ha pagado, no hay historial que conservar, así que Skip solo ofrece eliminarla. No hay forma de ocultar una factura activa.',
    keywords: ['detener', 'terminar', 'archivar', 'ya no pago'],
  },
  {
    id: 'bills.stopped.what',
    title: '¿Qué significa Detenida en una factura?',
    questions: [
      '¿Qué significa Detenida en una factura?',
      'qué es la sección de detenidas',
      'qué significa Detenida el',
      'por qué mi factura está en detenidas',
      'por qué no puedo editar una factura detenida',
      'mi factura no tiene lápiz',
      'mi factura pasó a detenidas sola',
      'liquidado el en facturas',
      'una factura detenida todavía cuenta',
      'por qué una factura detenida está en el total de este mes',
    ],
    answer:
      'Una factura detenida ya no corre: no se cuenta nada nuevo ni se envían recordatorios. Sus pagos anteriores se quedan en tu historial.\n\n' +
      'Una factura se detiene cuando eliges **Conservar los cargos anteriores** al eliminarla, o cuando una factura de **Periodo específico** llega a su día de **Hasta**. Un préstamo que ya se liquidó muestra **Liquidado el** y la fecha.\n\n' +
      'Las facturas detenidas están al final de **Facturas mensuales**, las más recientes primero. Solo suman a la cifra de un mes si se pagaron en ese mes antes de detenerse.\n\n' +
      'Detenida es definitivo. Su página no tiene lápiz, solo **Eliminar factura** al final.',
    keywords: ['detenida', 'detenidas', 'liquidado', 'definitivo'],
  },
  {
    id: 'bills.stopped.restart',
    title: '¿Puedo reactivar una factura o suscripción detenida?',
    questions: [
      '¿Puedo reactivar una factura o suscripción detenida?',
      'deshacer detener factura',
      'reactivar una suscripción cancelada',
      'me volví a suscribir a netflix',
      'recuperar una factura eliminada',
      'detuve la factura equivocada',
      'cómo hago que una suscripción cancelada vuelva a estar activa',
      'restaurar una suscripción eliminada',
      'volver a activar una factura detenida',
      'volví a pagar',
      'deshacer eliminar',
    ],
    answer:
      'No. Las facturas detenidas y las suscripciones canceladas son definitivas, y las eliminadas no se pueden recuperar.\n\n' +
      'Para volver a pagarla, agrégala como nueva con **Agregar rápido → Factura** o **Suscripción**. La anterior conserva su historial en **Detenidas** o **Canceladas**, y la nueva empieza de cero.\n\n' +
      'Consejo: en la fecha, elige la próxima en que vence. Una fecha pasada registra pagos que quizá no hiciste.',
    keywords: ['reactivar', 'deshacer', 'volver a suscribirme', 'restaurar'],
  },
  {
    id: 'bills.stopped.delete',
    title: '¿Cómo quito de la lista una factura detenida?',
    questions: [
      '¿Cómo quito de la lista una factura detenida?',
      'eliminar una factura detenida',
      'quitar la sección de detenidas',
      'borrar facturas viejas de detenidas',
      'limpiar las suscripciones canceladas',
      'eliminar en una factura detenida solo ofrece eliminar todo',
      'facturas detenidas estorbando mi página',
      'puedo ocultar las facturas detenidas pero conservar el historial',
      'eliminar factura al final de una factura detenida',
      'quitar canceladas de la página de suscripciones',
    ],
    answer:
      'Ábrela desde **Detenidas** (o **Canceladas**) y toca **Eliminar factura** (o **Eliminar suscripción**) al final de su página.\n\n' +
      'Si se pagó antes, Skip vuelve a preguntar. **Eliminar todo** la elimina con todos sus pagos anteriores, así que los meses pasados y los saldos cambian. **Conservar los cargos anteriores** la deja exactamente como está.\n\n' +
      'No hay forma de ocultarla de la lista y conservar su historial.',
    keywords: ['detenidas', 'canceladas', 'quitar', 'limpiar'],
  },
  {
    id: 'subscriptions.cancel.how',
    title: '¿Cómo cancelo una suscripción en Skip?',
    questions: [
      '¿Cómo cancelo una suscripción en Skip?',
      'cancelar suscripcion de spotfy',
      'cancelé netflix, cómo actualizo skip',
      'marcar suscripción como cancelada',
      'qué hace la fila Estado',
      'estado activa o cancelada',
      'detener una suscripción',
      'mensaje suscripción cancelada',
      'me di de baja de spotify',
      'terminar mi membresía del gimnasio en la app',
      'cómo dejo de llevar una suscripción',
      'dejé una suscripción, cómo lo actualizo en skip',
      'dejé de pagar spotify, cómo lo muestro en skip',
      'quitar una suscripción que ya no pago pero conservar su historial',
    ],
    answer:
      'Hay dos formas, y las dos conservan sus pagos anteriores:\n\n' +
      '- Ábrela, toca el lápiz, pon **Estado** en **Cancelada** y toca **Guardar cambios**.\n' +
      '- O, si ya se cobró antes, toca el lápiz, luego **Eliminar suscripción** y luego **Conservar los cargos anteriores**.\n\n' +
      'Verás **Suscripción cancelada**. Pasa a la sección **Canceladas** al final de **Suscripciones**, y dice “Cancelada · último cargo el” y la fecha. No se cuenta nada nuevo y no llegan recordatorios.\n\n' +
      'Esto solo deja de llevarla en Skip. Para que dejen de cobrarte, cancela también con la empresa.',
    keywords: ['cancelar', 'estado', 'cancelada', 'darme de baja'],
  },
  {
    id: 'subscriptions.cancelled.what',
    title: '¿Qué significa Cancelada en una suscripción?',
    questions: [
      '¿Qué significa Cancelada en una suscripción?',
      'qué significa cancelada último cargo',
      'qué es la sección de canceladas',
      'por qué mi suscripción está en gris',
      'una suscripción cancelada todavía cuenta',
      'por qué una suscripción cancelada está en el total de este mes',
      'la suscripción cancelada no tiene botón de editar',
      'fecha del último cargo',
      'mi suscripción dice cancelada',
      'a dónde van las suscripciones canceladas',
    ],
    answer:
      'Una suscripción cancelada no cuenta nada nuevo y no envía recordatorios. Sus pagos anteriores se quedan en tu historial y tus saldos.\n\n' +
      '- Está en la sección **Canceladas** al final de **Suscripciones**, con “Cancelada · último cargo el” y la fecha de su último pago.\n' +
      '- Su página dice lo mismo debajo del precio, no tiene lápiz y tiene **Eliminar suscripción** al final.\n' +
      '- Solo suma a la cifra de un mes si se cobró en ese mes antes de que la cancelaras.\n\n' +
      'Cancelada es definitivo. Para empezarla de nuevo, agrégala como una suscripción nueva.',
    keywords: ['cancelada', 'canceladas', 'último cargo', 'inactiva'],
  },
  {
    id: 'subscriptions.pause',
    title: '¿Puedo pausar una suscripción?',
    questions: [
      '¿Puedo pausar una suscripción?',
      'pausar suscripción',
      'pausé mi gimnasio dos meses',
      'saltarme un mes de mi suscripción',
      'congelar una suscripción',
      'mi suscripción está en pausa',
      'detener netflix por un tiempo',
      'puedo mover la fecha de renovación para saltar meses',
      'suscripción pausada por la empresa',
      'poner en espera una suscripción',
    ],
    answer:
      'No hay pausa. Si la pausaste con la empresa:\n\n1. Cancélala en Skip: lápiz → **Estado** → **Cancelada** → **Guardar cambios**. Sus pagos anteriores se quedan.\n2. Cuando vuelva a empezar, agrégala como una suscripción nueva con su próxima fecha de renovación.\n\nMover **Próxima renovación** más adelante no salta los meses intermedios, así que cancelarla es la forma de que deje de contar. Para pedir una opción de pausa, usa **Ajustes → Soporte y comentarios → Comparte una idea**.',
    keywords: ['pausar', 'pausa', 'congelar', 'saltar un mes'],
  },

  // ---------------------------------------------------------------------------------------------
  // Paid, late, one payment, dates
  // ---------------------------------------------------------------------------------------------
  {
    id: 'bills.paid.how-marked',
    title: '¿Cómo sabe Skip que mi factura está pagada?',
    questions: [
      '¿Cómo sabe Skip que mi factura está pagada?',
      'cómo marco una factura como pagada',
      'por qué dice pagado si todavía no he pagado',
      'mi factura dice pagado pero no ha salido de mi banco',
      'hay un botón de pagado',
      'skip sabe cuando pasa mi pago automático',
      'por qué una factura que vence hoy ya dice pagado',
      'marcar como no pagado',
      'dónde está pagado con retraso',
      'cómo registra los pagos de mis facturas',
      'mi factura aparece pagada sola',
      'cuándo cuenta una factura como pagada',
      'por qué actividad muestra facturas que no he pagado',
    ],
    answer:
      'Skip no está conectado a tu banco, así que no puede ver el pago. En cambio, registra cada factura como pagada en su fecha de vencimiento, con el importe y la tarjeta que tenía la factura ese día.\n\n' +
      '- Una factura que vence hoy ya cuenta como **Pagado**.\n' +
      '- Todo pago anterior dice **Pagado**. Skip no lleva el registro de pagos atrasados.\n' +
      '- No hay botón para marcar una factura como pagada o sin pagar.\n' +
      '- Recibes una notificación “went out” (salió) cuando se registra.\n\n' +
      'Por eso tu **Saldo actual** baja en la fecha de vencimiento. Si una factura de verdad sale otro día, cambia su fecha con el lápiz en su página.',
    keywords: ['pagado', 'marcar como pagada', 'pago automático', 'no pagado'],
  },
  {
    id: 'bills.paid.one-payment',
    title: '¿Puedo cambiar o quitar un solo pago?',
    questions: [
      '¿Puedo cambiar o quitar un solo pago?',
      'pagué mi factura tarde este mes',
      'pagué antes, cómo lo cambio',
      'me salté un mes, cómo quito ese pago',
      'eliminar un solo pago de una factura',
      'el mes pasado fue de otro importe',
      'editar un solo cargo',
      'un pago está mal',
      'quitar un cargo del historial',
      'no pagué la renta en agosto pero aparece pagada',
      'cambiar la fecha de un solo pago',
    ],
    answer:
      'Uno solo no. Cada pago anterior se conserva tal como se registró, así que no puedes mover, eliminar ni cambiar un solo mes.\n\n' +
      'Lo que sí puedes hacer:\n\n' +
      '- **Otra fecha de ahora en adelante**: cambia **Fecha de pago** con el lápiz.\n' +
      '- **Nuevo importe de ahora en adelante**: cambia el importe y elige **Solo los próximos**.\n' +
      '- **Todos los pagos anteriores estaban mal**: cámbialo y elige **Anteriores y próximos**.\n' +
      '- **Ya no la vas a pagar**: detenla con **Conservar los cargos anteriores**.\n' +
      '- **Nada de eso debió contarse**: elimínala con **Eliminar todo**.\n\n' +
      'Si quieres editar pagos individuales, cuéntanoslo en **Ajustes → Soporte y comentarios → Comparte una idea**.',
    keywords: ['un solo pago', 'un cargo', 'mes saltado', 'tarde'],
  },
  {
    id: 'bills.dates.past',
    title: '¿Qué pasa si elijo una fecha pasada?',
    questions: [
      '¿Qué pasa si elijo una fecha pasada?',
      'agregué mi renta con una fecha de hace meses',
      'skip registró pagos de antes de que lo usara',
      'por qué hay pagos viejos en una factura que acabo de agregar',
      'mi factura nueva ya tiene tres pagos',
      'poner una fecha anterior a una factura',
      'fecha pasada en una suscripción',
      'mi saldo bajó mucho después de agregar una factura',
      'la fecha de inicio equivocada llenó meses viejos',
      'puedo agregar facturas de más temprano este año',
      'cómo quito los pagos de antes de agregar la factura',
    ],
    answer:
      'Skip trata cada pago desde esa fecha hasta hoy como ya pagado, y registra cada uno.\n\n' +
      'Ejemplo: el 13 de octubre agregas una renta mensual de $1,000 con **Fecha de pago** el 1 de agosto. Skip registra el 1 de agosto, el 1 de septiembre y el 1 de octubre, así que $3,000 cuentan como gastados, y el siguiente vence el 1 de noviembre.\n\n' +
      'Esos pagos bajan tu **Saldo actual**, salvo que sean de antes del día en que ingresaste el saldo de tu tarjeta o cuenta. La **Próxima renovación** de una suscripción funciona igual.\n\n' +
      'Si solo quieres que Skip cuente desde ahora, elige la próxima fecha en que vence. ¿La agregaste con la fecha pasada equivocada? Elimínala con **Eliminar todo** y agrégala de nuevo. Cambiar la fecha después no quita los pagos ya registrados.',
    keywords: ['fecha pasada', 'pagos viejos', 'fecha anterior', 'retroactivo'],
  },
  {
    id: 'bills.dates.month-end',
    title: '¿Y si una factura vence el 29, 30 o 31?',
    questions: [
      '¿Y si una factura vence el 29, 30 o 31?',
      'mi renta vence el 31, qué pasa en febrero',
      'factura que vence el último día del mes',
      'qué pasa en los meses de 30 días',
      'año bisiesto factura 29 de febrero',
      'mi factura pasó del 31 al 30',
      'por qué mi fecha de vencimiento ahora es el 28',
      'factura de fin de mes',
      'fecha de vencimiento en un mes corto',
      'factura anual el 29 de febrero',
    ],
    answer:
      'En un mes sin ese día, Skip usa el último día del mes y vuelve a tu día al mes siguiente. Una factura que vence el 31 se cuenta el 31 de marzo, el 30 de abril y el 31 de mayo, y el 28 de febrero (29 de febrero en un año bisiesto). Una factura anual del 29 de febrero se cuenta el 28 de febrero en los demás años y otra vez el 29 en un año bisiesto. Las suscripciones, los pagos de préstamos y las facturas **Cada 3 meses** funcionan igual.\n\nPor eso **Próximo vencimiento** puede mostrar el 30 o el 28 en un mes corto; al mes siguiente vuelve a tu día. Si cambias **Fecha de pago** a otra fecha, ese es el día que Skip conserva desde entonces.\n\nConsejo: una fecha del 1 al 28 nunca se mueve.',
    keywords: ['día 31', 'fin de mes', 'febrero', 'año bisiesto'],
  },
  {
    id: 'bills.dates.weekend',
    title: '¿Skip mueve una factura que vence en fin de semana?',
    questions: [
      '¿Skip mueve una factura que vence en fin de semana?',
      'mi factura vence un domingo',
      'fecha de factura en día festivo',
      'mi banco cobra al siguiente día hábil',
      'vencimiento en fin de semana',
      'skip sabe qué días son feriados',
      'la factura salió el lunes pero skip dice sábado',
      'días hábiles para facturas',
      'fecha de pago en día festivo',
      'se mueve mi factura si cae en sábado',
    ],
    answer:
      'No. Skip cuenta cada factura en la fecha exacta en que está puesta, con fines de semana y días festivos incluidos. No conoce los días hábiles de tu banco.\n\nSi tu factura suele salir otro día, pon **Fecha de pago** en ese día. Skip repite la fecha que elijas.',
    keywords: ['fin de semana', 'feriado', 'día hábil', 'sábado'],
  },
  {
    id: 'bills.schedule.odd',
    title: '¿Y si mi factura es cada 2 meses o dos veces al mes?',
    questions: [
      '¿Y si mi factura es cada 2 meses o dos veces al mes?',
      'mi factura del agua es cada dos meses',
      'factura bimestral',
      'factura quincenal cada 2 semanas',
      'pago dos veces al mes el 1 y el 15',
      'seguro cada 6 meses',
      'pago catorcenal',
      'mi factura es irregular',
      'factura semestral',
      'hay opción cada dos semanas',
      'repetición personalizada para una factura',
      'mi factura llega dos veces al mes, qué opción de repetición uso',
      'una factura que llega dos veces por mes',
      'no hay opción dos veces al mes, qué hago',
    ],
    answer:
      'Skip repite las facturas **Semanal**, **Mensual**, **Cada 3 meses** o **Anual**. Para otros patrones:\n\n' +
      '- **Dos veces al mes** (como el 1 y el 15): agrega dos facturas **Mensual**, una para cada fecha.\n' +
      '- **Cada 2 semanas**: agrégala como **Semanal** con la mitad del importe. Los totales salen iguales, aunque las fechas no coincidirán exactamente.\n' +
      '- **Cada 2 meses**: agrega seis facturas **Anual**, una para cada mes en que vence, así todas las fechas son exactas. O agrega una factura **Mensual** con la mitad del importe.\n' +
      '- **Cada 6 meses**: agrega dos facturas **Anual**.\n' +
      '- **Sin ningún patrón**: agrega cada una como recibo cuando la pagues.\n\n' +
      'Para pedir más calendarios, usa **Ajustes → Soporte y comentarios → Comparte una idea**.',
    keywords: ['cada 2 meses', 'bimestral', 'quincenal', 'dos veces al mes'],
  },

  // ---------------------------------------------------------------------------------------------
  // Monthly bills and Subscriptions pages
  // ---------------------------------------------------------------------------------------------
  {
    id: 'bills.month.page',
    title: '¿Qué hay en la página Facturas mensuales?',
    questions: [
      '¿Qué hay en la página Facturas mensuales?',
      'explícame la pantalla de facturas mensuales',
      'qué es la tarjeta morada de facturas mensuales',
      'secciones de la página de facturas mensuales',
      'qué muestra la tarjeta color ciruela',
      'cómo leo la página de facturas mensuales',
      'qué es ver historial de pagos',
      'para qué sirve la lupa en facturas mensuales',
      'para qué sirve el más en facturas mensuales',
      'cómo actualizo mis facturas',
      'hay un calendario de mis facturas',
      'facturas mensuales se reinicia el día 1',
      'qué dice a pagar en octubre arriba de la página de facturas',
      'qué números muestra la tarjeta de arriba en facturas',
    ],
    answer:
      '**Facturas mensuales** muestra un mes a la vez, empezando por el actual:\n\n' +
      '- La tarjeta morada: **A pagar en octubre**, el total, cuántas facturas están pagadas y cuántas por pagar, y **Próximo:** con la siguiente.\n' +
      '- **Próximos**: cada pago que falta ese mes, el más cercano primero, con una etiqueta como **Mañana** o **en 12 días**.\n' +
      '- **Todas las facturas**: todas las facturas activas, su importe del mes y **Pagado** o su próxima fecha.\n' +
      '- **Detenidas**: las facturas que detuviste.\n' +
      '- **Ver historial de pagos**: todo lo que ya se pagó.\n\n' +
      'Arriba están la búsqueda y el **+** para agregar una factura. Toca el botón del mes en la tarjeta, como **oct 2026**, para ver otro mes. El día 1, la página pasa sola al mes nuevo. Desliza hacia abajo para actualizar. No hay vista de calendario: **Próximos** y el botón del mes son lo más parecido.',
    keywords: ['facturas mensuales', 'tarjeta morada', 'próximos', 'todas las facturas'],
  },
  {
    id: 'subscriptions.page',
    title: '¿Qué hay en la página Suscripciones?',
    questions: [
      '¿Qué hay en la página Suscripciones?',
      'explícame la pantalla de suscripciones',
      'qué es la tarjeta de arriba en suscripciones',
      'secciones de la página de suscripciones',
      'qué es todas las suscripciones',
      'qué significa la sección canceladas en suscripciones',
      'cómo veo las suscripciones del mes que viene',
      'qué significa próximo en la tarjeta de suscripciones',
      'lista de suscripciones próximas',
      'qué significa 2 suscripciones pagadas 1 por pagar 1',
      'cómo está organizada la página de suscripciones',
      'qué secciones tiene la pantalla de suscripciones',
      'guíame por la página de suscripciones',
    ],
    answer:
      '**Suscripciones** muestra un mes a la vez, empezando por el actual:\n\n' +
      '- La tarjeta morada: **A pagar en octubre**, el total, una línea como “4 suscripciones · pagadas: 2 · por pagar: 2” y **Próximo:** con la siguiente renovación.\n' +
      '- **Próximos**: cada renovación que falta ese mes, con **Mañana** o **en 5 días**.\n' +
      '- **Todas las suscripciones**: cada suscripción activa, con su ciclo, tarjeta, importe y **Pagado** o su próxima fecha.\n' +
      '- **Canceladas**: las que cancelaste, con la fecha de su último cargo.\n' +
      '- **Ver historial de pagos**: todas las renovaciones ya pagadas.\n\n' +
      'Toca el botón del mes (como **oct 2026**) para ver otro mes, el botón de búsqueda para encontrar un pago, o **+** para agregar una.',
    keywords: [
      'página de suscripciones',
      'tarjeta morada',
      'todas las suscripciones',
      'canceladas',
    ],
  },
  {
    id: 'bills.month.due-figure',
    title: '¿Cómo se calcula la cifra de A pagar en el mes?',
    questions: [
      '¿Cómo se calcula la cifra de A pagar en el mes?',
      'qué significa a pagar en octubre',
      'cómo se calcula el total de facturas mensuales',
      'por qué el total de mis facturas mensuales es tan alto',
      'a pagar en este mes incluye facturas ya pagadas',
      'mi factura semanal se cuenta 5 veces este mes',
      'por qué mi factura anual no está en el total',
      'por qué subió el total este mes',
      'el total de facturas mensuales está mal',
      'cuánto son mis facturas este mes',
      'total a pagar del mes',
      'de dónde sale el número grande de facturas mensuales',
    ],
    answer:
      'Suma todas las fechas en que vencen tus facturas en ese mes, pagadas o no.\n\n' +
      '- Una factura mensual cuenta una vez, una semanal 4 o 5 veces, y una anual solo en su mes.\n' +
      '- Los pagos ya hechos usan el importe que tenían entonces. Los que faltan usan el importe de hoy.\n' +
      '- Una factura detenida durante el mes cuenta lo que pagó antes de detenerse.\n' +
      '- Los préstamos agregados a las facturas mensuales cuentan. Los pagos extra a un préstamo tienen su propia línea.\n\n' +
      'Ejemplo, el 13 de octubre: renta de $1,000 el día 1, internet de $60 el 25 y $25 de limpieza cada lunes (4 lunes). **A pagar en octubre** es $1,000 + $60 + $100 = $1,160.00. Un seguro anual de $600 que vence en marzo no cuenta hasta marzo.\n\n' +
      'Se actualiza en cuanto agregas o cambias una factura.',
    keywords: ['a pagar en', 'total', 'total mensual', 'número grande'],
  },
  {
    id: 'subscriptions.month.figure',
    title: '¿Cuánto cuestan mis suscripciones al mes?',
    questions: [
      '¿Cuánto cuestan mis suscripciones al mes?',
      'total de todas mis suscripciones',
      'por qué mi suscripción anual no sale en este mes',
      'costo mensual de las suscripciones',
      'el total de suscripciones se ve muy bajo',
      'por qué subieron las suscripciones este mes',
      'skip promedia las suscripciones anuales por mes',
      'cuánto gasto en suscripciones',
      'mi plan anual aparece completo en un solo mes',
      'total de suscripciones a pagar este mes',
      'cuál es mi gasto mensual total en suscripciones',
      'a cuánto llegan mis suscripciones cada mes',
      'cómo se calcula el total mensual de suscripciones',
      'en cuánto suman mis suscripciones en un mes',
    ],
    answer:
      'La tarjeta morada de **Suscripciones** muestra lo que vence en ese mes, con las fechas reales de cada una. No es un promedio.\n\n' +
      '- Las mensuales cuentan una vez, las semanales 4 o 5 veces.\n' +
      '- Las trimestrales y anuales cuentan solo en los meses en que se renuevan. Un plan anual de $120 suma $120 a su mes y nada a los demás.\n' +
      '- Las renovaciones ya cobradas usan el precio que tenían entonces. Las que faltan usan el precio de hoy.\n\n' +
      'Ejemplo: Netflix de $15 el día 5 y Spotify de $12 el 20 hacen que **A pagar en octubre** sea $27.00.\n\n' +
      'Toca el botón del mes para ver otros meses, o **Ver historial de pagos** para ver lo que pagaste en un año.',
    keywords: ['costo de suscripciones', 'costo mensual', 'total', 'anual'],
  },
  {
    id: 'bills.month.counts',
    title: '¿Qué significa 3 facturas · pagadas: 1 · por pagar: 2?',
    questions: [
      '¿Qué significa 3 facturas · pagadas: 1 · por pagar: 2?',
      'qué significa la cuenta de pagadas en facturas mensuales',
      'por qué dice pagadas: 0',
      'mi factura semanal sigue en por pagar',
      'dice nada que pagar en noviembre',
      'por qué todas las facturas están pagadas el mes pasado',
      'números de la tarjeta morada',
      'por qué el mes que viene muestra todo por pagar',
      'números de facturas pagadas y por pagar',
      'por qué dice nada que pagar',
    ],
    answer:
      'Cuenta facturas, no pagos, del mes que muestra la tarjeta:\n\n' +
      '- **facturas**: cuántas tienen una fecha en ese mes.\n' +
      '- **pagadas**: a cuántas ya les salieron todas las fechas del mes. Hoy cuenta como pagado.\n' +
      '- **por pagar**: a cuántas todavía les falta una fecha.\n\n' +
      'Pagadas más por pagar siempre es igual al número de facturas. Una factura semanal que vence 4 veces es una sola factura, y sigue en por pagar hasta su última fecha del mes.\n\n' +
      'En un mes pasado todo está pagado, y en un mes futuro todo está por pagar. Si no vence nada, la tarjeta dice “Nada que pagar en noviembre” (con el nombre de ese mes).',
    keywords: ['pagadas', 'por pagar', 'cuenta', 'nada que pagar'],
  },
  {
    id: 'bills.month.coming-up',
    title: '¿Qué es la lista de Próximos?',
    questions: [
      '¿Qué es la lista de Próximos?',
      'qué significa en 12 días',
      'sección próximos',
      'por qué mi factura no está en próximos',
      'mi factura que vence hoy no está en próximos',
      'qué significa mañana en la factura',
      'por qué no aparece próximos en el mes pasado',
      'la línea de próximo en la tarjeta',
      'qué son las etiquetas en próximos',
      'por qué mi suscripción no está en próximos',
      'qué facturas vencen esta semana',
    ],
    answer:
      '**Próximos** lista cada pago que falta en el mes que estás viendo, el más cercano primero. Cada fila tiene el nombre, la fecha y la tarjeta, el importe y una etiqueta: **Mañana**, o **en 5 días** y así.\n\n' +
      '- Este mes: desde mañana en adelante, porque una factura que vence hoy ya cuenta como pagada.\n' +
      '- Un mes futuro: todos los pagos de ese mes.\n' +
      '- Un mes pasado: la sección se oculta.\n\n' +
      '¿No está? Quizá vence hoy (entonces está **Pagado**), vence en otro mes (revisa **Todas las facturas**) o está detenida. La línea **Próximo:** de la tarjeta morada nombra la primera. Toca una fila para abrirla.',
    keywords: ['próximos', 'en días', 'mañana', 'etiqueta'],
  },
  {
    id: 'bills.month.all-bills',
    title: '¿Qué muestra la lista de Todas las facturas?',
    questions: [
      '¿Qué muestra la lista de Todas las facturas?',
      'qué significa próximo 25 oct',
      'qué es la palomita verde de pagado',
      'por qué una factura muestra una fecha del año que viene',
      'puedo reordenar mis facturas',
      'en qué orden están mis facturas',
      'por qué el importe en todas las facturas es mayor que la factura',
      'qué significa termina junto a mi factura',
      'explicación de la lista de todas las suscripciones',
      'ordenar facturas por importe',
      'por qué mi factura sale con fecha de 2027',
    ],
    answer:
      '**Todas las facturas** (o **Todas las suscripciones**) lista todas las activas, con cuántas hay junto al título. Cada fila muestra:\n\n' +
      '- Cada cuánto se repite y su tarjeta, o un enlace **Agregar una tarjeta**.\n' +
      '- Su importe del mes: todas sus fechas sumadas (una factura semanal puede mostrar el valor de 4 o 5 pagos), o un pago si no vence ese mes.\n' +
      '- **Pagado** con una palomita verde cuando ya salieron todas las fechas del mes, **Próximo: 25 oct** cuando todavía falta una, **Próximo: 1 mar 2027** cuando su próxima fecha es en un mes posterior, o **Termina** y una fecha en una factura de periodo.\n\n' +
      'Las que vencen en el mes van primero, por fecha, y luego las demás por su próxima fecha. No puedes reordenarlas. Toca una fila para abrirla.',
    keywords: ['todas las facturas', 'todas las suscripciones', 'orden', 'palomita verde'],
  },
  {
    id: 'bills.month.add-card',
    title: '¿Qué significa Agregar una tarjeta o Sin tarjeta?',
    questions: [
      '¿Qué significa Agregar una tarjeta o Sin tarjeta?',
      'por qué mi factura dice agregar una tarjeta',
      'sin tarjeta en mi pago',
      'qué es el enlace morado de agregar una tarjeta',
      'mi factura no tiene tarjeta',
      'el historial de pagos dice sin tarjeta',
      'mi suscripción muestra agregar una tarjeta',
      'sin forma de pago en una factura',
      'cómo ligo una tarjeta a mi factura',
      'por qué no hay tarjeta junto a mi factura',
    ],
    answer:
      'Significa que la factura no está ligada a una tarjeta o cuenta. Su **Se paga con** está en **Skip**, o se eliminó la tarjeta que usaba.\n\n' +
      '- En **Facturas mensuales** o **Suscripciones**, toca **Agregar una tarjeta** en la fila. Se abre la página de edición: elige una tarjeta o cuenta y toca **Guardar cambios**.\n' +
      '- Sus pagos en **Próximos**, **Historial de pagos** y la búsqueda dicen **Sin tarjeta**.\n\n' +
      'Igual cuenta en tus gastos y en tu **Saldo actual**. Simplemente no cambia el saldo de ninguna tarjeta ni cuenta.',
    keywords: ['agregar una tarjeta', 'sin tarjeta', 'sin forma de pago', 'ligar tarjeta'],
  },
  {
    id: 'bills.month.other-months',
    title: '¿Cómo veo las facturas de otro mes?',
    questions: [
      '¿Cómo veo las facturas de otro mes?',
      'ver las facturas del mes que viene',
      'mirar las facturas del mes pasado',
      'elegir mes',
      'hasta cuándo puedo ver mis facturas hacia adelante',
      'hasta cuándo puedo ver mis facturas hacia atrás',
      'por qué no puedo elegir un mes más viejo',
      'ver meses anteriores de facturas con pro',
      'cambiar de mes en facturas mensuales',
      'cuánto voy a pagar en diciembre',
      'el botón del mes',
    ],
    answer:
      'Toca el botón del mes en la tarjeta morada, como **oct 2026**. Se abre **Elige el mes** con **Este mes** primero, luego **Próximos meses** (hasta 12 adelante) y después los meses pasados por año. Toca uno y la página lo muestra.\n\n' +
      'Los meses pasados muestran lo que se pagó. Los meses futuros muestran lo que viene, con los importes de hoy. La próxima vez que abras la página, vuelve a empezar en este mes.\n\n' +
      'En el plan gratis, los meses pasados llegan hasta tus últimos 90 días, y la lista termina con **Consulta los meses anteriores con Pro**. Con Pro puedes ir 7 años atrás: este año y los seis anteriores.',
    keywords: ['elige el mes', 'botón del mes', 'mes que viene', 'meses anteriores'],
  },
  {
    id: 'bills.month.extra',
    title: '¿Qué significa “de pago extra” en Préstamo del auto?',
    questions: [
      '¿Qué significa “de pago extra” en Préstamo del auto?',
      'línea de pago extra de un préstamo en facturas mensuales',
      'qué significa en total en la tarjeta de facturas',
      'por qué hay un importe extra debajo de a pagar en',
      'pago extra en facturas mensuales',
      'facturas mensuales y el recuadro de inicio no coinciden',
      'pagué una parte de mi préstamo y facturas mensuales cambió',
      'qué es liquidado en el historial de pagos',
      'qué significa pago extra en el historial',
      'pago anticipado de un préstamo en la página de facturas',
    ],
    answer:
      'Esa línea aparece cuando pagaste de más a un préstamo ese mes, con **Pagar** en el préstamo. Los pagos extra no son vencimientos, así que no entran en **A pagar en octubre**. La línea muestra cuánto, en qué préstamo, y el total con él, como “+ $1,000.00 de pago extra a Préstamo del auto · $2,884.00 en total”.\n\n' +
      'La cifra “en total” coincide con el recuadro **Facturas mensuales** en **Inicio**. En **Historial de pagos** estos aparecen como **Liquidado** (el préstamo completo) o **Pago extra** (una parte).',
    keywords: ['pago extra', 'en total', 'liquidado', 'préstamo'],
  },
  {
    id: 'bills.missing.disappeared',
    title: 'Mi factura desapareció de Facturas mensuales',
    questions: [
      'Mi factura desapareció de Facturas mensuales',
      'a dónde se fue mi factura',
      'falta una factura en la lista',
      'mi suscripción desapareció',
      'mi factura ya no está en el total',
      'no veo mi factura del seguro este mes',
      'la factura se fue después de editarla',
      'mi préstamo ya no está en las facturas',
      'falta una suscripción en la página de suscripciones',
      'perdí una factura',
      'mi factura estaba el mes pasado y ahora no está',
      'la factura que estaba el mes pasado ya no aparece',
      'dónde quedó la factura que tenía el mes pasado',
      'una factura que tenía antes ya no sale en facturas mensuales',
    ],
    answer:
      'Revisa esto:\n\n' +
      '- No vence este mes. Sigue en **Todas las facturas** con su próxima fecha, pero no en **Próximos** ni en el total.\n' +
      '- Se detuvo. Búscala en **Detenidas**, al final. **Conservar los cargos anteriores** pone ahí una factura, y también una factura de **Periodo específico** que llega a su día de **Hasta**.\n' +
      '- Estás viendo otro mes. El botón de la tarjeta morada indica cuál.\n' +
      '- Es un préstamo con **Agregar a las facturas mensuales** desactivado. Está solo en la página de **Préstamos**.\n' +
      '- Se eliminó con **Eliminar todo**. Eso no se puede deshacer, así que agrégala de nuevo.\n\n' +
      'Si es una suscripción, búscala en **Canceladas**, al final de **Suscripciones**. Desliza hacia abajo en la página para actualizar.',
    keywords: ['desapareció', 'falta', 'perdí', 'no aparece'],
  },
  {
    id: 'bills.loans.in-bills',
    title: '¿Por qué mi préstamo está en Facturas mensuales?',
    questions: [
      '¿Por qué mi préstamo está en Facturas mensuales?',
      'mi préstamo del auto aparece como factura',
      'al tocar mi préstamo en facturas se abre la página del préstamo',
      'cómo edito un préstamo desde facturas',
      'quitar un préstamo de facturas mensuales',
      'puedo agregar un préstamo como factura',
      'dónde está préstamos y crédito',
      'la hipoteca va como factura o como préstamo',
      'interruptor agregar a las facturas mensuales',
      'el pago del préstamo cuenta en facturas',
    ],
    answer:
      'Los préstamos guardados con **Agregar a las facturas mensuales** activado cuentan como facturas. Cada pago mensual aparece en **Facturas mensuales** y en **Historial de pagos**, y cuenta en tus gastos.\n\n' +
      '- Al tocar un préstamo se abre su propia página de préstamo, no la de una factura.\n' +
      '- Cambia o elimina un préstamo desde esa página, no desde **Editar factura**.\n' +
      '- Con **Agregar a las facturas mensuales** desactivado, el préstamo se queda en **Préstamos**, pero sus pagos no aparecen ni cuentan aquí.\n\n' +
      'Los préstamos no se pueden agregar desde **Agregar una factura**. Agrégalos en la página de **Préstamos**.',
    keywords: ['préstamo', 'agregar a las facturas mensuales', 'préstamo del auto', 'hipoteca'],
  },

  // ---------------------------------------------------------------------------------------------
  // Payment history, years, search, export
  // ---------------------------------------------------------------------------------------------
  {
    id: 'bills.history.page',
    title: '¿Qué es el Historial de pagos?',
    questions: [
      '¿Qué es el Historial de pagos?',
      'dónde veo las facturas que ya pagué',
      'página del historial de pagos',
      'ver todos los pagos de facturas anteriores',
      'historial de mis suscripciones',
      'cómo veo lo que pagué el mes pasado',
      'lista de todos los pagos',
      'el historial de pagos muestra facturas futuras',
      'por qué mi próxima factura no está en el historial de pagos',
      'las suscripciones canceladas salen en el historial de pagos',
      'lista de pagos viejos',
    ],
    answer:
      '**Historial de pagos** lista cada pago de facturas y suscripciones que ya salió, un año a la vez. Ábrelo desde **Ver historial de pagos**, al final de **Facturas mensuales** o **Suscripciones**.\n\n' +
      '- El botón del año (**Este año**) elige el año.\n' +
      '- **Todos**, **Facturas** y **Suscripciones** eligen qué se muestra.\n' +
      '- **Buscar pagos** encuentra cualquier pago.\n' +
      '- La tarjeta morada muestra **Pagado en 2026**, **Pagos** y **Prom. / mes**, con una barra por cada mes.\n' +
      '- Abajo están los meses, el más reciente primero, cada uno con su total y todos sus pagos marcados como **Pagado**.\n\n' +
      'Aquí solo están los pagos con fecha de hoy o anterior, nunca los próximos. Se incluyen las facturas detenidas, las suscripciones canceladas y los pagos de préstamos. Toca un pago para abrirlo.',
    keywords: ['historial de pagos', 'pagos anteriores', 'historial', 'pagado'],
  },
  {
    id: 'bills.history.card',
    title: '¿Cómo se calculan Pagado en y Prom. / mes?',
    questions: [
      '¿Cómo se calculan Pagado en y Prom. / mes?',
      'qué es prom. mes en el historial de pagos',
      'cómo se calcula el promedio por mes',
      'qué significa pagado en 2026',
      'qué son las barras del historial de pagos',
      'por qué algunas barras están planas',
      'el promedio se ve mal',
      'cantidad de pagos en el historial',
      'por qué la barra de este mes es blanca',
      'cuánto pagué este año en facturas',
      'total anual de facturas y suscripciones',
    ],
    answer:
      'La tarjeta morada suma todos los pagos del año en la pestaña donde estás (**Todos**, **Facturas** o **Suscripciones**):\n\n' +
      '- **Pagado en 2026**: el total de todos los pagos de ese año, hasta hoy.\n' +
      '- **Pagos**: cuántos fueron.\n' +
      '- **Prom. / mes**: el total dividido entre los meses transcurridos, de enero a este mes en el año actual, o los 12 en un año pasado. Si tu primer pago fue más tarde en ese año, cuenta desde ese mes.\n' +
      '- Las barras son el total de cada mes. Este mes resalta, y los meses que faltan están planos.\n\n' +
      'Ejemplo, el 13 de octubre: $5,000 pagados desde enero dan $500.00 al mes. Si tu primer pago fue en marzo, son $5,000 ÷ 8 = $625.00.\n\n' +
      'En el plan gratis estas cifras siguen contando todos los pagos, incluso los más antiguos que la lista no muestra.',
    keywords: ['promedio', 'prom. / mes', 'pagado en', 'barras'],
  },
  {
    id: 'bills.history.years',
    title: '¿Cómo veo los pagos de otros años?',
    questions: [
      '¿Cómo veo los pagos de otros años?',
      'ver las facturas del año pasado',
      'elegir año',
      'qué es todos los años',
      'qué significa pagado desde',
      'por qué 2025 tiene una insignia pro',
      'qué es la etiqueta pro junto a un año',
      'cuántos años de pagos puedo ver',
      'historial de pagos de 2024',
      'comparar años de facturas',
      'total de todos los años',
    ],
    answer:
      'En **Historial de pagos**, toca el botón del año (**Este año**). **Elige el año** lista **Este año**, todos los años anteriores en que tienes pagos, y **Todos los años**.\n\n' +
      '**Todos los años** abre una página con **Pagado desde** tu primer año (el total, los pagos y los años), y luego una tarjeta por año con sus pagos y su total. Toca un año para abrirlo.\n\n' +
      'Los años llegan hasta 7 años calendario atrás: este año y los seis anteriores.\n\n' +
      'En el plan gratis, un año que es todo anterior a tus últimos 90 días tiene una insignia **Pro**. Igual se abre con sus totales, pero su lista se reemplaza por **Tu historial anterior está guardado**.',
    keywords: ['elige el año', 'todos los años', 'pagado desde', 'año pasado'],
  },
  {
    id: 'bills.history.free-limit',
    title: '¿Por qué solo veo 90 días de pagos?',
    questions: [
      '¿Por qué solo veo 90 días de pagos?',
      'qué significa tu historial anterior está guardado',
      'mis pagos viejos de facturas desaparecieron',
      'límite de historial en el plan gratis para facturas',
      'skip borró mis pagos viejos',
      'ver hasta 7 años con pro en historial de pagos',
      'por qué la lista se corta en julio',
      'cómo veo pagos de más de 3 meses',
      'el historial de pagos se corta',
      'mis pagos anteriores se perdieron',
    ],
    answer:
      'En el plan gratis, las listas muestran los últimos 90 días de pagos (hoy es el día 90). Los pagos anteriores no se eliminan: se conservan, siguen contando en todos los totales y saldos, y vuelven a mostrarse con Skip Pro.\n\n' +
      '- Donde una lista se detiene, verás **Tu historial anterior está guardado**. Tócalo para ver lo que agrega Pro.\n' +
      '- Los totales, conteos y barras de **Historial de pagos**, y los totales junto a **Pagados** en la página de una factura, incluyen todos los pagos.\n' +
      '- **Elige el mes** y **Elige el año** terminan con una línea sobre ver más con Pro.\n\n' +
      'Skip Pro muestra hasta 7 años, por {proMonthly} al mes o {proYearly} al año.',
    keywords: ['90 días', 'límite de historial', 'historial anterior', '7 años'],
  },
  {
    id: 'bills.search.how',
    title: '¿Cómo busco mis pagos?',
    questions: [
      '¿Cómo busco mis pagos?',
      'buscar facturas',
      'encontrar el pago de una factura',
      'buscar pagos',
      'cómo encuentro un cargo viejo de una suscripción',
      'ver todos los pagos de netflix',
      'buscar una factura por nombre',
      'qué significa 2024 – 2021 · 12 más',
      'cómo funciona la búsqueda de pagos',
      'encontrar lo que le pagué a mi compañía de luz',
      'buscar suscripciones',
      'cómo encuentro todos los pagos de renta del año pasado',
      'dónde busco pagos de facturas anteriores',
      'lista de todos los pagos que hice de la renta',
    ],
    answer:
      'Toca el botón de búsqueda en **Facturas mensuales** o **Suscripciones**, o **Buscar pagos** en **Historial de pagos**. Escribe parte de un nombre.\n\n' +
      '- **Todos**, **Facturas** y **Suscripciones** acotan la búsqueda.\n' +
      '- Encuentra por el nombre con que salió un pago y por el nombre actual de la factura, así que las facturas a las que les cambiaste el nombre se encuentran de las dos formas. Perdona un error de ortografía pequeño en palabras de 4 letras o más.\n' +
      '- Los resultados muestran cuántos hay y de qué años, y luego cada año con su total. Los dos años más recientes se listan completos; los más antiguos se agrupan en una fila como “2024 – 2021 · 12 más”. Tócala para abrirlos.\n\n' +
      'Solo se buscan los pagos que ya salieron. Toca un resultado para abrir su factura o suscripción.',
    keywords: ['buscar', 'encontrar', 'buscar pagos', 'búsqueda'],
  },
  {
    id: 'bills.search.filters',
    title: '¿Cómo funcionan los filtros de la búsqueda de pagos?',
    questions: [
      '¿Cómo funcionan los filtros de la búsqueda de pagos?',
      'filtrar pagos por fecha',
      'mostrar pagos de más de $100',
      'filtrar pagos de facturas por tarjeta',
      'filtro de rango de fechas',
      'filtro de importe mínimo y máximo',
      'el importe menor debe ir primero',
      'filtrar facturas por categoría',
      'borrar filtros',
      'elegir fechas desde hasta',
      'filtro pagado con todas las cuentas',
    ],
    answer:
      'Antes de escribir, la página de búsqueda lista **Filtros**. Cada uno abre su propia página:\n\n' +
      '- **Rango de fechas**: **Todas las fechas**, **Este mes**, **Últimos 3 meses**, **Este año**, **El año pasado** o **Elegir fechas** (pon **Desde** y **Hasta**, y luego **Ver pagos**).\n' +
      '- **Importe**: **Mínimo**, **Máximo** o los dos, y luego **Ver pagos**. El importe menor debe ir primero.\n' +
      '- **Pagado con**: **Todas las cuentas**, una tarjeta o cuenta, o **Sin tarjeta**.\n\n' +
      'Un filtro solo ya muestra resultados, aunque no escribas nada. Con resultados a la vista, toca el nombre de un filtro para cambiarlo, o **Borrar filtros**. No hay filtro por categoría: busca por nombre.',
    keywords: ['filtros', 'rango de fechas', 'importe', 'borrar filtros'],
  },
  {
    id: 'bills.search.recent',
    title: '¿Cómo borro las búsquedas recientes?',
    questions: [
      '¿Cómo borro las búsquedas recientes?',
      'eliminar búsquedas recientes de pagos',
      'quitar una búsqueda de recientes',
      'qué es la lista de recientes en la búsqueda',
      'por qué la búsqueda recuerda lo que escribí',
      'búsquedas recientes de pagos',
      'borrar el historial de búsqueda de pagos',
      'se guardan mis búsquedas de pagos',
      'búsquedas recientes en otro teléfono',
      'cuántas búsquedas recientes guarda',
    ],
    answer:
      '**Recientes** muestra tus últimas 5 búsquedas de pagos, la más reciente primero. Toca una para buscarla de nuevo, o toca la **X** junto a ella para quitarla.\n\n' +
      'Una búsqueda se recuerda cuando tocas **Buscar** en el teclado o abres un resultado, no mientras escribes. Las búsquedas recientes se guardan solo en este teléfono y se borran al cerrar sesión.',
    keywords: ['recientes', 'búsquedas recientes', 'historial de búsqueda', 'borrar'],
  },
  {
    id: 'bills.search.not-found',
    title: '¿Por qué la búsqueda no encuentra mi pago?',
    questions: [
      '¿Por qué la búsqueda no encuentra mi pago?',
      'ningún pago coincide',
      'la búsqueda no muestra nada',
      'la búsqueda no encuentra mi factura',
      'buscar una categoría no encuentra nada',
      'mi factura próxima no sale en la búsqueda',
      'la búsqueda no encuentra pagos viejos',
      '¿No lo encuentras? Prueba con una palabra más corta',
      'faltan pagos en los resultados de la búsqueda',
      'por qué la búsqueda no encuentra notas',
      'la búsqueda de pagos no encuentra nada pero sé que el pago está',
      'la búsqueda de facturas mensuales no encuentra un pago que hice',
      'la búsqueda no encuentra un pago en el historial de pagos',
      'escribo el nombre de un pago que hice y no aparece',
    ],
    answer:
      'Revisa varias cosas:\n\n' +
      '- La búsqueda mira solo los nombres, no las categorías ni las notas. Prueba con una parte del nombre, como “luz”.\n' +
      '- Solo encuentra pagos que ya salieron, no los próximos.\n' +
      '- Revisa la pestaña **Todos** / **Facturas** / **Suscripciones**, y toca **Borrar filtros**.\n' +
      '- En el plan gratis solo se listan los últimos 90 días. Las coincidencias más antiguas igual cuentan en los totales, y aparece **Tu historial anterior está guardado**.\n' +
      '- Los pagos de más de 7 años calendario no se muestran.\n\n' +
      '¿No hay coincidencias? Prueba con una palabra más corta u otro año.',
    keywords: ['sin resultados', 'no encuentra', 'búsqueda vacía', 'ningún pago coincide'],
  },
  {
    id: 'bills.export.how',
    title: '¿Cómo exporto mis pagos?',
    questions: [
      '¿Cómo exporto mis pagos?',
      'exportar mis pagos a exel',
      'descargar mi historial de pagos',
      'puedo sacar un pdf de mis facturas',
      'exportar facturas csv',
      'mandar mi historial de facturas a mi contador',
      'imprimir mis pagos',
      'por qué la exportación de pagos está bloqueada',
      'exportar pagos es gratis',
      'exportar suscripciones',
      'exportar todos los años',
      'compartir el historial de pagos',
    ],
    answer:
      'Exportar es parte de Skip Pro.\n\n' +
      '1. Abre **Historial de pagos**.\n' +
      '2. Elige el año y la pestaña **Todos**, **Facturas** o **Suscripciones**.\n' +
      '3. Toca **Exportar CSV o PDF**, o el botón de compartir de arriba a la derecha.\n' +
      '4. Elige **CSV** (para Numbers, Excel o Google Sheets) o **PDF** (un estado de cuenta para imprimir o enviar).\n' +
      '5. Toca **Exportar**. Se abre la hoja para compartir del iPhone, para que lo guardes en Archivos, lo envíes por correo o lo imprimas.\n\n' +
      'Para todos los años a la vez, abre **Todos los años** y toca su botón de compartir.\n\n' +
      'En el plan gratis, estos botones abren una página sobre Pro. Pro cuesta {proMonthly} al mes o {proYearly} al año.',
    keywords: ['exportar', 'csv', 'pdf', 'excel'],
  },
  {
    id: 'bills.export.contents',
    title: '¿Qué contiene el archivo de exportación de pagos?',
    questions: [
      '¿Qué contiene el archivo de exportación de pagos?',
      'qué columnas tiene el csv',
      'la exportación incluye mis filtros de búsqueda',
      'exportar solo una factura',
      'no hay nada que exportar de este año',
      'el botón exportar está gris',
      'cómo se ve el estado de cuenta en pdf',
      'en qué moneda sale la exportación',
      'cómo se llama el archivo',
      'la exportación incluye pagos de préstamos',
    ],
    answer:
      'La exportación incluye lo que **Historial de pagos** está mostrando: la pestaña donde estás y el año (o **Todos los años**). No usa los filtros de búsqueda, así que para una sola factura, exporta el año y fíltralo en tu hoja de cálculo.\n\n- **CSV**: una fila por pago con **Fecha**, **Nombre**, **Tipo** (Factura, Suscripción, o Liquidado y Pago extra en préstamos), **Importe** y **Pagado con**. Los importes son números simples, con la moneda en el nombre de la columna.\n- **PDF**: un estado de cuenta agrupado por mes, con el total de cada mes, un **Total** general y “Hecho con Skip Budget el” día en que lo hiciste.\n\nLos archivos se llaman como skip-bills-2026.pdf. Si un año no tiene nada, Skip lo dice y **Exportar** se queda desactivado.',
    keywords: [
      'columnas del csv',
      'estado de cuenta pdf',
      'archivo de exportación',
      'nombre del archivo',
    ],
  },

  // ---------------------------------------------------------------------------------------------
  // Money: balances, cards, Home
  // ---------------------------------------------------------------------------------------------
  {
    id: 'bills.balance.effect',
    title: '¿Cómo afectan las facturas a mi Saldo actual?',
    questions: [
      '¿Cómo afectan las facturas a mi Saldo actual?',
      'por qué bajó mi saldo el día 1',
      'las facturas se descuentan del saldo de mi cuenta en skip',
      'cómo afectan las suscripciones al saldo de mi tarjeta',
      'el saldo de mi tarjeta de crédito subió por mi factura',
      'cuándo se descuenta una factura de mi saldo',
      'una factura cuenta antes de su fecha de vencimiento',
      'por qué mi factura no cambió el saldo de mi cuenta',
      'facturas y saldos de tarjetas',
      'mi renta baja mi saldo actual',
      'una suscripción cancelada sigue en mi saldo',
    ],
    answer:
      'Cada pago cuenta en su fecha de vencimiento, no antes. Ese día:\n\n' +
      '- Tu **Saldo actual** en **Inicio** baja por el importe.\n' +
      '- Pagada con una tarjeta de crédito: lo que debes en esa tarjeta sube.\n' +
      '- Pagada con una cuenta bancaria: el saldo de esa cuenta baja.\n' +
      '- Pagada con **Skip**: solo cambia tu **Saldo actual**.\n\n' +
      'Skip solo cuenta los pagos desde el día en que ingresaste el saldo de esa tarjeta o cuenta, porque esa cifra ya incluía todo lo anterior.\n\n' +
      'Ejemplo: tu cuenta de cheques tiene $2,000 y la renta de $1,000 sale de ella el día 1. El día 1, la cuenta muestra $1,000 y tu **Saldo actual** baja $1,000. Las facturas detenidas y las suscripciones canceladas conservan contados sus pagos anteriores.',
    keywords: ['saldo actual', 'saldo de la tarjeta', 'saldo de la cuenta', 'saldo'],
  },
  {
    id: 'bills.balance.vs-month',
    title: '¿Por qué no coinciden Facturas mensuales y Saldo actual?',
    questions: [
      '¿Por qué no coinciden Facturas mensuales y Saldo actual?',
      'a pagar en octubre es más de lo que salió de mi saldo',
      'diferencia entre el total de facturas mensuales y el saldo actual',
      'el recuadro facturas mensuales de inicio vs saldo actual',
      'por qué el recuadro de facturas mensuales muestra facturas que no he pagado',
      'mi saldo solo bajó una parte de mis facturas',
      'qué suma el recuadro de facturas mensuales en inicio',
      'por qué a dónde se fue tu dinero es mayor que lo que gasté',
      'total de facturas vs saldo',
      'el saldo actual ignora mis facturas próximas',
      'el total del mes en la página de facturas es mayor que lo que salió de mi saldo',
      'por qué la cifra a pagar en facturas mensuales es mayor que lo que ya se descontó',
      'la cifra de a pagar es mayor que la baja de mi saldo',
    ],
    answer:
      'Responden preguntas distintas.\n\n' +
      '- **A pagar en octubre** en **Facturas mensuales** suma todas las fechas de facturas del mes, incluidas las que faltan. El recuadro **Facturas mensuales** en **Inicio** muestra lo mismo, más los pagos extra a préstamos.\n' +
      '- **Saldo actual** solo resta lo que ya pasó, hasta hoy, y nunca se reinicia el día 1.\n\n' +
      'Ejemplo, el 13 de octubre: la renta ($1,000, el día 1) está pagada y el internet ($60, el día 25) todavía falta. **A pagar en octubre** dice $1,060.00, pero hasta ahora solo han salido $1,000 de tu **Saldo actual**. Los $60 salen el día 25.',
    keywords: [
      'saldo actual',
      'recuadro facturas mensuales',
      'a pagar en',
      'a dónde se fue tu dinero',
    ],
  },
  {
    id: 'bills.card-deleted',
    title: 'Eliminé una tarjeta con la que se pagaban mis facturas',
    questions: [
      'Eliminé una tarjeta con la que se pagaban mis facturas',
      'qué pasa con mis facturas si elimino una tarjeta',
      'quité mi tarjeta de crédito y ahora las facturas dicen agregar una tarjeta',
      'cerré mi cuenta de banco en skip, qué pasa con las suscripciones',
      'los pagos de la tarjeta eliminada dicen sin tarjeta',
      'eliminar una tarjeta borra mis facturas',
      'mover facturas después de eliminar una tarjeta',
      'mis facturas perdieron su tarjeta',
      'quitaron mi tarjeta vieja',
      'eliminé una cuenta y mi factura de renta',
    ],
    answer:
      'Tus facturas y suscripciones se quedan. Solo pierden su tarjeta. En **Facturas mensuales** y **Suscripciones** muestran un enlace **Agregar una tarjeta**, y sus pagos anteriores dicen **Sin tarjeta**. Esos pagos siguen contando en tus gastos y en tu **Saldo actual**.\n\nPara volver a darle una tarjeta:\n\n1. Toca **Agregar una tarjeta** (o el lápiz en su página).\n2. Elige una tarjeta o cuenta.\n3. Toca **Guardar cambios**.\n\nElige **Anteriores y próximos** si también quieres los pagos anteriores en la tarjeta nueva. Eso también cambia el saldo de la tarjeta nueva.',
    keywords: ['tarjeta eliminada', 'quité la tarjeta', 'sin tarjeta', 'agregar una tarjeta'],
  },

  // ---------------------------------------------------------------------------------------------
  // Reminders and notifications
  // ---------------------------------------------------------------------------------------------
  {
    id: 'bills.reminder.change',
    title: '¿Cómo cambio o apago el recordatorio de una factura?',
    questions: [
      '¿Cómo cambio o apago el recordatorio de una factura?',
      'apagar el recordatorio de netflix',
      'quitar los recordatorios de mi renta',
      'cambiar el recordatorio de 1 día a 3 días',
      'cambiar la hora del recordatorio de mi factura',
      'dónde están los recordatorios de facturas en ajustes',
      'puedo tener dos recordatorios para una factura',
      'demasiadas notificaciones de facturas',
      'quitar un recordatorio',
      'ajustes de recordatorio de suscripciones',
    ],
    answer:
      'Dos formas:\n\n' +
      '1. Abre la factura o suscripción, toca el lápiz, cambia **Recordatorio** (elige **Sin recordatorio** para apagarlo) o toca el botón de la hora, y luego toca **Guardar cambios**.\n' +
      '2. O ve a **Ajustes → Preferencias → Recordatorios**. Ahí aparecen tus facturas y suscripciones con su importe y próxima fecha, y puedes cambiar cada una.\n\n' +
      'Cada factura o suscripción tiene un solo recordatorio. No puedes agregar un segundo para lo mismo.',
    keywords: ['recordatorio', 'apagar', 'cambiar recordatorio', 'hora del recordatorio'],
  },
  {
    id: 'bills.reminder.missing',
    title: '¿Por qué no me llegó el recordatorio de mi factura?',
    questions: [
      '¿Por qué no me llegó el recordatorio de mi factura?',
      'no hay notificación de mi factura',
      'el recordatorio de la factura no funciona',
      'el recordatorio de renovación de la suscripción nunca llegó',
      'puse un recordatorio y no recibí nada',
      'el recordatorio llegó el día equivocado',
      'no me avisaron antes de la renta',
      'los recordatorios pararon después de cancelar',
      'mi recordatorio llega tarde',
      'no me llego el recordatorio de la factrua',
    ],
    answer:
      'Revisa varias cosas:\n\n- En **Ajustes → Notificaciones → Skip Budget** del iPhone, las notificaciones deben estar permitidas.\n- El recordatorio cuenta hacia atrás desde **Próximo vencimiento** (o **Próxima renovación**) en su página. Revisa que esa fecha sea correcta.\n- Si el día del recordatorio ya había pasado cuando lo pusiste, como **1 semana** antes de una factura que vence en 3 días, el primero llega con la siguiente fecha de vencimiento.\n- Llega a tu hora o un poco después, en unos 15 minutos, en tu propia zona horaria.\n- Las facturas detenidas y las suscripciones canceladas no reciben recordatorios.\n- Abre la factura, toca el lápiz y revisa que **Recordatorio** no esté en **Sin recordatorio**.\n\nSkip no necesita estar abierto para que lleguen los recordatorios.',
    keywords: ['recordatorio', 'notificación', 'no funciona', 'no llegó'],
  },
  {
    id: 'bills.notifications.went-out',
    title: '¿Qué es la notificación de que un pago “salió”?',
    questions: [
      '¿Qué es la notificación “went out” de una factura?',
      'me llegó una notificación de que salieron $50',
      'pq me llego un aviso de pagos realizados de mis facturas',
      'por qué skip me avisó que salió mi renta',
      'apagar las notificaciones de salió',
      'notificación después de pagar mi factura',
      'me llegó una notificación pero no tengo recordatorio',
      'qué significa 5 cargos en la notificación',
      'no me llegó el mensaje de salió',
      'notificación de cargo',
      '¿Por qué me llegó una notificación de went out?',
      'me llegó una notificación que dice $15.99 went out',
      'qué es la notificación Payments went out',
      'por qué me llegan notificaciones que no configuré',
    ],
    answer:
      'Cuando llega la fecha de una factura o suscripción, Skip la registra como pagada y envía una notificación con su nombre y el importe, como “$15.99 went out” (salieron $15.99). Si salen más de tres a la vez, llegan como una sola: **Payments went out** (pagos realizados), con la cantidad y el total.\n\nAl tocarla se abre esa factura o suscripción, o **Actividad** si es un grupo.\n\nLlega a cualquier teléfono donde hayas activado los recordatorios en Skip y permitido las notificaciones, incluso para facturas en **Sin recordatorio**. No hay un interruptor aparte para ella. Apagar las notificaciones de Skip en la app Ajustes del iPhone la detiene, pero también detiene tus recordatorios.\n\nSi abres Skip justo cuando empieza el día, Skip puede registrar el pago antes de que salga la notificación, y entonces no se envía ninguna. El pago igual cuenta.',
    keywords: ['went out', 'payments went out', 'salió', 'cargos'],
  },

  // ---------------------------------------------------------------------------------------------
  // Logos, setup, plans, duplicates
  // ---------------------------------------------------------------------------------------------
  {
    id: 'bills.logo.change',
    title: '¿Cómo cambio el logo de una factura o suscripción?',
    questions: [
      '¿Cómo cambio el logo de una factura o suscripción?',
      'logo equivocado en mi suscripción',
      'cambiar el logo de una factura',
      'mi factura muestra letras en vez de un logo',
      'por qué mi factura no tiene logo',
      'quitar el logo de una factura',
      'los logos son gratis para las facturas',
      'reportar un logo equivocado en mi suscripción',
      'usar el sitio web para el logo de mi factura',
      'sin logo usar el ícono',
      'el logo es de otra empresa',
      'cambiar la imagen de una factura',
      'mi factura tiene la imagen equivocada, cómo la cambio',
      'cambiar la imagen de una suscripción',
    ],
    answer:
      'Los logos son gratis para todos.\n\n' +
      '1. Abre la factura o suscripción.\n' +
      '2. Toca su logo o ícono de arriba (tiene un lápiz pequeño).\n' +
      '3. En **Cambiar logo**, toca **Sí, es ese** para la sugerencia, **No es este** para ver otros, o **Usar el sitio web** para escribir el sitio web de la empresa.\n' +
      '4. O elige **Sin logo, usar el ícono** (facturas) o **Sin logo, usar letras** (suscripciones).\n' +
      '5. Toca **Guardar logo**.\n\n' +
      'Si un logo está mal para todos, toca **Reportar este logo**. Una factura sin empresa elegida muestra el ícono de su categoría. Una suscripción sin logo muestra letras.',
    keywords: ['logo', 'cambiar logo', 'ícono', 'reportar logo'],
  },
  {
    id: 'bills.free.limits',
    title: '¿Qué es gratis y qué es Pro en las facturas?',
    questions: [
      '¿Qué es gratis y qué es Pro en las facturas?',
      'hay un límite de cuántas facturas puedo agregar',
      'llevar suscripciones es gratis',
      'necesito pro para las facturas',
      'cuántas suscripciones puedo agregar gratis',
      'qué agrega pro a las facturas',
      'los recordatorios de facturas son gratis',
      'gratis vs pro facturas y suscripciones',
      'facturas mensuales es una función pro',
      'por qué algo está bloqueado en historial de pagos',
      'qué incluye el plan gratis para facturas y suscripciones',
      'tengo que pagar por las facturas y suscripciones en skip',
      'hay un límite de facturas para usuarios gratis',
      'es gratis agregar una suscripción',
    ],
    answer:
      'Casi todo es gratis:\n\n' +
      '- Todas las facturas y suscripciones que quieras\n' +
      '- Recordatorios, logos, **Facturas mensuales**, **Suscripciones** y la página de cada factura\n' +
      '- **Historial de pagos** y búsqueda de los últimos 90 días, con los totales completos de todos los años\n\n' +
      'Skip Pro agrega:\n\n' +
      '- Listas y búsqueda hasta 7 años atrás\n' +
      '- **Exportar CSV o PDF** de tus pagos\n\n' +
      'Pro cuesta {proMonthly} al mes o {proYearly} al año. Si Pro termina, no se elimina nada de lo que agregaste: el historial más antiguo solo se oculta hasta que vuelvas a tener Pro.',
    keywords: ['gratis', 'pro', 'límite', 'bloqueado'],
  },
  {
    id: 'bills.duplicates',
    title: 'Agregué la misma factura dos veces',
    questions: [
      'Agregué la misma factura dos veces',
      'factura duplicada',
      'mi renta se cuenta doble',
      'dos de la misma suscripción',
      'la factura sale dos veces',
      'por qué se cobra netflix dos veces este mes',
      'quitar una suscripción duplicada',
      'factura contada doble',
      'la misma factura aparece dos veces',
      'skip cobró mi factura dos veces',
      'la suscripción sale repetida en la página de suscripciones',
      'tengo netflix dos veces en mi lista',
      'agregué la misma suscripción dos veces por error',
      'puse una factura dos veces, cómo quito una',
      'toqué guardar factura dos veces, ¿se duplica?',
    ],
    answer:
      'Elimina la que sobra con **Eliminar todo**, para que sus pagos dejen de contar:\n\n1. Abre la repetida desde **Facturas mensuales** (o **Suscripciones**).\n2. Toca el lápiz y luego **Eliminar factura** (o **Eliminar suscripción**).\n3. Toca **Eliminar todo**.\n\nLos totales y saldos se actualizan al instante. Una sola factura nunca se cobra dos veces el mismo mes (ni la misma semana, trimestre o año), así que un doble casi siempre significa que se agregaron dos copias. Tocar **Guardar factura** dos veces, o volver a guardar después de perder la conexión, no crea un doble: el botón se queda en **Guardando…** hasta que se cierra la página, y un nuevo intento encuentra la factura que guardó el primero.',
    keywords: ['duplicada', 'doble', 'repetida', 'dos veces'],
  },

  // ---------------------------------------------------------------------------------------------
  // Things Skip does not do
  // ---------------------------------------------------------------------------------------------
  {
    id: 'bills.not-supported.bank',
    title: '¿Skip paga mis facturas o se conecta a mi banco?',
    questions: [
      '¿Skip paga mis facturas o se conecta a mi banco?',
      'skip puede pagar mi renta por mí',
      'skip encuentra mis facturas automáticamente',
      'puede importar facturas de mi banco',
      'conectar mi banco para ver facturas',
      'skip lee mi correo para sacar facturas',
      'pagar una factura desde la app',
      'detección automática de facturas',
      'por qué tengo que escribir mis facturas',
      'skip configura pagos automáticos',
    ],
    answer:
      'No. Skip no mueve dinero ni paga nada, y nunca se conecta a tu banco ni a tu correo. Lleva la cuenta de las facturas que agregas, cuenta cada una como pagada en su fecha de vencimiento y te avisa antes de que venza. Tú sigues pagando la factura como siempre.\n\n' +
      'Agrega cada factura una vez con **Agregar rápido → Factura** o **Suscripción**, y Skip la mantiene corriendo cada mes.\n\n' +
      'Para sugerir algo, ve a **Ajustes → Soporte y comentarios → Comparte una idea**.',
    keywords: ['banco', 'pagar facturas', 'pago automático', 'importar'],
  },
  {
    id: 'subscriptions.cancel.company',
    title: '¿Skip puede cancelar una suscripción por mí?',
    questions: [
      '¿Skip puede cancelar una suscripción por mí?',
      'si cancelo en skip netflix deja de cobrarme',
      'cancelar mi spotify desde skip',
      'skip encuentra mis suscripciones automáticamente',
      'puede detectar suscripciones desde mi banco',
      'cancelé en skip pero me siguen cobrando',
      'darme de baja por mí',
      'skip contacta a la empresa',
      'encontrar suscripciones olvidadas',
      'skip cancela el servicio por mí',
      'si la marco como cancelada en skip dejan de cobrar mi tarjeta',
      'si marco una suscripción como cancelada en la app, la empresa deja de cobrarme',
      'el estado cancelada es solo para mi registro',
      'skip cancela mi suscripción de netflix',
    ],
    answer:
      'No. Skip no está conectado a la empresa ni a tu banco, así que no puede cancelar, pausar ni cambiar una suscripción. Cancela con la empresa (en su sitio web o app, o en **Ajustes** del iPhone para las suscripciones del App Store) y luego márcala como **Cancelada** en Skip para que deje de contar.\n\n' +
      'Skip tampoco puede detectar suscripciones por sí solo. Agrega cada una con **Agregar rápido → Suscripción**.\n\n' +
      'Para sugerir algo, ve a **Ajustes → Soporte y comentarios → Comparte una idea**.',
    keywords: ['cancelar por mí', 'sigo pagando', 'darme de baja', 'detectar'],
  },
  {
    id: 'bills.not-supported.split',
    title: '¿Puedo dividir una factura con alguien?',
    questions: [
      '¿Puedo dividir una factura con alguien?',
      'compartir una factura con mi compañero de cuarto',
      'dividir la renta con mi pareja',
      'facturas compartidas',
      'solo pago la mitad del internet',
      'dividir los servicios',
      'factura conjunta con mi esposo',
      'dos personas pueden ver la misma factura',
      'cómo llevo mi parte de una factura',
      'dividir una suscripción familiar',
    ],
    answer:
      'Skip no tiene facturas compartidas: cada factura pertenece solo a tu cuenta. Lo más cercano es ingresar tu propia parte como el importe. Por ejemplo, si la renta es de $2,000 y pagas la mitad, agrégala como $1,000. Así tus totales y saldos muestran lo que de verdad pagas.\n\n' +
      'Para pedir facturas compartidas, ve a **Ajustes → Soporte y comentarios → Comparte una idea**.',
    keywords: ['dividir', 'compartir', 'compañero de cuarto', 'mitad'],
  },
  {
    id: 'bills.not-supported.attach',
    title: '¿Puedo adjuntar una foto o un PDF a una factura?',
    questions: [
      '¿Puedo adjuntar una foto o un PDF a una factura?',
      'adjuntar el estado de cuenta de mi factura',
      'guardar una foto de mi factura',
      'subir un documento de una factura',
      'puedo escanear una factura de servicios en skip',
      'agregar un archivo a una suscripción',
      'guardar una copia de la factura',
      'guardar el pdf de mi factura de luz',
      'foto del comprobante de renta en la factura',
      'archivos adjuntos en facturas',
    ],
    answer:
      'No. Las facturas y suscripciones no guardan fotos ni archivos. Puedes escribir detalles como un número de cuenta en **Nota**.\n\n' +
      'Escanear y subir son para los recibos (**Agregar rápido → Recibo**), y Skip lee los datos de ellos en vez de guardar la imagen.\n\n' +
      'Si quieres archivos adjuntos en las facturas, cuéntanoslo en **Ajustes → Soporte y comentarios → Comparte una idea**.',
    keywords: ['adjuntar', 'foto', 'pdf', 'documento'],
  },
  {
    id: 'bills.add.any-regular',
    title: '¿Puedo agregar un pago regular que no sea una factura?',
    questions: [
      'mando dinero a mi familia en el extranjero cada mes',
      'le doy una mesada a mi hijo',
      'donación mensual a una organización',
      'agregar una donación mensual',
      'dinero que mando a mi país cada mes',
      'pensión alimenticia que pago',
      'dinero de bolsillo para mis hijos cada semana',
      'transferencia regular a alguien',
      'diezmo cada mes',
      'mi pago mensual a mi mamá',
      'una factura puede ser algo que no es una empresa',
    ],
    answer:
      'Sí. Cualquier cosa que pagues con un calendario puede ser una factura, aunque no sea una empresa: dinero que envías a tu familia, la mesada de un hijo, una donación o una pensión alimenticia.\n\n1. En **Inicio**, toca **Agregar rápido → Factura**, y luego **Otra**.\n2. Escribe el importe y toca **Continuar**.\n3. Ponle un **Nombre**, como “Mesada”, y completa **Fecha de pago**, **Se repite**, **Se paga con** y **Recordatorio**.\n4. Toca **Guardar factura**.\n\nSale en cada fecha, baja tu **Saldo actual** y aparece en **Facturas mensuales**.\n\nPara el dinero que pasas a tu propia cuenta de ahorros, usa **Agregar dinero** en esa cuenta, para que no se cuente como gasto.',
    keywords: ['mesada', 'donación', 'remesa', 'pensión alimenticia'],
  },
  {
    id: 'bills.amount.calculator',
    title: '¿Cómo funciona la Calculadora en un importe?',
    questions: [
      'cómo funciona el botón de calculadora',
      'No se puede dividir entre cero',
      'qué hace AC en la calculadora',
      'puedo sumar dos importes antes de guardar',
      'calculadora en el importe de la factura',
      'ícono de calculadora en el cuadro del salario',
      'la calculadora redondea',
      '2 + 3 x 4 da la respuesta equivocada',
      'cómo divido mi salario anual en skip',
      'calculadora para ingresos esperados',
      'el resultado de la calculadora no pasó al importe',
    ],
    answer:
      'La **Calculadora** funciona como una calculadora de bolsillo, y **Listo** pone el resultado en el importe. La encuentras en el importe de una factura, como el ícono de calculadora en el cuadro **Importe** de **Salario**, y en **Ingresos esperados** cuando agregas una cuenta bancaria.\n\n- **AC** borra todo, y la tecla de retroceso borra el último dígito.\n- **+**, **−**, **×** y **÷** se aplican en el orden en que los tocas, así que 2 + 3 × 4 da 20, no 14.\n- Cada paso se redondea al centavo.\n- **Listo** termina una cuenta aunque no hayas tocado **=**.\n\nDividir entre cero muestra **No se puede dividir entre cero** y borra la cuenta. Toca la flecha de atrás de arriba para salir sin cambiar el importe.',
    keywords: ['calculadora', 'AC', 'dividir entre cero', 'sumar'],
  },
];

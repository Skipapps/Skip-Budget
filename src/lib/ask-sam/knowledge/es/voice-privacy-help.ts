import type { IntentText } from '@/lib/ask-sam/types';

export const voicePrivacyHelpEs: IntentText[] = [
  // Voz: grabar

  {
    id: 'voice.record.how',
    title: '¿Cómo agrego algo con la voz?',
    questions: [
      'cómo uso la voz',
      '¿Cómo agrego algo con la voz?',
      'como funciona agregar por voz',
      'cómo uso el micrófono para agregar gastos',
      '¿Puedo decir lo que gasté en vez de escribirlo?',
      'pasos para registrar un gasto hablando',
      'como le hablo a skip',
      'quiero dictar mi factura, cómo se hace',
      'el micrófono se toca o se mantiene presionado',
      'Registrar un movimiento, cómo se usa',
      'cómo anoto una compra con mi voz',
      'se puede dictar un recibo',
      'agregar x voz',
      'para q sirve el botón redondo del micro',
    ],
    answer:
      'Mantén presionado el micrófono grande, habla y suelta. La entrada por voz agrega un recibo, una factura o una suscripción a partir de lo que dices.\n\n' +
      '1. Toca el botón redondo de voz, en el extremo derecho de la barra de pestañas.\n' +
      '2. En **Registrar un movimiento**, mantén presionado el micrófono de la parte de abajo.\n' +
      '3. Di una sola cosa, en inglés, como “Spent $12.50 at Starbucks today”. Tus palabras aparecen arriba mientras hablas.\n' +
      '4. Suelta. Skip te muestra lo que escuchó en una página de revisión.\n' +
      '5. Corrige lo que no esté bien y toca **Guardar recibo**, **Guardar factura** o **Guardar suscripción**.\n\n' +
      'Vuelves a **Inicio** con una nota breve que avisa que se agregó. Nunca se guarda nada sin que lo revises antes.\n\n' +
      'La primera vez, esa primera pulsación solo le pide permiso a tu iPhone. Mantén presionado otra vez para hablar.',
    keywords: ['voz', 'micrófono', 'dictar', 'Registrar un movimiento'],
  },
  {
    id: 'voice.say.receipts',
    title: '¿Qué digo para agregar un recibo?',
    questions: [
      'qué digo para anotar un café por voz',
      '¿Qué debo decir para agregar un recibo por voz?',
      'ejemplos de qué decir para una compra',
      'cómo digo un café que compré',
      'qué palabras entiende skip para los recibos',
      '¿Tengo que decir el nombre de la tienda?',
      'puedo decir la fecha de una compra',
      'ejemplo de frase para el súper por voz',
      'qué digo para la gasolina que cargué ayer',
      'como armo la frase de un recibo al hablar',
      'ejemplos de recibo por voz',
      '¿Puedo decir "spent 40 at Target"?',
      'en qué formato hablo para una compra',
      'q le digo pa registrar una compra',
    ],
    answer:
      'Di cuánto, dónde y cuándo, en cualquier orden y en inglés. Skip identifica cada parte. Por ejemplo:\n\n' +
      '- “Spent $12.50 at Starbucks today”\n' +
      '- “$64.20 at Target yesterday”\n' +
      '- “Paid 45 bucks for gas at Shell on Friday”\n' +
      '- “Groceries $82 at Costco”\n' +
      '- “Lunch at Chipotle $14 yesterday”\n' +
      '- “Forty five at Target three days ago”\n\n' +
      'Palabras como “spent”, “bought”, “lunch”, “coffee”, “groceries” o “gas”, o “at” antes de una tienda, le indican a Skip que es un recibo. Una tienda que Skip no conoce también funciona si dices “at” antes, como en “spent 12.50 at Joe’s Diner”.\n\n' +
      'Si no dices un día, el recibo queda con la fecha de hoy.',
    keywords: ['recibo por voz', 'compra', 'ejemplo', 'qué decir'],
  },
  {
    id: 'voice.say.bills',
    title: '¿Qué digo para agregar una factura?',
    questions: [
      '¿Qué digo para agregar una factura por voz?',
      'cómo digo mi renta',
      'ejemplo para decir la factura de la luz',
      'puedo decir cuándo vence una factura',
      'ejemplos de factura por voz',
      'cómo agrego la factura del teléfono hablando',
      'qué palabras hacen que sea una factura',
      '¿Puedo decir mi seguro cada 3 meses?',
      'cómo le digo a skip el monto de mi hipoteca y cuándo vence',
      'decir una factura que vence el día 1',
      'agregar la factura del internet con la voz',
      'q digo pa la factura del agua',
    ],
    answer:
      'Di para qué es la factura, cuánto es y cuándo vence, en inglés. Por ejemplo:\n\n' +
      '- “Electric bill $85, due on the 15th”\n' +
      '- “Rent is $1,800, due on the 1st”\n' +
      '- “Xfinity $79.99, due on the 20th every month”\n' +
      '- “Water bill $45 due in 3 days”\n\n' +
      'Palabras como “rent”, “mortgage”, “electric”, “insurance”, “phone bill” o “due” hacen que sea una factura. Skip también completa la **Categoría** a partir de esas palabras, o de una empresa que conoce, como Xfinity para **Internet**.\n\n' +
      'Una factura necesita una fecha de vencimiento para guardarse, así que di “due on” y el día si puedes. Si no dices cada cuánto se repite, se elige **Mensual** por ti.',
    keywords: ['factura por voz', 'renta', 'hipoteca', 'vence'],
  },
  {
    id: 'voice.say.subscriptions',
    title: '¿Qué digo para agregar una suscripción?',
    questions: [
      'qué digo para netflix',
      '¿Qué digo para agregar una suscripción por voz?',
      'cómo agrego netflix con la voz',
      'ejemplo de spotify cada mes',
      'puedo decir una suscripción anual',
      'cómo digo cuándo se renueva',
      'qué hace que skip piense que es una suscripción',
      'agregar la membresía del gimnasio hablando',
      'ejemplos de suscripción por voz',
      '¿Puedo decir Amazon Prime por año?',
      'cómo digo una suscripción semanal',
      'decir Hulu 7.99 al mes',
    ],
    answer:
      'Di el servicio, el precio y cada cuánto se cobra, en inglés. Por ejemplo:\n\n' +
      '- “Netflix $15.99 every month”\n' +
      '- “Spotify $11.99 a month, renews on the 3rd”\n' +
      '- “Hulu $99.99 a year”\n' +
      '- “Disney+ $13.99 monthly”\n' +
      '- “Costco membership $65 once a year”\n\n' +
      'Las palabras “subscription”, “membership” o “renews” hacen que sea una suscripción, y también un servicio de streaming o una app que Skip conoce. La fecha de renovación es opcional.\n\n' +
      'Si no dices “every month” ni “a year”, se elige **Mensual** por ti, así que revisa **Ciclo de cobro** antes de guardar. Si no dices un nombre, como en “gym membership $40 a month”, toca **Servicio** y elígelo antes de guardar.',
    keywords: ['suscripción por voz', 'netflix', 'spotify', 'membresía'],
  },
  {
    id: 'voice.say.tips',
    title: 'Consejos para que Skip me entienda a la primera',
    questions: [
      '¿Cómo hago que skip me entienda mejor?',
      'la mejor forma de hablarle a la voz',
      'tips para la entrada por voz',
      'cuál es la mejor manera de decir los importes',
      'digo dólares o solo el número',
      'cómo hacer que la voz sea más precisa',
      'nunca me entiende a la primera, algún consejo',
      'tengo que hablar despacio',
      'puedo hacer pausas mientras hablo',
      'consejos voz',
      'cómo debo hablarle al micro',
      'q hago pa q me entienda la voz',
    ],
    answer:
      'Algunos hábitos ayudan a que Skip acierte a la primera:\n\n' +
      '- Di una sola cosa cada vez que presionas: un importe, un nombre y un día.\n' +
      '- Di la tienda o el servicio con claridad, como “at Target” o “Netflix”.\n' +
      '- Para los centavos, “$12.50” o “twelve dollars fifty” se entiende bien. “Twelve fifty” puede ser $12.50 o $1,250, así que Skip te preguntará.\n' +
      '- En facturas y suscripciones, di cada cuánto se repiten: “every month”, “a year”, “every 3 months”.\n' +
      '- Di cuándo: “today”, “yesterday”, “last Friday”, “due on the 15th”.\n' +
      '- Habla a un ritmo normal. Las pausas no importan mientras sigas presionando, y termina dentro de 15 segundos.\n' +
      '- Un lugar tranquilo ayuda.\n\n' +
      'Si te trabas con una palabra, corrígete sin problema: “forty, no, fifty” se queda con fifty.',
    keywords: ['consejos', 'tips', 'precisión', 'cómo hablar'],
  },
  {
    id: 'voice.say.amounts',
    title: '¿Cómo puedo decir los importes?',
    questions: [
      '¿Puedo decir los importes con palabras?',
      'la voz entiende "a grand"',
      'cómo digo centavos por voz',
      'puedo decir 1.2k',
      'entiende bucks',
      'cómo digo un importe grande como la renta',
      'twelve fifty o twelve dollars fifty',
      'decir un precio con centavos por voz',
      'entiende "two hundred and five dollars"',
      'qué pasa con impuestos y propina al hablar',
      'qué importes entiende la voz',
      'como digo los montos hablando',
    ],
    answer:
      'Di los importes como lo harías normalmente. Todos estos funcionan:\n\n' +
      '- “$12.50”, “12 dollars 50”, “twelve dollars and fifty cents”\n' +
      '- “45 bucks”, “forty five”, “ninety nine cents”, “a buck fifty”\n' +
      '- “two hundred and five dollars”, “eighteen hundred”, “twelve hundred fifty”\n' +
      '- “a grand”, “two grand”, “$1.2k”, “five k”\n\n' +
      'Dos cosas hacen que Skip pregunte en vez de adivinar: pares como “twelve fifty”, que pueden ser $12.50 o $1,250, y dos cifras separadas, como un precio y una propina. Skip nunca suma cifras, así que, para una comida con propina, di el total.\n\n' +
      'Un precio por galón o por artículo se ignora cuando también dices el total: “$3.45 a gallon, $45.20 total at Shell” guarda $45.20.',
    keywords: ['importe', 'dólares', 'centavos', 'propina'],
  },
  {
    id: 'voice.corrections',
    title: '¿Puedo corregirme mientras hablo?',
    questions: [
      'qué pasa si digo mal el número al hablar',
      'puedo decir "no wait"',
      'dije cuarenta y luego cincuenta, cuál toma',
      'corregirme a mitad de la frase por voz',
      'funciona decir "actually" en la voz',
      'se puede decir "scratch that"',
      'cambié de opinión a la mitad de hablar',
      'dije Walmart pero quise decir Target',
      'uy, dije la tienda equivocada',
      'autocorrección en la entrada por voz',
      'me equivoqué al hablar, y ahora qué',
      'puedo rectificar lo que dije mientras grabo',
    ],
    answer:
      'Sí. Corrígete como lo harías con una persona, y Skip se queda con lo último que dijiste para esa parte:\n\n' +
      '- “Forty, no, fifty at Shell” guarda $50.\n' +
      '- “Spent 40, make that 45, at Shell” guarda $45.\n' +
      '- “Walmart, I mean Target, 30” guarda Target.\n' +
      '- “Netflix, actually Hulu, 7.99” guarda Hulu.\n' +
      '- “Netflix 15.99 monthly, no, yearly” lo guarda como anual.\n\n' +
      'Funcionan palabras como “no”, “no wait”, “actually”, “I mean”, “sorry”, “make that”, “scratch that” y “oops”. Solo cambia la parte que corregiste. Todo lo demás que dijiste se queda igual.',
    keywords: ['corrección', 'no wait', 'actually', 'scratch that'],
  },
  {
    id: 'voice.limit-time',
    title: '¿Cuánto tiempo puedo hablar?',
    questions: [
      '¿Hay un límite de tiempo en la voz?',
      'dejó de escuchar después de unos segundos',
      'cuánto tiempo puedo mantener el micrófono',
      'la voz me cortó',
      'puedo hacer pausas a la mitad de una frase',
      'duración máxima de la grabación',
      'una frase larga por voz',
      'por qué se apagó el micro solo',
      'se detiene si hago una pausa',
      '15 segundos voz',
      'xq se corta el micro',
      'cuanto dura la grabación',
    ],
    answer:
      'Hasta 15 segundos cada vez que presionas. Después el micrófono se cierra solo y Skip usa lo que alcanzó a escuchar.\n\n' +
      'Las pausas no lo terminan. Mientras tu dedo siga abajo, una pulsación es una frase, por mucho que te detengas a pensar. Levantar el dedo la termina.\n\n' +
      'Una entrada cabe de sobra: “Car insurance $140 every month, due on the 5th” queda muy por debajo del límite.',
    keywords: ['límite de tiempo', '15 segundos', 'se corta', 'pausa'],
  },
  {
    id: 'voice.interruptions',
    title: '¿Y si entra una llamada mientras hablo?',
    questions: [
      'qué pasa si me llaman mientras grabo',
      'mi música se paró cuando usé la voz',
      'la voz pausa mi podcast',
      'bloqueé el iPhone mientras hablaba',
      'la voz se detuvo al cambiar de app',
      'siri interrumpió la entrada por voz',
      'salí de la página de voz a media frase',
      'mi música vuelve después de usar la voz',
      'sonó una alarma mientras grababa',
      'audio de fondo con la voz',
      'me llegó una llamada y se perdió lo que dije',
      'q pasa si cambio de app mientras hablo',
    ],
    answer:
      'Skip maneja las interrupciones con calma:\n\n' +
      '- Una llamada, Siri o una alarma terminan la grabación, y Skip se queda con lo que ya habías dicho.\n' +
      '- Salir de la página, ir a la pantalla de inicio o bloquear el iPhone detiene el micrófono al instante y olvida esa grabación. No se guarda nada.\n' +
      '- La música o los podcasts se pausan mientras mantienes presionado el micrófono, y por lo general siguen cuando sueltas.\n\n' +
      'El micrófono nunca se vuelve a encender solo cuando regresas. Mantenlo presionado otra vez cuando estés listo.',
    keywords: ['llamada', 'interrupción', 'música', 'siri'],
  },

  // Voz: cómo lee Skip lo que dijiste

  {
    id: 'voice.kind.how',
    title: '¿Cómo elige Skip entre recibo, factura o suscripción?',
    questions: [
      'cómo sabe la voz que es una factura',
      '¿Cómo decide Skip entre recibo, factura y suscripción?',
      'por qué creyó que mi netflix era un recibo',
      'qué significa Skip lo adivinó',
      'cómo sabe qué tipo es',
      'por qué guardó mi gimnasio como suscripción',
      'para qué son los botones de Agregar como',
      'mi factura de netflix salió como suscripción, por qué',
      'cómo distingue una factura de una suscripción',
      'detección del tipo en la voz',
      'xq salió recibo si dije factura',
      'Skip lo adivinó. Elige otro si no es correcto',
    ],
    answer:
      'Skip lee las palabras que usaste, luego el nombre, y elige una de tres:\n\n' +
      '- **Suscripción**: palabras como “subscription”, “membership” o “renews”, o un servicio de streaming o una app como Netflix o Spotify.\n' +
      '- **Factura**: “rent”, “mortgage”, “electric”, “insurance”, “phone bill”, “due”, o una empresa de servicios, teléfono, internet o seguros.\n' +
      '- **Recibo**: “spent”, “bought”, “coffee”, “lunch”, “groceries”, “gas”, o “at” una tienda.\n\n' +
      'Decir cada cuánto se repite (“every month”) apunta a una suscripción, o a una factura de servicios o con una palabra de factura. “Spent 15.49 on Netflix” es un recibo, porque “spent” gana. “My Netflix bill” sigue siendo una suscripción.\n\n' +
      'Cuando nada lo indica, Skip elige **Recibo** y muestra “Skip lo adivinó. Elige otro si no es correcto.” Toca otra opción en **Agregar como** para cambiarlo.',
    keywords: ['Agregar como', 'tipo', 'adivinó', 'recibo o factura'],
  },
  {
    id: 'voice.kind.change',
    title: '¿Cómo lo cambio a factura o suscripción?',
    questions: [
      'cambiar de recibo a factura en la página de voz',
      'quiero que sea factura y no recibo',
      '¿Cómo cambio una entrada de voz de recibo a factura?',
      'eligió el tipo equivocado, cómo lo arreglo',
      'puedo cambiarlo a suscripción antes de guardar',
      'qué pasa si toco Factura en Agregar como',
      'tipo equivocado en la página de voz',
      'lo guardé como recibo pero era una suscripción',
      'cambiar el tipo después de guardar una entrada de voz',
      'convertir mi recibo de voz en factura',
      'los botones de agregar como me cambiaron la fecha',
      'pasar de recibo a suscripción en la página de revisión',
    ],
    answer:
      'Antes de guardar, toca **Recibo**, **Factura** o **Suscripción** en **Agregar como**. Skip vuelve a leer tus palabras para el nuevo tipo, y lo que ya cambiaste a mano se queda como lo dejaste.\n\n' +
      'El día puede moverse al cambiar. En un recibo, “on the 5th” es el último día 5 que ya pasó. En una factura o suscripción, es el próximo día 5.\n\n' +
      'Una vez guardado, un recibo ya no se puede convertir en factura ni en suscripción. Elimina el que guardaste (ábrelo, toca el lápiz y luego **Eliminar** al final) y agrégalo de nuevo del modo correcto, por voz o con **Agregar rápido** en **Inicio**.',
    keywords: ['Agregar como', 'cambiar tipo', 'tipo equivocado', 'convertir'],
  },
  {
    id: 'voice.amount.which',
    title: '¿Por qué me pregunta qué importe quise decir?',
    questions: [
      'entendió fifteen ninety nine como 1599',
      'qué importe quisiste decir',
      '¿Por qué Skip me pregunta qué importe quise decir?',
      'me dio dos importes para elegir',
      'qué es ¿Qué importe quisiste decir?',
      'twelve fifty salió como 12.50 y 1250',
      'por qué no distingue 15.99 de 1599',
      'qué hace Ninguno, lo escribo yo',
      'muestra dos precios y no deja guardar',
      'dije un precio más propina y me pidió elegir',
      'salieron dos números cuando hablé',
      'xq tengo que elegir el importe',
      'Elige el importe que quisiste decir',
    ],
    answer:
      'Skip escuchó algo que podría ser dos importes, así que te pregunta en vez de adivinar con tu dinero.\n\n' +
      '- “Twelve fifty” puede ser $12.50 o $1,250.\n' +
      '- “Fifteen ninety nine” puede ser $15.99 o $1,599.\n' +
      '- Dos cifras separadas, como “$40 plus $5 tip”, se ofrecen como $5 y $40. Skip nunca suma cifras.\n\n' +
      'Toca el importe correcto en **¿Qué importe quisiste decir?**. Si ninguno es el correcto, toca **Ninguno, lo escribo yo** y usa el teclado numérico. **Guardar** sigue desactivado hasta que elijas, con la pista “Elige el importe que quisiste decir.”\n\n' +
      'Para evitar la pregunta, di “$12.50”, “twelve dollars fifty”, o el total solo.',
    keywords: ['¿Qué importe quisiste decir?', 'dos importes', 'Ninguno', 'ambiguo'],
  },
  {
    id: 'voice.amount.wrong',
    title: 'El importe que escuchó Skip está mal',
    questions: [
      'Skip se equivocó con el importe',
      'escuchó 14 en vez de 40',
      'cómo arreglo el importe en la página de voz',
      'el precio está mal después de hablar',
      'número incorrecto en la voz',
      'la voz redondeó mi importe',
      'puso un importe enorme por error',
      'cómo cambio el importe antes de guardar una entrada de voz',
      'falta el importe después de hablar',
      'dice Toca para agregar el importe, qué hago',
      'no captó los centavos',
      'monto equivocado voz',
    ],
    answer:
      'Arréglalo en la página de revisión.\n\n1. Toca el importe grande de arriba. Se abre un teclado numérico con la pregunta “¿Cuánto gastaste?” (o “¿De cuánto es la factura?” o “¿Cuánto cuesta?”).\n2. Escribe la cifra correcta.\n3. Toca **Listo**.\n\nSi no se escuchó ningún importe, arriba dice **Toca para agregar el importe**.\n\nSkip mantiene los importes al centavo y nunca los redondea. El máximo que acepta es $999,999,999.99. Números como “forty” y “fourteen” suenan parecido, así que vale la pena echar un vistazo antes de **Guardar**.',
    keywords: [
      'importe equivocado',
      'teclado numérico',
      'Toca para agregar el importe',
      'número mal escuchado',
    ],
  },
  {
    id: 'voice.dates',
    title: '¿Qué fechas puedo decir?',
    questions: [
      '¿Puedo decir una fecha al agregar por voz?',
      'qué fechas entiende la voz',
      'cómo digo el viernes pasado',
      '¿Por qué "on the 5th" se fue al mes pasado?',
      'puso el mes siguiente en el vencimiento de mi factura',
      'puedo decir hace tres días',
      'entiende "October 3rd"',
      'la voz puso la fecha equivocada',
      'qué pasa si no digo la fecha al hablar',
      'vence el 31 en un mes corto por voz',
      'cómo maneja la voz las fechas',
      'mi renta del día 1 se fue al próximo mes',
    ],
    answer:
      'Skip entiende casi todas las formas cotidianas de decir un día: “today”, “yesterday”, “tomorrow”, “the day before yesterday”, “3 days ago”, “a week ago”, “last Friday”, “next Friday”, “on Monday”, “October 3rd” y “10/3”.\n\n' +
      'Hacia dónde apunta un día depende del tipo:\n' +
      '- **Recibo**: el más reciente, porque ya lo compraste. “On the 5th” dicho el día 13 es el 5 de este mes.\n' +
      '- **Factura o suscripción**: el próximo. “Due on the 5th” dicho el día 13 es el 5 del mes que viene. Palabras en pasado como “paid”, “was due” o “renewed” apuntan hacia atrás.\n\n' +
      'Si dices el 31 y ese mes es más corto, una factura usa el último día del mes. Si no dices ningún día, un recibo es de hoy, una factura pide **Fecha de vencimiento** y una suscripción puede guardarse sin fecha de renovación.\n\n' +
      'Para cambiarlo, toca la fila de la fecha y elige un día. En un recibo, los botones **Hoy** y **Ayer** debajo de la fecha lo fijan con un toque.',
    keywords: ['fecha', 'día', 'ayer', 'viernes pasado'],
  },
  {
    id: 'voice.cycle',
    title: '¿Cómo digo cada cuánto se repite?',
    questions: [
      'cómo digo cada año por voz',
      '¿Cómo le digo a Skip que una factura es anual?',
      'opciones de cada cuánto se repite por voz',
      'puedo decir cada dos semanas',
      'guardó mi suscripción como mensual pero es anual',
      'por qué ya viene elegido mensual',
      'qué significa Se repite en la página de voz',
      'Ciclo de cobro en la página de revisión',
      'decir una factura trimestral',
      'suscripción quincenal por voz',
      'seguro cada 3 meses por voz',
      'no dije cada cuánto se repite',
      'como digo q es cada año',
    ],
    answer:
      'Dilo con palabras sencillas. Skip entiende cuatro ritmos:\n\n' +
      '- **Semanal**: “every week”, “a week”, “weekly”\n' +
      '- **Mensual**: “every month”, “a month”, “per month”, “monthly”\n' +
      '- **Cada 3 meses** en facturas, **Trimestral** en suscripciones: “every 3 months”, “every quarter”, “quarterly”\n' +
      '- **Anual**: “every year”, “a year”, “once a year”, “annually”\n\n' +
      'Si no dices ninguno, se selecciona **Mensual** en **Se repite** (facturas) o en **Ciclo de cobro** (suscripciones). Toca otra opción antes de guardar, porque mensual o anual cambia mucho tus números.\n\n' +
      'Skip no puede guardar “every two weeks”, “twice a month” ni “every 6 months”. Los detecta para que el número no se tome como dinero, pero tendrás que elegir la opción más cercana.',
    keywords: ['Se repite', 'Ciclo de cobro', 'mensual', 'anual'],
  },
  {
    id: 'voice.store.wrong',
    title: 'Skip escuchó mal la tienda o el servicio',
    questions: [
      'la voz se equivocó de tienda',
      'Skip puso mal el nombre de la tienda',
      'escribió star bucks en vez de starbucks',
      'nombre de servicio equivocado en la voz',
      'cómo cambio la tienda en la página de revisión de voz',
      'no reconoció mi tienda del barrio',
      'Tienda está vacía después de hablar',
      'la empresa de la factura salió mal al hablar',
      'escuchó spot a fly en vez de spotify',
      'Primero elige una tienda, qué significa en la voz',
      'cómo corrijo el nombre que escuchó skip',
      'mi tiendita local no la encuentra la voz',
    ],
    answer:
      'Puedes cambiarlo tú.\n\n1. Toca la fila **Tienda** (**Servicio** en una suscripción, **Nombre** en una factura).\n2. Se abre una búsqueda con “¿Dónde lo compraste?”, “¿Qué servicio es?” o “¿De quién es la factura?”. Si Skip no reconoció el nombre, la búsqueda ya trae lo que escuchó, así que solo tienes que corregirlo.\n3. Elige el correcto, o agrega tu propio nombre, y toca **Listo**.\n\nUn recibo necesita una tienda y una suscripción necesita un servicio antes de guardarse. Verás “Primero elige una tienda.” o “Primero elige un servicio.” hasta entonces.\n\nCuando Skip tuvo que adivinar el nombre, recuerda tu corrección para la próxima vez.',
    keywords: ['tienda', 'servicio', 'nombre', 'búsqueda'],
  },
  {
    id: 'voice.names.brand',
    title: '¿Por qué se guardó con otro nombre?',
    questions: [
      'dije comcast pero sale xfinity',
      'Amazon Prime se guardó como Amazon',
      'icloud quedó como apple',
      'la voz cambió el nombre de la empresa',
      'por qué mi suscripción sale con otro nombre del que dije',
      'la voz le cambió el nombre a mi factura por el de la marca',
      'usó el nombre de la empresa matriz',
      'la voz eligió otro nombre de marca',
      'Comcast vs Xfinity',
      'el nombre que dije no es el que se guardó',
    ],
    answer:
      'Skip relacionó lo que dijiste con el nombre que usa la empresa en la lista de tiendas y servicios de Skip. Por ejemplo:\n\n' +
      '- “Comcast” se guarda como **Xfinity**.\n' +
      '- “Amazon Prime” se guarda como **Amazon**.\n' +
      '- “iCloud” se guarda como **Apple**.\n\n' +
      'Así se conserva el logo correcto y tus entradas quedan juntas. Si prefieres tus propias palabras, toca la fila **Tienda**, **Servicio** o **Nombre** antes de guardar y cámbialo. En una factura, puedes escribir cualquier **Nombre** y conservar la empresa por separado.',
    keywords: ['Xfinity', 'Comcast', 'Amazon Prime', 'nombre de marca'],
  },
  {
    id: 'voice.learning',
    title: '¿Skip aprende de mis correcciones?',
    questions: [
      '¿La voz aprende los nombres que corrijo?',
      'se acordará de spotify la próxima vez',
      'cómo aprende skip mis palabras',
      'dónde se guardan mis correcciones de voz',
      'puedo hacer que skip olvide una corrección',
      'sigue usando un nombre equivocado que corregí una vez',
      'mis correcciones de voz se sincronizan con mi otro iPhone',
      'la voz recuerda un nombre mal, cómo lo deshago',
      'skip sube mis correcciones',
      'cuántas correcciones puede recordar',
      'nombres aprendidos voz',
      'borrar lo que aprendió la voz',
    ],
    answer:
      'Sí, con los nombres que Skip tuvo que adivinar. Si escuchó “spot a fly” y lo cambias a Spotify y guardas, Skip recuerda que esas palabras significan Spotify.\n\n' +
      '- Solo aprende cuando cambias un nombre adivinado. Si dijiste un nombre que Skip conoce exactamente, como “Target”, y lo cambiaste, eso es un cambio de opinión, así que no aprende nada.\n' +
      '- Las correcciones se quedan solo en este teléfono. Nunca se suben y no pasan a otro teléfono.\n' +
      '- Guarda hasta 200. Las más antiguas salen primero.\n' +
      '- Para deshacer una, la próxima vez vuelve a poner el nombre con las palabras que realmente dijiste. Eso la elimina.\n' +
      '- Cerrar sesión o eliminar tu cuenta las borra.',
    keywords: ['aprender', 'recordar', 'correcciones', 'olvidar'],
  },

  // Voz: la página de revisión

  {
    id: 'voice.bill-category',
    title: '¿Por qué una factura por voz pregunta para qué es?',
    questions: [
      'qué es la Categoría en una factura por voz',
      'la voz no eligió categoría para mi factura de Verizon',
      'qué es la página ¿De qué es esta factura?',
      'cómo elige la voz la categoría de una factura',
      'categoría equivocada en mi factura por voz',
      'por qué mi factura por voz se llama Luz y gas',
      'el nombre de mi factura quedó como el de la categoría',
      'cambiar la categoría después de decir una factura',
      'lista de categorías de factura por voz',
      'préstamo estudiantil por voz quedó en Otra',
      'xq la factura q dije pide categoría',
    ],
    answer:
      'Toda factura necesita una **Categoría**, y Skip la completa a partir de tus palabras o de la empresa:\n\n' +
      '- Las palabras mandan: “rent” o “mortgage” es **Vivienda**, “electric” es **Luz y gas**, “car insurance” es **Seguros**, “tuition” es **Educación**.\n' +
      '- Una empresa con un solo tipo claro la completa: Xfinity es **Internet**, GEICO es **Seguros**. Las empresas que venden varias cosas, como Verizon o AT&T, te lo dejan a ti.\n\n' +
      'Cuando no hay ninguna, verás “Elige de qué es la factura.” Toca **Categoría** y, en **¿De qué es esta factura?**, elige una de las 10: Vivienda, Luz y gas, Agua y basura, Internet, Celular, Seguros, Transporte, Salud y gastos médicos, Educación u Otra.\n\n' +
      'Una factura sin empresa lleva el nombre de su categoría, así que “Electric bill $85” se guarda como **Luz y gas**. Toca **Nombre** para ponerle otro. Una factura de categoría **Otra**, como “student loan 250 every month”, necesita un **Nombre** que escribas tú.',
    keywords: ['Categoría', '¿De qué es esta factura?', 'tipo de factura', 'Vivienda'],
  },
  {
    id: 'voice.note',
    title: '¿Puedo agregar una nota al agregar por voz?',
    questions: [
      'puedo agregar una nota a una entrada de voz',
      'lo que digo se va a la nota',
      'agregar una nota a un recibo por voz',
      'dónde está la nota en la página de voz',
      'puedo dictarle una nota a skip',
      'el campo de nota está vacío después de hablar',
      'fila Agregar una nota en la página de revisión',
      'cómo escribo una nota al agregar por voz',
      'nota para una factura que dije en voz alta',
      'la voz ignoró las cosas extra que dije',
      'se puede poner un comentario con la voz',
    ],
    answer:
      'Sí, pero la escribes tú. Nada de lo que digas se convierte en nota, porque Skip solo toma el importe, el nombre, la fecha y cada cuánto se repite. Las demás palabras se dejan fuera.\n\n' +
      'En la página de revisión, toca la fila **Nota**, que dice **Agregar una nota**, escríbela y toca **Listo**. Una nota puede tener hasta 200 caracteres y se conserva si cambias entre **Recibo**, **Factura** y **Suscripción**.',
    keywords: ['nota', 'Agregar una nota', 'comentario'],
  },
  {
    id: 'voice.siri',
    title: '¿Puedo agregar cosas con Siri?',
    questions: [
      'puedo usar siri con skip',
      'hey siri agrega un recibo a skip',
      'atajos de siri skip',
      'agregar a skip por voz desde la pantalla bloqueada',
      'puedo agregar por voz sin abrir la app',
      'apple watch voz skip',
      'hay un widget para la entrada por voz',
      'carplay skip',
      'dictarle a skip con siri',
      'un atajo directo a la página de voz',
      'skip funciona con Atajos',
    ],
    answer:
      'No. Skip no funciona con Siri ni con Atajos, y no tiene widget ni app para Apple Watch. La entrada por voz está dentro de Skip: abre la app y toca el botón redondo de voz, en el extremo derecho de la barra de pestañas, en cualquier pestaña.\n\n' +
      'Si te gustaría tener Siri o un atajo, mándalo como idea en **Ajustes → Soporte y comentarios → Comparte una idea**.',
    keywords: ['Siri', 'Atajos', 'widget', 'Apple Watch'],
  },

  {
    id: 'voice.review.page',
    title: '¿Qué es la página que sale después de hablar?',
    questions: [
      '¿Qué es la página ¿Es correcto??',
      'qué significa ¿Skip te escuchó bien?',
      'qué es el recuadro Dijiste',
      'qué estoy viendo después de soltar el micrófono',
      'la página de revisión después de la voz, qué son las filas',
      'por qué dice ¿Skip te escuchó bien? en vez de ¿Es correcto?',
      'qué significa Puedes editarlo más tarde',
      'pantalla de revisión de voz explicada',
      'qué es la página llamada Agregar un recibo después de grabar',
      'qué significa Toca para agregar en una fila de voz',
      'para qué sirve cada fila al terminar de hablar',
    ],
    answer:
      'Es la página de revisión. No se guarda nada hasta que toques **Guardar**.\n\n' +
      '- Arriba: **¿Es correcto?**, o **¿Skip te escuchó bien?** cuando tiene menos certeza, por ejemplo cuando no se escuchó ningún importe.\n' +
      '- **Dijiste** muestra tus palabras entre comillas.\n' +
      '- **Agregar como** cambia entre **Recibo**, **Factura** y **Suscripción**.\n' +
      '- La cifra grande es el importe. Tócala para cambiarlo.\n' +
      '- Las filas de abajo tienen el resto: la tienda, el servicio o el nombre de la factura, la fecha, cada cuánto se repite, **Pagado con** y una **Nota**. Una fila que dice **Toca para agregar** todavía hace falta. Toca cualquier fila para cambiarla.\n' +
      '- Al final: **Guardar**, **Dilo otra vez** y **Más opciones**.\n\n' +
      '“Puedes editarlo más tarde.” significa que siempre puedes abrir la entrada guardada y cambiarla.',
    keywords: ['¿Es correcto?', '¿Skip te escuchó bien?', 'Dijiste', 'página de revisión'],
  },
  {
    id: 'voice.review.required',
    title: '¿Por qué no puedo guardar mi entrada de voz?',
    questions: [
      '¿Por qué no puedo guardar lo que dije?',
      'el botón guardar está gris en la página de voz',
      'la entrada de voz no se guarda',
      'qué significa Elige de qué es la factura',
      'dice Elige la primera fecha de vencimiento',
      'Ponle un nombre a la factura, dónde lo hago',
      'qué falta en la página de revisión de voz',
      'el botón guardar recibo no funciona después de la voz',
      'por qué está desactivado guardar factura',
      'qué tengo que llenar antes de guardar una factura por voz',
      'Ingresa cuánto gastaste sale debajo del botón',
      'no me deja guardar xq falta algo',
    ],
    answer:
      'Todavía falta algo que Skip necesita. La línea que está encima de **Guardar** dice qué:\n\n' +
      '- “Elige el importe que quisiste decir.” Elige uno en **¿Qué importe quisiste decir?**\n' +
      '- “Elige de qué es la factura.” Toca **Categoría** y elige una.\n' +
      '- “Primero elige una tienda.” o “Primero elige un servicio.” Toca la fila **Tienda** o **Servicio**.\n' +
      '- “Ingresa cuánto gastaste.” o “Ingresa cuánto cuesta.” Toca el importe.\n' +
      '- “Ponle un nombre a la factura.” Toca **Nombre**.\n' +
      '- “Elige la primera fecha de vencimiento.” Toca **Fecha de vencimiento**.\n\n' +
      'Las filas que todavía hacen falta dicen **Toca para agregar**. Si la línea dice “Algo salió mal. Inténtalo de nuevo.”, falló el guardado en sí. Revisa tu conexión y toca **Guardar** otra vez.',
    keywords: ['guardar gris', 'desactivado', 'falta algo', 'Fecha de vencimiento'],
  },
  {
    id: 'voice.review.more-options',
    title: '¿Qué hace Más opciones?',
    questions: [
      '¿Qué es Más opciones en la página de voz?',
      'cómo abro el formulario completo desde la voz',
      'puedo agregar un recordatorio desde la página de revisión',
      'botón más opciones de la voz',
      'quiero poner más detalles de los que muestra la voz',
      'cómo abro el formulario normal con lo que dije',
      'dónde está el recordatorio al agregar por voz',
      'qué pasa si toco más opciones',
      'más opciones o guardar',
      'más campos al agregar por voz',
    ],
    answer:
      '**Más opciones** abre el formulario completo de ese tipo, con todo lo que Skip escuchó ya llenado. Úsalo cuando quieras un campo que la página de revisión no muestra, como el **Recordatorio** de una factura.\n\n' +
      'Luego el formulario pide lo que siempre pide. En una factura o suscripción, eso incluye **Se paga con** (**Se cobra a** en una suscripción) y **Recordatorio**, donde **Sin recordatorio** es una respuesta válida. Si guardas desde ahí, también vuelves a **Inicio**.\n\n' +
      'Tus palabras y los cambios que hiciste te acompañan, así que no tienes que decir nada otra vez.',
    keywords: ['Más opciones', 'formulario completo', 'recordatorio', 'todos los campos'],
  },
  {
    id: 'voice.review.start-over',
    title: '¿Cómo cancelo o repito una entrada de voz?',
    questions: [
      'cancelar una entrada de voz',
      '¿Cómo empiezo de nuevo en la página de voz?',
      'qué hace Dilo otra vez',
      'cancelar agregar por voz',
      'quiero tirar lo que dije',
      'qué significa ¿Dejar de agregar este recibo?',
      'el gesto de deslizar para volver ya no funciona en la página de revisión',
      'cómo repito una grabación',
      'salir de la entrada de voz sin guardar',
      'toqué la X en la página de voz, se guarda',
      'volver al micrófono',
      'como borro lo q grabé',
    ],
    answer:
      'Hay tres formas de salir, y ninguna guarda nada:\n\n' +
      '- **Dilo otra vez** te lleva de vuelta al micrófono para intentarlo de nuevo.\n' +
      '- La flecha de regreso también vuelve al micrófono.\n' +
      '- La **X** de arriba lo cierra todo y te lleva a **Inicio**.\n\n' +
      'La **X** siempre pregunta antes, por ejemplo “¿Dejar de agregar este recibo?” con “No se guardará nada de lo que ingresaste aquí.” La flecha de regreso y **Dilo otra vez** preguntan solo cuando ya cambiaste algo. Toca **Sí** para descartarlo, o **Volver** para seguir trabajando.\n\n' +
      'Cuando ya cambiaste algo, el gesto de deslizar para volver se desactiva en esa página, para que un deslizamiento sin querer no te haga perder el trabajo.',
    keywords: ['Dilo otra vez', 'cancelar', 'empezar de nuevo', 'descartar'],
  },
  {
    id: 'voice.after-save',
    title: '¿Qué pasa después de guardar una entrada de voz?',
    questions: [
      'a dónde se fue mi recibo de voz',
      '¿A dónde va mi entrada de voz después de guardarla?',
      'guardé por voz, dónde está',
      'un recibo de voz es igual a uno escrito',
      'en qué libro de recibos queda un recibo de voz',
      'puedo editar algo que agregué por voz',
      'después de guardar por voz me mandó a inicio, es normal',
      'la entrada de voz aparece en actividad',
      'dónde encuentro la factura que guardé por voz',
      'se guardó mi entrada de voz',
      'cómo cambio una entrada de voz después',
    ],
    answer:
      'Se guarda igual que una que escribiste. Vuelves a **Inicio**, y una nota breve abajo dice **Recibo agregado**, **Factura agregada** o **Suscripción agregada**.\n\n' +
      '- Un recibo va a tu libro de recibos predeterminado, o a **General** si no elegiste uno. Aparece en **Recibos**, **Actividad** y en **Inicio**.\n' +
      '- Una factura aparece en **Facturas mensuales**, y una suscripción en **Suscripciones**.\n\n' +
      'Para cambiarla después, tócala para abrir su página y luego toca el lápiz de arriba. Tus palabras habladas no se guardan con ella, solo los detalles que guardaste.',
    keywords: ['después de guardar', 'dónde está', 'Recibo agregado', 'editar'],
  },
  {
    id: 'voice.reminder',
    title: '¿Una factura por voz tiene recordatorio?',
    questions: [
      '¿Me avisarán de una factura que agregué por voz?',
      'la suscripción por voz no tiene recordatorio',
      'cómo agrego un recordatorio a una factura por voz',
      'agregué la renta por voz y no me llegó recordatorio',
      'la voz pone recordatorios',
      'falta el recordatorio en una factura que dije',
      'puede la voz avisarme antes de que se renueve netflix',
      'poner recordatorio después de agregar por voz',
      'por qué mi factura por voz no me avisó',
      'ajuste de recordatorio en la entrada de voz',
    ],
    answer:
      'No. Una factura o suscripción guardada desde la página de revisión de voz no tiene recordatorio. Puedes agregarlo en unos toques:\n\n' +
      '1. Abre la factura o suscripción.\n' +
      '2. Toca el lápiz de arriba.\n' +
      '3. Configura **Recordatorio** y guarda.\n\n' +
      'También puedes activar los recordatorios de cualquier factura o suscripción en **Ajustes → Preferencias → Recordatorios**.\n\n' +
      'Para configurar el recordatorio al agregar, toca **Más opciones** en la página de revisión en vez de **Guardar**. El formulario completo pide el **Recordatorio** antes de guardar.',
    keywords: ['recordatorio', 'aviso', 'avisar', 'factura por voz'],
  },
  {
    id: 'voice.paid-with',
    title: '¿Cómo digo con qué tarjeta pagué?',
    questions: [
      '¿Puedo decir qué tarjeta usé?',
      'dije con mi Amex pero Pagado con está vacío',
      'cómo pongo con qué pagué en un recibo de voz',
      'la voz no eligió mi tarjeta',
      'qué es Se cobra a en la página de voz',
      'por qué no hay fila Pagado con en la página de voz',
      'pagué con apple pay por voz',
      'decir visa elige la tarjeta',
      'elegir tarjeta para la entrada de voz',
      'pagado desde mi cuenta de banco por voz',
      'xq no agarra la tarjeta q dije',
    ],
    answer:
      'Decir la tarjeta no la elige. Skip oye “on my Amex” o “with Apple Pay” y sabe que no es la tienda, pero la tarjeta la eliges tú:\n\n' +
      '1. En la página de revisión, toca **Pagado con** (**Se paga con** en una factura y **Se cobra a** en una suscripción).\n' +
      '2. Elige la tarjeta o la cuenta bancaria y toca **Listo**.\n\n' +
      'Si lo dejas vacío, la entrada se guarda sin tarjeta ni cuenta, así que no mueve el saldo de ninguna tarjeta ni cuenta. La fila solo aparece cuando ya tienes al menos una tarjeta o cuenta en **Tarjetas**.',
    keywords: ['Pagado con', 'Se cobra a', 'tarjeta', 'Amex'],
  },

  // Voz: mensajes y problemas

  {
    id: 'voice.multiple',
    title: '¿Por qué dice “Parece que es más de uno”?',
    questions: [
      'netflix y spotify juntos por voz',
      '¿Qué significa Parece que es más de uno?',
      'puedo agregar dos cosas a la vez por voz',
      'dije netflix y spotify y no lo agregó',
      'mensaje de agrégalos uno por uno',
      'la voz no acepta dos recibos juntos',
      'puedo decir todas mis facturas de una vez',
      'dije la renta y la luz juntas',
      'varios artículos por voz',
      'por qué no puedo decir dos compras',
      'dos entradas en una frase',
      'xq no deja decir 2 cosas seguidas',
    ],
    answer:
      'Skip escuchó dos cosas distintas de una sola vez, como “Netflix 15.99 and Spotify 11.99” o “$12 at Starbucks and $40 at Target”. Una página de revisión contiene una sola entrada, así que no se guarda nada y la página dice “Parece que es más de uno. Agrégalos uno por uno.”\n\n' +
      'Mantén presionado el micrófono y di solo la primera, guárdala y luego toca otra vez el botón de voz para la siguiente.\n\n' +
      'Una corrección como “forty, no, fifty”, o nombrar la tarjeta con la que pagaste, sigue siendo una sola entrada.',
    keywords: ['Parece que es más de uno', 'uno por uno', 'dos', 'varios'],
  },
  {
    id: 'voice.nothing-heard',
    title: '¿Por qué dice “Mantén presionado el botón mientras hablas”?',
    questions: [
      '¿Qué significa Mantén presionado el botón mientras hablas?',
      'skip no escuchó nada',
      'toqué el micrófono y no pasó nada',
      'el micro se detiene en cuanto lo suelto',
      'no sale nada cuando hablo',
      'solo dice Escuchando y no aparece nada',
      'la voz no capta mis palabras',
      'tengo que mantener el dedo en el micrófono',
      'dejó de escuchar de inmediato',
      'mis palabras no aparecen en la página de voz',
      'toco el micro y no graba',
    ],
    answer:
      'Significa que Skip no recibió ninguna palabra. Normalmente se tocó el micrófono en vez de mantenerlo presionado, o soltaste antes de hablar.\n\n' +
      '1. Presiona y mantén el dedo sobre el micrófono.\n' +
      '2. Espera un momento a que aparezca **Escuchando…** y luego habla.\n' +
      '3. Suelta solo cuando hayas terminado.\n\n' +
      'Tu dedo puede salirse del botón mientras hablas. Solo levantarlo termina la grabación. Si **Escuchando…** se queda y no aparecen palabras, busca un lugar más tranquilo, acerca el teléfono y asegúrate de que nada más esté usando el micrófono, como una llamada.',
    keywords: ['Mantén presionado para hablar', 'Escuchando', 'no escuchó', 'tocar o mantener'],
  },
  {
    id: 'voice.mishears',
    title: 'La voz me entiende mal',
    questions: [
      'la voz entiende mal mis palabras',
      'skip no entiende mi acento',
      'el reconocimiento de voz es malo',
      'por qué escucha palabras equivocadas',
      'escribe puras tonterías cuando hablo',
      'la voz es imprecisa',
      'me volvió a entender mal',
      'cómo mejoro lo que oye el micrófono',
      'funciona la voz con ruido de fondo',
      'nunca capta los nombres de mis tiendas',
      'xq la voz entiende mal lo q digo',
    ],
    answer:
      'Skip convierte tu voz en palabras con el reconocimiento de voz de Apple, que escucha inglés de Estados Unidos, y luego lee esas palabras en tu teléfono. Algunas cosas ayudan:\n\n' +
      '- Habla en un lugar tranquilo, cerca del teléfono.\n' +
      '- Di los nombres con claridad y pon “at” antes de una tienda que Skip tal vez no conozca: “at Joe’s Diner”.\n' +
      '- Di el dinero como “$12.50” o “twelve dollars fifty”.\n' +
      '- Corrige los errores en la página de revisión. Cuando Skip tuvo que adivinar un nombre, recuerda tu corrección.\n' +
      '- Los audífonos Bluetooth, como los AirPods, también funcionan.\n\n' +
      'Skip ayuda al reconocimiento de Apple pasándole una lista de nombres de tiendas y servicios, empezando por los que ya usas, así que tus lugares de siempre se vuelven más fáciles con el tiempo. Siempre puedes agregar a mano con **Agregar rápido** en **Inicio**.',
    keywords: ['entiende mal', 'acento', 'palabras equivocadas', 'ruido'],
  },
  {
    id: 'voice.permissions.first',
    title: '¿Por qué la voz pide permiso?',
    questions: [
      '¿Por qué Skip quiere mi micrófono?',
      'para qué es el permiso de reconocimiento de voz',
      'la primera vez solo salió una ventanita',
      'Todo listo. Mantén presionado para hablar, y ahora qué',
      'skip necesita acceso al micrófono',
      'salieron dos ventanas de permiso al tocar el micro',
      '¿Debo permitir el reconocimiento de voz para Skip Budget?',
      'por qué no grabó nada la primera vez',
      'es seguro permitir el micrófono',
      'permiso del micro skip',
    ],
    answer:
      'La voz necesita dos cosas de tu iPhone: el **Micrófono**, para oírte, y el **Reconocimiento de voz**, para convertir lo que dices en palabras.\n\n' +
      'La primera vez que presionas el micrófono, el iPhone pide ambos, y esa pulsación solo pide permiso. Nunca graba detrás de las ventanas. Cuando permites los dos, la página dice “Todo listo. Mantén presionado para hablar.” Mantén presionado otra vez para empezar.\n\n' +
      'Skip solo usa el micrófono mientras mantienes presionado el botón en **Registrar un movimiento**. Nunca lo abre por su cuenta, ni cuando se abre la página ni cuando vuelves a ella.',
    keywords: ['permiso', 'micrófono', 'reconocimiento de voz', 'permitir'],
  },
  {
    id: 'voice.permissions.denied',
    title: 'El micrófono o el reconocimiento de voz está desactivado',
    questions: [
      'dice que active Micrófono y Reconocimiento de voz',
      'dije que no al micrófono, cómo lo arreglo',
      'la voz dice Abrir Configuración',
      'cómo permito el micrófono para skip budget',
      'negué el reconocimiento de voz por error',
      'dónde activo el micro para skip',
      'permiso del micrófono desactivado',
      'voz bloqueada en ajustes',
      'El micrófono o el reconocimiento de voz está desactivado',
      'apagué el micrófono de skip, cómo lo deshago',
      'no me deja usar la voz xq negué el permiso',
    ],
    answer:
      'Una vez que dijiste que no, solo los ajustes de tu iPhone pueden volver a activarlo:\n\n' +
      '1. En la página de voz, toca **Abrir Configuración**. Te lleva directo a los ajustes de Skip Budget.\n' +
      '2. Activa **Micrófono** y **Reconocimiento de voz**.\n' +
      '3. Regresa a Skip. La página vuelve a revisar sola, así que ya puedes mantener presionado el micrófono y hablar.\n\n' +
      'También puedes abrir la app **Ajustes** del iPhone y bajar hasta **Skip Budget**. Escribir las entradas funciona todo el tiempo.',
    keywords: [
      'Abrir Configuración',
      'permiso denegado',
      'micrófono apagado',
      'reconocimiento de voz apagado',
    ],
  },
  {
    id: 'voice.unavailable',
    title: 'La voz no está disponible en este iPhone',
    questions: [
      '¿Por qué dice Voz no está disponible en este iPhone en este momento?',
      'voz no disponible',
      'la página de voz dice agrégalo a mano',
      'la voz no funciona en mi iPhone',
      'hace falta el dictado para la voz de skip',
      'voz no disponible sin internet',
      'mi iphone dice que la voz no está disponible',
      'por qué hay botones de Recibo Factura Suscripción en la página de voz',
      'la voz dejó de funcionar por completo',
      'no puedo usar la voz en mi iPhone viejo',
      'xq no me deja usar la voz',
    ],
    answer:
      'El reconocimiento de voz de Apple no está listo en tu iPhone por ahora. Los motivos habituales:\n\n' +
      '- **El dictado está desactivado.** Actívalo en **Ajustes → General → Teclado → Activar dictado** del iPhone.\n' +
      '- **Sin internet**, en un teléfono que no puede reconocer la voz en el propio dispositivo. Conéctate e inténtalo de nuevo.\n\n' +
      'Mientras tanto, la página ofrece **Agrégalo a mano**, con botones **Recibo**, **Factura** y **Suscripción** que abren los formularios normales. Si regresas o guardas desde uno de ellos, vuelves a donde estabas, no al micrófono.',
    keywords: ['no disponible', 'Agrégalo a mano', 'dictado', 'Siri'],
  },
  {
    id: 'voice.error',
    title: 'La voz dice que algo salió mal',
    questions: [
      'la página de voz dice Algo salió mal',
      'error en la página de registrar un movimiento',
      'la voz falló',
      'la página de revisión no guarda, algo salió mal',
      'error al soltar el micrófono',
      'la voz se trabó',
      'dijo algo salió mal al guardar mi recibo de voz',
      'mensaje de error de la voz',
      'algo salió mal después de hablar',
      'la voz siempre falla',
      'sale error cuando uso la voz',
    ],
    answer:
      '“Algo salió mal. Inténtalo de nuevo.” puede aparecer en dos momentos distintos:\n\n' +
      '- **En la página del micrófono**, la grabación en sí no funcionó. Mantén presionado el micrófono y dilo otra vez. Si sigue pasando, cierra Skip por completo y ábrelo de nuevo.\n' +
      '- **En la página de revisión, encima de Guardar**, el guardado no llegó a tu cuenta, casi siempre por la conexión. Todo lo que configuraste sigue ahí. Revisa que estés en línea y toca **Guardar** otra vez.\n\n' +
      'Un toque en **Guardar** crea una sola entrada, así que intentarlo de nuevo no la agrega dos veces. Si nunca funciona, cuéntanoslo en **Ajustes → Soporte y comentarios → Escribir a soporte**.',
    keywords: ['error', 'falló', 'Algo salió mal', 'error de voz'],
  },
  {
    id: 'voice.stale',
    title: '¿Qué significa “Aún no hay nada que revisar”?',
    questions: [
      '¿Qué significa Aún no hay nada que revisar?',
      'la página de voz dice di lo que quieres agregar y skip lo mostrará aquí',
      'botón Empezar de nuevo en la voz',
      'mi entrada de voz desapareció antes de guardar',
      'la página de revisión de voz quedó vacía',
      'la revisión de voz perdió mis palabras',
      'página de voz vacía',
      'se abrió una página sin nada que revisar',
      'borrador de voz perdido',
      'qué es empezar de nuevo',
    ],
    answer:
      'La página de revisión se abrió sin nada detrás. Pasa cuando la entrada ya se guardó o se canceló, cuando volviste a una página de voz vieja, o cuando Skip redibujó sus páginas, por ejemplo después de cambiar el tamaño del texto.\n\n' +
      'Toca **Empezar de nuevo** para volver al micrófono y decirlo otra vez. No se guardó nada del intento perdido a menos que ya hubieras tocado **Guardar**.',
    keywords: ['Aún no hay nada que revisar', 'Empezar de nuevo', 'vacío', 'perdido'],
  },
  {
    id: 'voice.offline',
    title: '¿La voz funciona sin internet?',
    questions: [
      'voz sin wifi',
      'puedo usar la voz sin conexión',
      'voz en modo avión',
      'entrada por voz sin señal',
      'la voz necesita wifi',
      'la voz no guarda sin internet',
      'registrar un movimiento sin conexión',
      'funciona la voz en el dispositivo sin conexión',
      'voz sin datos',
      '¿La voz necesita internet?',
      'guardar una entrada de voz después cuando haya internet',
    ],
    answer:
      'En parte. Muchos iPhone pueden convertir la voz en palabras en el propio dispositivo, así que el micrófono puede funcionar sin internet. Los teléfonos que no pueden muestran “Voz no está disponible en este iPhone en este momento.” hasta que vuelvas a tener conexión.\n\n' +
      'Guardar siempre necesita conexión, porque las entradas se guardan en tu cuenta. Sin ella, **Guardar** muestra “Algo salió mal. Inténtalo de nuevo.” y conserva todo lo que configuraste, así que puedes tocar **Guardar** otra vez cuando estés en línea. No se guarda nada para enviarlo después.\n\n' +
      'Sin conexión, Skip también puede no reconocer nombres de tiendas que normalmente conoce.',
    keywords: ['sin conexión', 'sin internet', 'modo avión', 'wifi'],
  },

  // Voz: privacidad, idiomas, planes, accesibilidad

  {
    id: 'voice.on-device',
    title: '¿Mi voz se procesa en mi teléfono o en Apple?',
    questions: [
      'mi voz va a apple',
      '¿Mi voz sale de mi teléfono?',
      'el reconocimiento de voz se hace en el dispositivo',
      'apple escucha lo que digo en skip',
      'a dónde va lo que hablo',
      'la entrada por voz es privada',
      'skip manda mi voz a un servidor',
      'reconocimiento de voz en el dispositivo skip',
      'privacidad de la voz con servidores de apple',
      'quién escucha mis entradas de voz',
      'skip usa un tercero para el habla',
      'mi voz se envía por internet',
      'xq mi voz va a apple',
    ],
    answer:
      'Apple convierte tus palabras en texto con el reconocimiento de voz integrado en el iPhone. Skip no usa ningún otro servicio de voz y no tiene un servidor de voz propio.\n\n' +
      '- Cuando tu iPhone puede reconocer la voz en el propio dispositivo, tu voz se queda en el teléfono.\n' +
      '- Cuando no puede, el audio va al servicio de voz de Apple para convertirse en texto, bajo los términos de privacidad de Apple.\n' +
      '- Después, Skip lee ese texto en tu teléfono con reglas sencillas, no con IA, para encontrar el importe, el nombre y la fecha.\n\n' +
      'Solo los detalles que revisas y guardas van a tu cuenta. Skip nunca guarda el audio.',
    keywords: ['en el dispositivo', 'Apple', 'reconocimiento de voz', 'privacidad'],
  },
  {
    id: 'voice.recording-stored',
    title: '¿Se graba o se guarda mi voz?',
    questions: [
      'mi voz se graba',
      'la entrada por voz guarda una grabación mía',
      '¿Skip graba mi voz?',
      'se guardan mis grabaciones de voz',
      'skip guarda lo que dije',
      'el audio se almacena en algún lado',
      'alguien puede escuchar después mis entradas de voz',
      'skip guarda la transcripción',
      'mi voz se guarda en sus servidores',
      'mis palabras habladas se guardan con el recibo',
      'borrar mis grabaciones de voz',
      '¿se guardan datos de mi voz?',
    ],
    answer:
      'No. Skip nunca graba ni conserva el audio, ni en tu teléfono ni en nuestros servidores, así que no hay grabaciones que borrar.\n\n' +
      'Mientras estás en la página de revisión, las palabras que dijiste viven solo en la memoria de la app, y por eso las ves en **Dijiste**. Se borran cuando guardas, cancelas o cierras sesión. El recibo, la factura o la suscripción guardados solo contienen sus detalles, como el importe, el nombre y la fecha, exactamente como si los hubieras escrito.\n\n' +
      'Lo único que la voz conserva es la lista de correcciones de nombres que hiciste, como “spot a fly” que significa Spotify. Eso se queda en este teléfono y se borra al cerrar sesión.',
    keywords: ['grabación', 'audio', 'guardado', 'transcripción'],
  },
  {
    id: 'voice.languages',
    title: '¿Qué idiomas entiende la voz?',
    questions: [
      '¿Puedo hablarle a skip en español?',
      'la voz funciona en francés',
      'qué idioma entiende la voz',
      'voz en otros idiomas',
      'tengo la app en español pero la voz quiere inglés',
      'la voz entiende acento británico',
      'puedo decir pesos en vez de dólares',
      '¿La voz es solo en inglés?',
      'por qué los ejemplos de voz están en inglés',
      'puedo hablar en español con skip',
      'la voz funciona si mi iPhone está en otro idioma',
      'hablar en español no funciona',
    ],
    answer:
      'La voz entiende solo inglés hablado, incluso cuando Skip está en **Español** o **Français**. En esos idiomas, la página de voz lo dice encima de los ejemplos, y los ejemplos se quedan en inglés.\n\n' +
      'Cualquier acento sirve. Skip escucha inglés de Estados Unidos, así que las palabras y la ortografía estadounidenses funcionan mejor. Los importes se guardan en la moneda que Skip muestra, así que “20 pounds” y “$20” se guardan como 20.\n\n' +
      'Todo lo demás en Skip funciona en inglés, español y francés.',
    keywords: ['idioma', 'español', 'francés', 'solo inglés'],
  },
  {
    id: 'voice.pro.rules',
    title: '¿La entrada por voz es gratis o Pro?',
    questions: [
      '¿La entrada por voz es parte de Skip Pro?',
      'por qué necesito pro para la voz',
      'pueden los usuarios gratis usar el micrófono',
      'voz en el plan gratis',
      'cuántas entradas de voz tengo',
      'la voz cuenta para mis 15 escaneos',
      'hay límite de entradas de voz con pro',
      'la voz está bloqueada',
      'qué es la página Solo dilo',
      'cómo desbloqueo la entrada por voz',
      'la voz es gratis o de pago',
    ],
    answer:
      'La entrada por voz es parte de Skip Pro.\n\n' +
      '- En el plan gratis, el botón redondo de voz lleva una insignia **Pro**. Al tocarlo se abre **Solo dilo**, una página sobre lo que puede hacer la voz, con **Obtener Skip Pro** y **Ahora no**.\n' +
      '- Con Pro no hay límite. Agrega todos los recibos, facturas y suscripciones que quieras por voz.\n' +
      '- Los recibos por voz no usan el límite mensual de escaneos ni de subidas. Eso cuenta solo los recibos leídos con la cámara o desde una foto o archivo.\n\n' +
      'Agregar cosas escribiéndolas es gratis en todos los planes.',
    keywords: ['Pro', 'gratis', 'bloqueado', 'Solo dilo'],
  },
  {
    id: 'voice.pro.ended',
    title: '¿Qué pasa con las entradas de voz si termina Pro?',
    questions: [
      'cancelé pro, qué pasa con mis entradas de voz',
      'Si cancelo Pro, ¿se quedan mis entradas de voz?',
      'recibos de voz cuando termina mi prueba',
      'pro venció, y lo que agregué por voz',
      'puedo editar facturas de voz sin pro',
      'el botón de voz volvió a tener insignia pro',
      'mi página de voz ahora me manda a pro',
      'perdí la voz cuando terminó pro',
      'cancelar pro borra los recibos de voz',
      'la voz dejó de funcionar al terminar mi suscripción',
      'bajé de plan y la voz desapareció',
    ],
    answer:
      'Todo lo que guardaste por voz se queda. Es un recibo, una factura o una suscripción como cualquier otro, y puedes abrirlo, editarlo o eliminarlo en cualquier plan. Como con todo en el plan gratis, las listas muestran los últimos 90 días y las entradas más antiguas quedan fuera de la vista.\n\n' +
      'Lo que cambia es agregar nuevas por voz. El botón redondo vuelve a mostrar la insignia **Pro** y abre la página de Pro en vez del micrófono. Si Pro termina cuando estás a la mitad de una entrada de voz, Skip muestra la página de Pro y no se guarda nada.\n\n' +
      'Tus correcciones de nombres se quedan en el teléfono, listas por si vuelves a Pro.',
    keywords: ['Pro terminó', 'cancelado', 'venció', 'prueba terminada'],
  },
  {
    id: 'voice.voiceover',
    title: '¿Puedo usar la entrada por voz con VoiceOver?',
    questions: [
      'cómo uso la voz con VoiceOver activado',
      'voiceover mantener para hablar no funciona',
      'usuario ciego entrada por voz',
      'doble toque para empezar a hablar',
      'Toca para hablar en vez de mantener',
      'la voz funciona con un lector de pantalla',
      'voiceover lee escuchando',
      'accesibilidad entrada por voz',
      'no puedo mantener el micrófono con voiceover',
      'qué es Toca cuando termines',
    ],
    answer:
      'Sí. Con VoiceOver activado, no necesitas mantener presionado el botón:\n\n' +
      '1. Toca dos veces **Grabar** para empezar. VoiceOver dice “Escuchando” primero, y el micrófono se abre solo cuando termina de hablar, para que su voz no se transcriba.\n' +
      '2. Habla.\n' +
      '3. Toca dos veces otra vez cuando termines. VoiceOver dice “Detenido”.\n\n' +
      'Las palabras debajo del botón cambian a **Toca para hablar** y **Toca cuando termines**. En la página de revisión, VoiceOver llega primero a la pregunta, **¿Es correcto?**, y cada fila lee su nombre y su valor.',
    keywords: ['VoiceOver', 'lector de pantalla', 'accesibilidad', 'doble toque'],
  },
  {
    id: 'voice.cant-add',
    title: '¿Qué no puedo agregar por voz?',
    questions: [
      '¿Puedo agregar mi salario por voz?',
      'voz para tarjetas de crédito',
      'dije me pagaron y lo hizo recibo',
      'puede la voz eliminar algo',
      'agregar ahorros por voz',
      'puedo editar una factura con mi voz',
      'qué tipos funcionan con la voz',
      'sueldo por voz',
      '¿La voz solo hace tres cosas?',
      'agregar un hábito por voz',
      'puedo agregar una meta hablando',
      'préstamo por voz',
    ],
    answer:
      'La voz agrega tres cosas: recibos, facturas y suscripciones. No puede agregar sueldo, tarjetas, cuentas bancarias, préstamos, hábitos, ahorros ni metas, y tampoco puede editar ni eliminar algo ya guardado.\n\n' +
      'Si dices “got my paycheck 3,700”, Skip no sabe que es un pago de sueldo. Muestra un recibo que adivinó, así que toca la **X** para cerrarlo y agrega tu sueldo en **Tarjetas → Salario**.\n\n' +
      'Si te gustaría que la voz hiciera más, mándalo en **Ajustes → Soporte y comentarios → Comparte una idea**.',
    keywords: ['salario', 'sueldo', 'tarjetas', 'no compatible'],
  },

  // Privacidad y tus datos

  {
    id: 'privacy.stored.what',
    title: '¿Qué guarda Skip sobre mí?',
    questions: [
      '¿Qué datos recopila Skip?',
      'qué información guardan de mí',
      'qué sabe skip de mí',
      'qué datos personales se guardan',
      'qué guardan de mi cuenta',
      'lista de los datos míos que tiene skip',
      'skip guarda mi correo',
      'guardan mi nombre',
      'qué hay en mi cuenta de skip',
      'datos que recopila skip budget',
      'qué info se guarda cuando me registro',
      'skip guarda mi zona horaria',
    ],
    answer:
      'Solo lo que tú ingresas, más lo necesario para que tu cuenta funcione:\n\n' +
      '- **Tu cuenta**: tu correo, o el identificador de inicio de sesión que nos da Apple o Google si los usas.\n' +
      '- **Tu perfil**: el nombre para mostrar y la imagen que eliges del conjunto de Skip, y la zona horaria de tu teléfono, para que las fechas y los recordatorios sigan tu día.\n' +
      '- **Tu dinero**: las facturas, suscripciones, recibos, préstamos, sueldo, ahorros, metas, hábitos y pagos de tarjeta que ingresas, y el registro de lo que han cobrado tus facturas y suscripciones.\n' +
      '- **Tus tarjetas y cuentas**: el nombre que les pones, la red o el banco, un color, un saldo que escribes, un día de vencimiento y, como máximo, los últimos cuatro dígitos.\n' +
      '- **Tus ajustes**: tus recordatorios, si tienes Skip Pro y, si activas los recordatorios, la dirección de notificaciones de tu teléfono para que lleguen.\n\n' +
      'Skip nunca pide un número de tarjeta completo, fecha de vencimiento, código de seguridad ni acceso a tu banco. Hay más detalle en **Ajustes → Acerca de → Política de privacidad**.',
    keywords: ['datos', 'recopilar', 'información personal', 'política de privacidad'],
  },
  {
    id: 'privacy.stored.where',
    title: '¿Dónde se guardan mis datos?',
    questions: [
      'dónde se guardan mis datos',
      '¿Mis datos están en mi teléfono o en la nube?',
      'dónde guarda skip mi información',
      'skip hace copia de seguridad de mis datos',
      'mi presupuesto se guarda en línea',
      'si pierdo mi teléfono pierdo todo',
      'mis datos están en el servidor',
      'skip usa icloud',
      'dónde se guardan mis entradas',
      'se guarda algo en el propio teléfono',
      'almacenamiento en la nube skip',
      'respaldo de skip',
    ],
    answer:
      'Tus entradas se guardan en tu cuenta de Skip, en nuestro servidor, no solo en el teléfono. Por eso vuelven cuando inicias sesión en un teléfono nuevo, y por eso tus teléfonos muestran lo mismo.\n\nAlgunas cosas pertenecen al teléfono y se quedan ahí: la apariencia, el idioma, la respuesta háptica y el bloqueo de la app, tus correcciones de nombres de voz, y la lista de tiendas que Skip recuerda para ti.\n\nSkip no guarda tus entradas en iCloud. Si pierdes tu teléfono, inicia sesión en el nuevo y ahí están todas.',
    keywords: ['nube', 'servidor', 'copia de seguridad', 'iCloud'],
  },
  {
    id: 'privacy.phone-only',
    title: '¿Qué nunca sale de mi teléfono?',
    questions: [
      '¿Qué se queda solo en mi teléfono?',
      'qué no va a su servidor',
      'el escaneo se hace en el teléfono',
      'qué datos nunca se suben',
      'datos solo locales',
      'los datos de face id se mandan a skip',
      'skip ve mi face id',
      'qué se guarda en el dispositivo',
      'qué datos quedan privados en mi iphone',
      'procesamiento en el dispositivo skip',
      'las fotos de mis recibos se suben',
    ],
    answer:
      'Esto se queda en tu iPhone y nunca se nos envía:\n\n' +
      '- **Fotos de recibos.** Los escaneos y las subidas los lee el teléfono con el reconocimiento de texto de Apple. La imagen no se sube; Skip guarda solo los detalles que confirmas.\n' +
      '- **Tu voz**, cuando tu iPhone puede reconocer la voz en el propio dispositivo.\n' +
      '- **Los ajustes de apariencia, respuesta háptica y bloqueo de la app**, y tu elección de idioma.\n' +
      '- **Las correcciones de nombres de voz** y la lista de tiendas que Skip recuerda para ti. Los recibos en sí, con los nombres de tienda incluidos, se guardan en tu cuenta.\n' +
      '- **Face ID.** El bloqueo de la app le pide al iPhone que verifique que eres tú. Skip nunca ve los datos de tu rostro.\n\n' +
      'Como viven en el teléfono, no pasan a uno nuevo.',
    keywords: ['en el dispositivo', 'local', 'nunca se sube', 'Face ID'],
  },
  {
    id: 'privacy.bank',
    title: '¿Skip necesita mi acceso al banco o el número de tarjeta?',
    questions: [
      '¿Tengo que darle a Skip la contraseña de mi banco?',
      'skip pide el número de mi tarjeta',
      'guarda el número completo de mi tarjeta',
      'skip puede mover dinero de mi cuenta',
      'necesitan mi usuario de banca en línea',
      'por qué solo los últimos cuatro dígitos',
      'skip puede ver mis movimientos del banco',
      'mi cuenta de banco está vinculada a skip',
      'skip me va a cobrar alguna vez',
      'skip tiene acceso a mi banco',
      'código de seguridad de la tarjeta skip',
      'piden cvv',
    ],
    answer:
      'No. Skip nunca pide ni guarda el acceso a tu banco, un número de tarjeta completo, una fecha de vencimiento ni un código de seguridad. Como máximo guarda los últimos cuatro dígitos de una tarjeta, para que distingas tus tarjetas.\n\n' +
      'Skip no se conecta a tu banco para nada. No puede ver los movimientos de tu banco y no puede mover, retener, enviar ni recibir dinero. Todo lo que hay en Skip es algo que tú le dijiste, escribiendo, escaneando un recibo o hablando.\n\n' +
      'El único pago del que Skip forma parte es Skip Pro, y de eso se encarga Apple.',
    keywords: ['contraseña del banco', 'número de tarjeta', 'CVV', 'últimos cuatro'],
  },
  {
    id: 'privacy.who-sees',
    title: '¿Quién puede ver mis datos?',
    questions: [
      'quién puede ver mis cosas',
      '¿Alguien más puede ver mi presupuesto?',
      'quién tiene acceso a mi información',
      'otros usuarios pueden ver mis recibos',
      'mis datos se comparten con alguien',
      'quién procesa mis datos',
      'skip comparte con terceros',
      'servicios de terceros que usa skip',
      'mis datos son privados',
      'qué empresas reciben mis datos',
      'otras personas ven mis gastos',
      'con quién comparte mi info skip',
    ],
    answer:
      'Tus entradas solo se te muestran a ti, cuando tienes la sesión iniciada en tu cuenta. Otros usuarios de Skip nunca pueden verlas.\n\nPara funcionar, Skip usa algunos servicios que manejan datos en nuestro nombre y no pueden usarlos para nada más:\n' +
      '- Un servicio de alojamiento que guarda tu cuenta y maneja el inicio de sesión.\n' +
      '- Apple o Google, solo si inicias sesión con ellos, para confirmar que eres tú.\n' +
      '- Un servicio de correo, para enviar tus códigos de inicio de sesión y los mensajes que nos escribes.\n' +
      '- Apple y un servicio de suscripciones, para vender Skip Pro y comprobar si tu cuenta lo tiene.\n' +
      '- Un servicio de reportes de fallos, que recibe reportes sobre lo que hacía la app, no sobre lo que contiene tu presupuesto.\n' +
      '- El servicio de notificaciones de Apple, para entregar los recordatorios que activas.\n' +
      '- El servicio de voz de Apple, solo para la voz cuando tu iPhone no puede hacerlo en el propio dispositivo.\n\n' +
      'Skip no vende tus datos ni los comparte para publicidad.',
    keywords: ['quién ve', 'terceros', 'compartido', 'acceso'],
  },
  {
    id: 'privacy.selling',
    title: '¿Venden mis datos o me rastrean?',
    questions: [
      'venden datos',
      '¿Skip va a vender mi información alguna vez?',
      'me rastrean',
      'skip usa analíticas',
      'mi info se vende a anunciantes',
      'skip es gratis porque vende datos',
      'skip rastrea lo que hago en la app',
      'rastreo skip budget',
      'comparten datos con facebook o google para anuncios',
      'cómo gana dinero skip',
      'mis datos son el producto',
      'tiene publicidad skip',
    ],
    answer:
      'No. Skip no vende tus datos, no los comparte para publicidad y no tiene anuncios. Tampoco hay analíticas de terceros, solo reportes de fallos que ayudan a corregir errores.\n\nSkip se sostiene con Skip Pro, que cuesta {proMonthly} al mes o {proYearly} al año, cobrado por Apple. También hay una propina voluntaria, **Invita un café al equipo**, en **Ajustes**.',
    keywords: ['vender', 'rastreo', 'analíticas', 'anunciantes'],
  },
  {
    id: 'privacy.crash-reports',
    title: '¿Qué contiene un reporte de fallos?',
    questions: [
      'qué mandan los reportes de fallos',
      'un fallo les manda mi presupuesto',
      'privacidad de los reportes de error',
      'puedo desactivar los reportes de fallos',
      'qué pasa cuando la app se cierra, se envían datos',
      'ven mis importes cuando skip falla',
      'diagnósticos que envía skip',
      'mi correo va en los reportes de fallos',
      'skip registra lo que hago',
      'qué información va con un error',
    ],
    answer:
      'Cuando algo sale mal, Skip envía un reporte para poder encontrar y corregir el fallo. Describe lo que hacía la app, no lo que contiene tu presupuesto, y el reporte está configurado para no incluir datos personales.\n\n' +
      'En la app no hay un interruptor para esto. Los reportes solo vienen de la versión de Skip que descargas, y solo cuando algo falla o se cierra.',
    keywords: ['reporte de fallos', 'reporte de error', 'diagnósticos', 'registros'],
  },
  {
    id: 'privacy.ai',
    title: '¿Skip envía mis datos a una IA?',
    questions: [
      'skip usa ia',
      '¿Skip usa IA para leer mis recibos?',
      'la entrada por voz es IA',
      'chatgpt ve mis datos',
      'se manda algo de mi info a una inteligencia artificial',
      'aprendizaje automático skip',
      'skip usa inteligencia artificial',
      'skip manda mis recibos a una ia',
      'el escáner de recibos es ia',
      'mis datos sirven para entrenar ia',
      'skip tiene un chatbot con ia',
      'tú eres una ia, sam',
    ],
    answer:
      'Ningún servicio de IA ve tus datos. Skip usa funciones integradas en tu iPhone y reglas sencillas propias:\n\n' +
      '- **Escaneo**: el reconocimiento de texto de Apple en el dispositivo lee el recibo, y luego las reglas de Skip identifican la tienda, el total y la fecha.\n' +
      '- **Voz**: el reconocimiento de voz de Apple convierte tus palabras en texto, y luego las reglas de Skip en tu teléfono encuentran el importe, el nombre y la fecha.\n' +
      '- **Sam**, o sea yo, relaciona tu pregunta con respuestas escritas por el equipo de Skip. Yo tampoco soy una IA.\n\n' +
      'Tus datos no se usan para entrenar nada.',
    keywords: ['IA', 'inteligencia artificial', 'aprendizaje automático', 'entrenar'],
  },
  {
    id: 'privacy.retention',
    title: '¿Cuánto tiempo guarda Skip mis datos?',
    questions: [
      '¿Cuánto tiempo se guardan mis datos?',
      'skip borra datos viejos',
      'retención de datos skip',
      'mis recibos viejos se borran después de unos años',
      'hasta qué fecha atrás guarda skip los movimientos',
      'mi historial se guarda para siempre',
      'siete años datos skip',
      'las facturas viejas se borran solas',
      'cuándo borra skip mi historial',
      'se eliminan los cargos antiguos',
      'por cuánto tiempo guardan mi info',
    ],
    answer:
      'La política de privacidad de Skip fija dos reglas:\n\n' +
      '- **Lo que ya ocurrió**, como recibos, cargos registrados y pagos de tarjeta, se guarda siete años y luego se va soltando día a día, a medida que cada cosa pasa esa edad.\n' +
      '- **Lo que sigue en marcha**, como facturas, suscripciones, tarjetas, cuentas y salarios, se guarda hasta que lo elimines.\n\n' +
      'Hasta dónde puedes ver hacia atrás es aparte. El plan gratis muestra los últimos 90 días, y las entradas más antiguas quedan fuera de la vista, no eliminadas. Skip Pro muestra hasta 7 años.',
    keywords: ['retención', 'cuánto tiempo', 'siete años', 'datos viejos'],
  },
  {
    id: 'privacy.delete-account',
    title: '¿Cómo elimino mi cuenta?',
    questions: [
      '¿Cómo elimino mi cuenta de Skip?',
      'eliminar cuenta',
      'quitar todos mis datos de skip',
      'cerrar mi cuenta de skip',
      'quiero borrar todo',
      'dónde está eliminar cuenta',
      'cómo borro mis datos de skip',
      'eliminar skip para siempre',
      'borrar mi perfil',
      'borrar mi cuenta',
      'ya no quiero usar skip, cómo quito mi info',
      'qué significa Eliminar todo para siempre',
      'Esto elimina tu cuenta y todo lo que agregaste. Incluye 2 tarjetas, 5 facturas y 40 recibos',
      'que queda despues de eliminar mi cuenta',
    ],
    answer:
      'Ve a **Ajustes**, baja hasta **Cuenta** y toca **Eliminar cuenta**.\n\n' +
      '1. Con Skip Pro, primero aparece **¿Cancelar Skip Pro primero?**: eliminar tu cuenta no cancela Pro, y Apple sigue cobrándote hasta que lo canceles. **Administrar en el App Store** abre tus suscripciones y no elimina nada. Si ya lo cancelaste, toca **Continuar y eliminar**.\n' +
      '2. **¿Eliminar tu cuenta?** cuenta lo que se irá, como tus tarjetas, cuentas bancarias, facturas, suscripciones, recibos y pagos, y todo lo demás, como préstamos, ahorros, metas y hábitos de gasto. Toca **Continuar**, o **Conservar mi cuenta** para detenerte.\n' +
      '3. **¿Eliminar todo para siempre?** es el último paso. Toca **Eliminar todo**.\n\n' +
      'Tu cuenta y todo lo que contiene se eliminan de inmediato, y vuelves a la pantalla de bienvenida. Skip también borra del teléfono tus correcciones de nombres de voz, las tiendas recordadas y las búsquedas recientes. Unos pocos registros fuera de Skip, como los informes de fallos, pueden quedarse.\n\n' +
      'Necesitas estar en línea.',
    keywords: ['Eliminar cuenta', 'borrar cuenta', 'cerrar cuenta', 'Eliminar todo'],
  },
  {
    id: 'privacy.delete-undo',
    title: '¿Puedo recuperar mi cuenta después de eliminarla?',
    questions: [
      'deshacer la eliminación de la cuenta',
      '¿Puedo deshacer la eliminación de mi cuenta?',
      'eliminé mi cuenta por error',
      'recuperar una cuenta de skip eliminada',
      'hay un periodo de gracia después de eliminar',
      'guardan una copia después de que elimino',
      'restaurar mis datos eliminados',
      'eliminé mi cuenta, puedo volver a entrar',
      'soporte puede devolverme mi cuenta eliminada',
      'cuánto tardan en borrarse los datos eliminados',
      'eliminar la cuenta es permanente',
      'borré mi cuenta x error, se puede recuperar',
    ],
    answer:
      'No. Eliminar es inmediato y permanente. No hay periodo de gracia ni forma de restaurarla, así que no se puede recuperar. Por eso Skip pregunta antes de eliminar nada.\n\n' +
      'Puedes registrarte de nuevo con el mismo correo, o con la misma cuenta de Apple o Google, pero empezarás con un Skip vacío.',
    keywords: ['deshacer', 'recuperar', 'restaurar', 'periodo de gracia'],
  },
  {
    id: 'privacy.reset',
    title: '¿Puedo empezar de cero sin eliminar mi cuenta?',
    questions: [
      'restablecer todos mis datos',
      'reiniciar skip',
      '¿Cómo reinicio Skip y empiezo de nuevo?',
      'borrar todos mis datos pero conservar mi cuenta',
      'hay un botón de restablecer',
      'borrar todo y empezar desde cero',
      'eliminar todos mis recibos de una vez',
      'empezar mi presupuesto de nuevo',
      'limpiar los datos pero conservar el inicio de sesión',
      'quitar todas mis entradas de prueba',
      'empezar de cero skip',
      'borrado masivo',
    ],
    answer:
      'No hay un botón de restablecer ni un borrado masivo. Puedes:\n\n' +
      '- Eliminar las cosas una por una. Abre cada recibo, factura, suscripción, tarjeta o cuenta, toca el lápiz y usa el botón de eliminar de abajo.\n' +
      '- O eliminar toda tu cuenta en **Ajustes → Cuenta → Eliminar cuenta** y luego registrarte de nuevo con el mismo correo para tener un Skip vacío.\n\n' +
      'Si un botón de restablecer te ayudaría, mándalo como idea en **Ajustes → Soporte y comentarios → Comparte una idea**.',
    keywords: ['restablecer', 'empezar de cero', 'borrar datos', 'borrado masivo'],
  },
  {
    id: 'privacy.export',
    title: '¿Puedo obtener una copia de todos mis datos?',
    questions: [
      '¿Cómo exporto todos mis datos?',
      'descargar todos mis datos de skip',
      'obtener una copia de mi información',
      'solicitud de datos RGPD',
      'llevar mis datos a otra app',
      'respaldar mi presupuesto en un archivo',
      'exportar todo de skip',
      'puedo descargar los datos de mi cuenta',
      'portabilidad de datos skip',
      'quiero todos mis datos en un archivo',
      'cómo saco mis facturas a excel',
    ],
    answer:
      'En la app, puedes exportar los pagos de tus facturas y suscripciones con Skip Pro:\n\n' +
      '1. Abre **Facturas mensuales** o **Suscripciones** y toca **Ver historial de pagos**.\n' +
      '2. Toca **Exportar CSV o PDF**, o el botón de compartir de arriba.\n' +
      '3. Elige **CSV** (para Numbers, Excel o Google Sheets) o **PDF** (un estado de cuenta para imprimir o enviar) y toca **Exportar**.\n\n' +
      'Los recibos, las tarjetas, el sueldo y lo demás no se pueden exportar desde la app. Para una copia completa de tus datos, escribe a **admin@skipapps.net**, como explica la política de privacidad, y nos ocuparemos.',
    keywords: ['exportar', 'descargar', 'copia', 'CSV'],
  },
  {
    id: 'privacy.rights',
    title: '¿Qué derechos tengo sobre mis datos?',
    questions: [
      'puedo ver todos los datos que tienen de mí',
      'cómo corrijo mis datos',
      'derechos de protección de datos skip',
      'oponerme al tratamiento de mis datos',
      'derecho al olvido skip',
      'con quién hablo sobre mi privacidad',
      'correo para solicitudes de privacidad',
      'dirección de contacto de privacidad',
      'derechos rgpd',
      'derechos ARCO skip',
      'ccpa skip',
    ],
    answer:
      'Puedes ver en la app todo lo que Skip guarda sobre ti, corregirlo editándolo y eliminarlo todo en **Ajustes → Cuenta → Eliminar cuenta**.\n\n' +
      'Según dónde vivas, también puedes tener derecho a una copia de tus datos en un formato portátil, o a oponerte a ciertos tratamientos. Escribe a **admin@skipapps.net** y nos ocuparemos. Los detalles están en **Ajustes → Acerca de → Política de privacidad**.',
    keywords: ['derechos', 'RGPD', 'CCPA', 'contacto de privacidad'],
  },
  {
    id: 'privacy.terms',
    title: '¿Qué dicen los términos del servicio?',
    questions: [
      'cuáles son los puntos principales de los términos',
      'skip es asesoría financiera',
      'de quién son los datos que ingreso',
      'resumen de los términos del servicio',
      'skip se puede equivocar con mi dinero',
      'skip es responsable de mis decisiones financieras',
      'pueden cerrar mi cuenta',
      'a qué estoy aceptando al usar skip',
      'responsabilidad de skip',
      'skip es un asesor financiero',
      'los términos en español son oficiales',
      'términos y condiciones',
    ],
    answer:
      'En resumen:\n\n' +
      '- Skip es una herramienta para anotar y consultar tu propio dinero. No es un banco, un servicio de pagos ni un asesor financiero, y nada en la app es asesoría financiera, fiscal ni legal.\n' +
      '- Cada cifra sale de lo que ingresaste. Las previsiones de facturas y días de pago son estimaciones basadas en los calendarios que configuraste.\n' +
      '- Lo que ingresas sigue siendo tuyo, y puedes eliminarlo cuando quieras.\n' +
      '- Una cuenta es para una sola persona. Una cuenta que incumpla los términos puede suspenderse o cerrarse.\n\n' +
      'Léelos completos en **Ajustes → Acerca de → Términos del servicio**. En español o francés es una traducción de cortesía, y la versión en inglés es la que cuenta.',
    keywords: ['términos', 'términos del servicio', 'acuerdo', 'responsabilidad'],
  },
  {
    id: 'privacy.shared-phone',
    title: 'Voy a vender o compartir mi teléfono',
    questions: [
      'voy a vender mi iPhone, qué hago con skip',
      'otra persona va a usar mi iphone',
      'cómo me aseguro de que el siguiente no vea mi presupuesto',
      'cerrar sesión antes de regalar mi teléfono',
      'mi familia usa mi teléfono',
      'los recordatorios seguirán llegando a mi teléfono viejo',
      'le paso mi iphone a alguien más',
      'quiero que no salga mi info en mi iphone viejo',
      'entrego mi iphone en un trade in',
      'proteger skip de quien me pide mi teléfono prestado',
    ],
    answer:
      'Primero cierra sesión, en **Ajustes → Cuenta → Cerrar sesión**. Al cerrar sesión:\n\n- se dejan de enviar tus recordatorios a ese teléfono,\n- se borran de él tus correcciones de nombres de voz y las tiendas que Skip recordaba para ti,\n- y Skip vuelve a la pantalla de bienvenida.\n\nTambién se cierra tu sesión de Skip en tus otros teléfonos, así que vuelve a iniciar sesión en el nuevo si te lo pide.\n\nTus entradas están a salvo en tu cuenta, listas en tu próximo teléfono. Si alguien comparte tu teléfono a diario, activa **Bloqueo de la app** en **Ajustes → Preferencias**, para que Skip pida Face ID antes de abrirse.',
    keywords: ['vender teléfono', 'regalar', 'teléfono compartido', 'cerrar sesión'],
  },
  {
    id: 'privacy.permissions',
    title: '¿Qué permisos pide Skip?',
    questions: [
      'qué permisos necesita skip',
      'skip usa mi ubicación',
      'skip lee mis contactos',
      'por qué skip quiere mi cámara',
      'por qué skip quiere mis fotos',
      'puedo negar los permisos de skip',
      'skip accede a mi galería de fotos',
      'lista de permisos de skip',
      'skip lee mis mensajes',
      'skip accede a mi calendario',
    ],
    answer:
      'Skip solo pide permiso cuando usas algo que lo necesita, y puedes decir que no y seguir usando todo lo demás:\n\n' +
      '- **Cámara**: para escanear recibos. Los escaneos se leen en el teléfono y nunca se suben.\n' +
      '- **Fotos**: para leer un recibo que eliges de tus fotos, en el teléfono.\n' +
      '- **Micrófono** y **Reconocimiento de voz**: para la entrada por voz.\n' +
      '- **Notificaciones**: para los recordatorios que activas.\n' +
      '- **Face ID**: para el **Bloqueo de la app**, si lo activas.\n\n' +
      'Skip no pide tu ubicación, contactos, calendario ni mensajes. Cambia cualquier permiso en **Ajustes → Skip Budget** del iPhone.',
    keywords: ['permisos', 'ubicación', 'contactos', 'cámara'],
  },
  {
    id: 'privacy.account.compromised',
    title: 'Creo que alguien entró a mi cuenta',
    questions: [
      'creo que alguien entró a mi cuenta de skip',
      'hackearon mi cuenta de skip',
      'hay entradas que yo no agregué',
      'otra persona está usando mi cuenta',
      'aparecieron recibos raros en mi cuenta',
      'acceso no autorizado a mi cuenta de skip',
      'cómo protejo mi cuenta después de una brecha',
      'alguien sabe mi contraseña de skip',
      'actividad sospechosa en skip',
      'puedo ver quién inició sesión en mi cuenta',
      'cómo mantengo segura mi cuenta de skip',
      'me robaron la cuenta',
    ],
    answer:
      'Actúa rápido:\n\n' +
      '1. Pon una contraseña nueva. Cierra sesión en **Ajustes → Cuenta → Cerrar sesión**, luego en la pantalla **Iniciar sesión** toca **¿Olvidaste tu contraseña?** y sigue el código que llega a tu correo. Si inicias sesión con Apple o Google, protege esa cuenta.\n' +
      '2. Avísanos en **admin@skipapps.net**, o en **Ajustes → Soporte y comentarios → Escribir a soporte**, para que lo investiguemos.\n' +
      '3. Revisa tus entradas por si hay algo que no agregaste, y elimínalo.\n\n' +
      'Skip no muestra una lista de inicios de sesión. No guarda accesos a bancos ni números de tarjeta completos y no puede mover dinero, así que nadie puede llegar a tu banco a través de Skip. Para evitar que otras personas abran Skip en tu teléfono, activa **Bloqueo de la app** en **Ajustes → Preferencias**.',
    keywords: ['hackeo', 'comprometida', 'sospechoso', 'proteger cuenta'],
  },

  // Algo no va bien: problemas de toda la app

  {
    id: 'troubleshooting.failure.what',
    title: '¿Qué significa “Algo salió mal”?',
    questions: [
      '¿Qué significa Algo salió mal. Inténtalo de nuevo?',
      'error algo salió mal',
      'siempre me sale algo salió mal',
      'por qué skip dice inténtalo de nuevo',
      'mensaje de error en skip',
      'cuál es el error que muestra skip',
      'dijo algo salió mal y no pasó nada',
      'error skip',
      'la página dice algo salió mal con un botón de intentar de nuevo',
      'perdí mis datos, dijo algo salió mal',
      'qué significa intentar de nuevo',
      'si vuelvo a guardar, ¿se crea una copia?',
    ],
    answer:
      'Es el único mensaje que Skip muestra cuando algo falla, como cargar una página, guardar, eliminar o enviar. Casi siempre significa que Skip no pudo comunicarse con tu cuenta por un momento, normalmente por la conexión.\n\n' +
      '1. Revisa que estés en línea, con Wi-Fi o datos móviles.\n' +
      '2. Toca **Intentar de nuevo** en la página, o toca otra vez el mismo botón, como **Guardar**.\n' +
      '3. ¿Sigue igual? Cierra Skip por completo y ábrelo de nuevo.\n\n' +
      'No se pierde nada de lo que ya guardaste. Cuando falla un guardado, lo que ingresaste se queda en la página para que lo intentes de nuevo, y guardar otra vez nunca crea una segunda copia de un recibo, suscripción, tarjeta, cuenta, salario, hábito o pago de tarjeta. Si **Inicio** o **Tarjetas** no pueden actualizarse, conservan las cifras que ya mostraban.\n\n' +
      'Los mensajes que te dicen qué corregir, como “Ingresa el nombre del banco.” o “Primero elige una tienda.”, no son fallos. Señalan algo que todavía necesita una respuesta.',
    keywords: ['Algo salió mal', 'Inténtalo de nuevo', 'Intentar de nuevo', 'error'],
  },
  {
    id: 'troubleshooting.failure.repeats',
    title: 'Nada funciona, todas las páginas muestran un error',
    questions: [
      'sigue diciendo algo salió mal aunque lo intento de nuevo',
      'todas las páginas muestran error',
      'nada carga en skip',
      'skip no carga nada',
      'no puedo guardar nada',
      'error en todas las pantallas',
      'skip está roto',
      'intentar de nuevo no funciona',
      'skip no funciona hoy',
      'está caído skip',
      'todas mis páginas están vacías con errores',
      'ya intenté todo y sigue el error',
    ],
    answer:
      'Si todos los intentos fallan, sigue estos pasos:\n\n' +
      '1. Cambia entre Wi-Fi y datos móviles, o activa y desactiva el Modo avión.\n' +
      '2. Cierra Skip por completo, deslizándolo en el selector de apps, y ábrelo de nuevo.\n' +
      '3. Actualiza Skip en el App Store y reinicia tu iPhone.\n' +
      '4. Cierra sesión y vuelve a entrar: **Ajustes → Cuenta → Cerrar sesión**. Tus entradas están a salvo en tu cuenta. Solo se borran las correcciones de nombres de voz y las tiendas guardadas en este teléfono.\n\n' +
      'Si sigue fallando, puede que Skip tenga un problema de nuestro lado. Cuéntanos en **Ajustes → Soporte y comentarios → Escribir a soporte** qué estabas haciendo y qué viste. Si no puedes llegar hasta ahí, escribe a **admin@skipapps.net**.',
    keywords: ['no funciona', 'caído', 'roto', 'no carga'],
  },
  {
    id: 'troubleshooting.wont-save',
    title: '¿Por qué no se guarda nada?',
    questions: [
      'el botón guardar no funciona',
      'nada se guarda en skip',
      'botón de guardar gris en todos lados',
      'guardar no hace nada en ninguna parte de la app',
      'el botón de abajo no hace nada',
      'no me deja guardar',
      'el formulario no se envía',
      'no puedo guardar mis cambios',
      'qué significa el texto gris encima de guardar',
      'guardar no sirve',
      'texto rojo encima del botón de guardar',
    ],
    answer:
      'Las palabras justo encima del botón te dicen cuál de dos cosas pasa:\n\n' +
      '- **Texto gris que dice qué falta**, como “Primero elige una tienda.” o una lista de campos. Algo todavía necesita una respuesta. Completa las filas que dicen **Toca para agregar** y vuelve a tocar **Guardar**.\n' +
      '- **“Algo salió mal. Inténtalo de nuevo.”** El guardado no llegó a tu cuenta, normalmente por la conexión. Tu entrada sigue en la página. Revisa que estés en línea y toca **Guardar** otra vez.\n\n' +
      'Cuando un guardado funciona, aparece una nota breve abajo en la pantalla, como **Factura agregada**.',
    keywords: ['guardar', 'gris', 'desactivado', 'no guarda'],
  },
  {
    id: 'troubleshooting.slow',
    title: 'Skip va lento o se queda cargando',
    questions: [
      'por qué skip está tan lento',
      'skip se queda cargando',
      'círculo de carga infinito',
      'las páginas tardan una eternidad en abrir',
      'skip va con lag',
      'tarda mucho en guardar',
      'por qué skip carga cada vez que lo abro',
      'app lenta',
      'los números tardan en aparecer',
      'skip tarda siglos',
    ],
    answer:
      'Skip carga tus entradas desde tu cuenta, así que su velocidad depende sobre todo de tu conexión.\n\n' +
      '- Una señal débil es la causa habitual. Prueba con Wi-Fi, o en un lugar con mejor señal.\n' +
      '- Cuando vuelves a Skip después de un rato, busca las cifras más recientes para que sean correctas. Eso puede tardar un momento.\n' +
      '- Desliza hacia abajo en **Inicio**, **Tarjetas**, **Actividad** y la mayoría de las listas para actualizar a mano.\n' +
      '- Si parece atascado, cierra Skip por completo y ábrelo de nuevo.\n\n' +
      'Si va lento todo el tiempo con buena conexión, cuéntanos qué página en **Ajustes → Soporte y comentarios → Escribir a soporte**.',
    keywords: ['lento', 'cargando', 'lag', 'tarda mucho'],
  },
  {
    id: 'troubleshooting.crash',
    title: 'Skip se cerró o se trabó solo',
    questions: [
      'skip se cierra solo',
      'la app se cierra sola',
      'skip se sale cuando abro una página',
      'la app se cerró al guardar',
      'skip se congela',
      'la app se apagó',
      'skip se congeló y se cerró',
      'la app se cierra todo el tiempo',
      'perdí lo que estaba escribiendo cuando se cerró',
      'skip está congelado',
    ],
    answer:
      'Perdón por eso. Skip envía un reporte de fallo por sí solo, que describe lo que hacía la app y nada de tu presupuesto, para poder encontrar el error.\n\n' +
      '1. Cierra Skip por completo y vuelve a abrirlo.\n' +
      '2. Actualiza Skip en el App Store, y actualiza iOS.\n' +
      '3. Reinicia tu iPhone.\n\n' +
      'Todo lo que ya habías guardado está a salvo en tu cuenta. Solo se pierde la entrada que estabas haciendo, así que revisa si está y vuelve a agregarla si no.\n\n' +
      'Si sigue pasando en el mismo punto, cuéntanos qué tocaste justo antes en **Ajustes → Soporte y comentarios → Escribir a soporte**. Ayuda que incluyas tu **Versión** de **Ajustes → Acerca de**.',
    keywords: ['se cierra', 'congelado', 'fallo', 'se trabó'],
  },
  {
    id: 'troubleshooting.splash-stuck',
    title: 'Skip se queda en la pantalla de inicio',
    questions: [
      'skip se queda en el logo',
      'la app no pasa de la pantalla de inicio',
      'atorado en la pantalla de carga',
      'skip muestra el logo y nada más',
      'pantalla en blanco al abrir skip',
      'pantalla blanca al iniciar',
      'skip no arranca',
      'la app se cuelga al arrancar',
      'no paso de la pantalla de inicio',
      'skip abre en una página en blanco',
      'pantalla negra cuando abro skip',
    ],
    answer:
      'El logo de apertura se reproduce unos dos segundos mientras Skip se prepara, y da paso a la app en pocos segundos aunque la animación no pueda cargarse. Si sigues atascado después de eso:\n\n' +
      '1. Cierra Skip por completo, deslizándolo en el selector de apps, y ábrelo de nuevo.\n' +
      '2. Reinicia tu iPhone.\n' +
      '3. Actualiza Skip en el App Store.\n' +
      '4. ¿Sigue igual? Elimina Skip y vuelve a instalarlo, y luego inicia sesión. Tus entradas están en tu cuenta, pero los ajustes guardados en el teléfono, como la apariencia y el bloqueo de la app, se restablecen.\n\n' +
      'Si nada de eso ayuda, escribe a **admin@skipapps.net**, ya que quizás no puedas llegar a **Ajustes**.',
    keywords: ['pantalla de inicio', 'atorado', 'logo', 'pantalla en blanco'],
  },
  {
    id: 'troubleshooting.update',
    title: '¿Cómo actualizo Skip?',
    questions: [
      'cómo actualizo la app',
      'hay una versión nueva de skip',
      'skip me pide actualizar',
      'activar las actualizaciones automáticas para skip',
      'actualizar skip budget',
      'hay una actualización de la app',
      'necesito actualizar skip',
      'última versión de skip',
      'qué hay de nuevo en la actualización',
      'actualizar borra mis datos',
    ],
    answer:
      'Skip se actualiza desde el App Store:\n\n' +
      '1. Abre el **App Store** y toca tu foto, arriba a la derecha.\n' +
      '2. Busca **Skip Budget** entre las actualizaciones disponibles y toca **Actualizar**.\n\n' +
      'Para recibir las actualizaciones automáticamente, activa **Actualizaciones de apps** en **Ajustes → App Store** del iPhone. Actualizar nunca toca tus entradas.\n\n' +
      'Skip no te bloquea para obligarte a actualizar. Las novedades sobre versiones y funciones nuevas aparecen bajo la campana de **Inicio**, en **Notificaciones**. Tu versión actual está en **Ajustes → Acerca de → Versión**.',
    keywords: ['actualizar', 'versión nueva', 'App Store', 'actualizaciones automáticas'],
  },
  {
    id: 'troubleshooting.new-phone',
    title: '¿Volverán mis datos en un teléfono nuevo?',
    questions: [
      'iphone nuevo, cómo recupero mis datos de skip',
      'pasar skip a un teléfono nuevo',
      'mi presupuesto se pasa a mi teléfono nuevo',
      'cambié de teléfono, cómo recupero todo',
      'cómo paso mis datos a un iphone nuevo',
      'configurar skip en mi iphone nuevo',
      'transferir datos de skip',
      'tengo que configurar todo de nuevo en un teléfono nuevo',
      'qué no pasa a mi teléfono nuevo',
      'cambié de iphone, y skip',
    ],
    answer:
      'Sí. Instala Skip en el teléfono nuevo e inicia sesión del mismo modo que antes, con el mismo correo o la misma cuenta de Apple o Google. Todo lo que hay en tu cuenta vuelve: recibos, facturas, suscripciones, tarjetas, sueldo, préstamos, ahorros y lo demás.\n\nAlgunas cosas pertenecen al teléfono viejo, así que configúralas de nuevo:\n' +
      '- **Apariencia**, **Idioma**, **Respuesta háptica** y **Bloqueo de la app** en **Ajustes → Preferencias**.\n' +
      '- Notificaciones: activa **Resumen mensual** en **Ajustes → Preferencias → Recordatorios**, y toca Permitir cuando el iPhone te lo pida. Tus demás recordatorios llegarán entonces también a este teléfono.\n' +
      '- Las correcciones de nombres de voz y las tiendas que Skip recordaba para ti empiezan de cero.\n\n' +
      'Si Skip Pro no aparece, ve a **Ajustes → Skip Pro → Restaurar compra**.',
    keywords: ['teléfono nuevo', 'transferir', 'mover datos', 'iPhone nuevo'],
  },
  {
    id: 'troubleshooting.reinstall',
    title: 'Eliminé la app. ¿Se perdieron mis datos?',
    questions: [
      'eliminé la app',
      'desinstalé skip, se perdió todo',
      'borré skip sin querer',
      'si desinstalo skip pierdo mis datos',
      'reinstalé skip, dónde está mi información',
      'datos al reinstalar la app',
      'descargar skip del iphone',
      'borré la app, mi cuenta sigue ahí',
      'reinstalar arregla mi problema',
      'quité skip de mi teléfono',
      'borrar la app borra mi cuenta',
      'reinstalar e iniciar sesión',
    ],
    answer:
      'No, tus datos están a salvo. Eliminar la app no elimina tu cuenta. Vuelve a instalar Skip desde el App Store, inicia sesión del mismo modo que antes y todo lo que hay en tu cuenta vuelve.\n\nLo que se restablece al reinstalar: los ajustes guardados en el teléfono (apariencia, idioma, respuesta háptica, bloqueo de la app), tus correcciones de nombres de voz y las tiendas que Skip recordaba para ti. Para volver a recibir notificaciones, activa **Resumen mensual** en **Ajustes → Preferencias → Recordatorios** y toca Permitir cuando el iPhone te lo pida.\n\nEliminar la app no cancela Skip Pro. Para eliminar tus datos para siempre, usa **Ajustes → Cuenta → Eliminar cuenta**.',
    keywords: ['desinstalar', 'reinstalar', 'app eliminada', 'quitar app'],
  },
  {
    id: 'troubleshooting.missing-data',
    title: 'Mis entradas desaparecieron',
    questions: [
      'mis entradas ya no están',
      'faltan datos en skip',
      'perdí mis movimientos',
      'las entradas viejas desaparecieron',
      'mi historial se borró',
      'todo lo que ingresé desapareció',
      'skip perdió mis datos',
      'faltan entradas de hace meses',
      'lo que agregué la semana pasada no está',
      'a dónde se fue mi información',
    ],
    answer:
      'Tus entradas se guardan en tu cuenta, así que casi siempre siguen ahí. Revisa esto en orden:\n\n' +
      '- **¿Más de 90 días en el plan gratis?** Las listas muestran los últimos 90 días. Las entradas más antiguas quedan fuera de la vista y vuelven con Skip Pro.\n' +
      '- **¿Otra cuenta?** Si te registraste con correo y ahora iniciaste sesión con Apple o Google, o al revés, puede que estés en una segunda cuenta vacía. Cierra sesión e inicia del modo en que lo hiciste la primera vez.\n' +
      '- **¿El lugar correcto?** Los recibos pueden estar en otro libro, y **Actividad** muestra un periodo a la vez.\n' +
      '- **¿Eliminadas?** Las entradas eliminadas no pueden volver.\n' +
      '- **¿Sin conexión?** Desliza hacia abajo para actualizar, o toca **Intentar de nuevo**.\n\n' +
      '¿Siguen sin aparecer? Cuéntanos en **Ajustes → Soporte y comentarios → Escribir a soporte**.',
    keywords: ['faltan', 'desaparecieron', 'perdidos', 'datos perdidos'],
  },
  {
    id: 'troubleshooting.sync',
    title: 'Los cambios de mi otro teléfono no aparecen',
    questions: [
      'skip no sincroniza entre mis teléfonos',
      'agregué una factura en un teléfono y mi otro no la muestra',
      'dos dispositivos desincronizados',
      'los cambios no aparecen en mi otro iphone',
      'cuánto tardan en aparecer los cambios en mi otro teléfono',
      'mis teléfonos muestran cosas distintas',
      'problema de sincronización',
      'eliminé en un teléfono y sigue en el otro',
      'no se actualiza entre dispositivos',
      'el otro teléfono tiene datos viejos',
    ],
    answer:
      'Skip se actualiza solo. Cuando algo cambia en tu cuenta, tus otros teléfonos lo reciben en un momento, siempre que Skip esté abierto y en línea en ellos.\n\n' +
      'Si no ha aparecido:\n' +
      '1. Revisa que los dos teléfonos tengan la sesión iniciada en la misma cuenta. **Ajustes → Soporte y comentarios → Escribir a soporte** muestra el correo con el que iniciaste sesión.\n' +
      '2. Desliza hacia abajo en la página para actualizar.\n' +
      '3. Cierra Skip y ábrelo de nuevo.\n\n' +
      'Skip también se actualiza cuando vuelves a él después de un rato. Los ajustes guardados en cada teléfono, como la apariencia y el idioma, nunca se sincronizan.',
    keywords: ['sincronizar', 'otro teléfono', 'dispositivos', 'no se actualiza'],
  },
  {
    id: 'troubleshooting.numbers-wrong',
    title: 'Mis números se ven mal',
    questions: [
      'los números de skip no coinciden con mi banco',
      'los totales se ven raros',
      'por qué mi presupuesto está mal',
      'las cuentas de skip están mal',
      'las cifras no cuadran',
      'skip muestra un importe equivocado',
      'mi total de gastos es muy alto',
      'números incorrectos',
      'los cálculos de skip están mal',
      'por qué mis cifras son distintas a lo que espero',
      'no me cuadran los números',
    ],
    answer:
      'Cada número de Skip se calcula al centavo con lo que se ingresó, así que cuando uno se ve mal, suele ser por una entrada que lo respalda. Las causas más comunes:\n\n' +
      '- Un importe o una fecha mal escritos, o una entrada agregada dos veces.\n' +
      '- Un recibo, factura o suscripción pagados con la tarjeta o cuenta equivocada, o con ninguna.\n' +
      '- Un saldo inicial en una tarjeta o cuenta que está desactualizado.\n' +
      '- Un sueldo que falta, o configurado con el calendario equivocado.\n' +
      '- Gastos que nunca se agregaron. Skip no está conectado a tu banco, así que solo sabe lo que tú le dices.\n' +
      '- En el plan gratis, las entradas más antiguas se ocultan en las listas pero igual cuentan.\n\n' +
      'Pregúntame por la cifra que se ve mal, como “¿Cómo se calcula el Saldo actual?” o “¿Por qué el saldo de mi tarjeta está mal?”, y te muestro cómo se arma.',
    keywords: ['números mal', 'totales', 'cálculo', 'no cuadra'],
  },
  {
    id: 'troubleshooting.wrong-date',
    title: 'Las fechas de Skip van un día desfasadas',
    questions: [
      'skip muestra la fecha equivocada',
      'hoy está mal en skip',
      'mi entrada se guardó en otro día',
      'las fechas van un día atrás',
      'zona horaria mal en skip',
      'viajé y las fechas están mal',
      'skip cree que es ayer',
      'skip sigue mostrando ayer después de medianoche',
      'mis fechas cambiaron después de un viaje',
      'día equivocado en todo skip',
    ],
    answer:
      'El “hoy” de Skip es la fecha de tu propio iPhone, y tu cuenta guarda la zona horaria de tu teléfono para que los cargos y recordatorios sigan tu día.\n\n' +
      '- Revisa la fecha y la hora del iPhone: **Ajustes → General → Fecha y hora**, con **Ajuste automático** activado.\n' +
      '- Después de viajar, cierra Skip por completo (deslízalo en el selector de apps) y ábrelo de nuevo. Guarda la nueva zona horaria cada vez que arranca.\n' +
      '- Si dejaste Skip abierto toda la noche, pasa al nuevo día en un minuto, o en cuanto vuelvas a él.\n\n' +
      'Si una entrada tiene el día equivocado, ábrela, toca el lápiz y cambia la fecha.',
    keywords: ['fecha', 'zona horaria', 'día equivocado', 'viaje'],
  },
  {
    id: 'troubleshooting.badge',
    title: '¿Qué es el número rojo del ícono de Skip?',
    questions: [
      'globito rojo en el ícono de skip',
      'número en el ícono de skip',
      'cómo quito el globito',
      'el ícono de skip muestra un 1',
      'el número rojo no se quita',
      'circulito rojo en la app',
      'qué significa el numerito rojo',
      'contador de notificaciones en el ícono de skip',
      'quitar el número del ícono de skip',
      'número rojo skip',
    ],
    answer:
      'Significa que llegó una notificación de Skip desde la última vez que abriste Skip. Al abrir Skip se quita.\n\n' +
      'Si prefieres no verlo nunca, desactiva **Globos** en **Ajustes → Notificaciones → Skip Budget** del iPhone.\n\n' +
      'El punto en la campana de **Inicio** es distinto. Significa que hay novedades de Skip en **Notificaciones** que todavía no has leído.',
    keywords: ['globo', 'número rojo', 'ícono', 'círculo rojo'],
  },
  {
    id: 'troubleshooting.large-text',
    title: 'El texto es muy grande o muy pequeño',
    questions: [
      'el texto es muy grande',
      'la letra de skip es enorme',
      'cómo agrando el texto en skip',
      'el texto es muy pequeño',
      'tamaño de letra skip',
      'las palabras se cortan',
      'el texto grande hace que skip se vea raro',
      'skip admite tamaño de texto dinámico',
      'hay texto que no se agranda',
      'el texto se empalma',
      'puedo cambiar el tamaño de la letra en la app',
      'los números no crecen con el tamaño del texto',
    ],
    answer:
      'Skip sigue el tamaño de texto de tu iPhone y no tiene un ajuste propio. Cámbialo en **Ajustes → Pantalla y brillo → Tamaño del texto** del iPhone o, para un texto aún más grande, en **Ajustes → Accesibilidad → Pantalla y tamaño del texto → Texto más grande**.\n\n' +
      'Para que todas las páginas sigan siendo usables, cada tipo de texto deja de crecer en un punto fijo. El texto de lectura crece más, las etiquetas de las filas un poco menos, y los títulos y las cifras grandes lo mínimo, así que en los tamaños más grandes algunos números quedan más pequeños que las palabras. Los botones como **Guardar** se quedan fijos abajo, para que siempre puedas alcanzarlos.\n\n' +
      'Si algo se corta o se empalma, cuéntanos qué página en **Ajustes → Soporte y comentarios → Escribir a soporte**.',
    keywords: ['tamaño del texto', 'letra', 'texto más grande', 'se corta'],
  },
  {
    id: 'troubleshooting.text-size.reset',
    title: 'Al cambiar el tamaño del texto se reinició mi página',
    questions: [
      'cambié el tamaño del texto y skip regresó',
      'perdí lo que escribía al cambiar el tamaño de letra',
      'skip se reinició al cambiar el tamaño del texto',
      'la app saltó atrás después de un cambio de accesibilidad',
      'la página se recargó sola',
      'el formulario se borró al cambiar ajustes',
      'mi entrada desapareció al cambiar el tamaño del texto',
      'cambiar el tamaño del texto cerró mi página',
      'por qué skip redibujó todo',
      'skip se reinició al cambiar los ajustes de pantalla',
    ],
    answer:
      'Cuando el tamaño del texto cambia con Skip abierto, Skip redibuja sus páginas para que todo quepa en el nuevo tamaño. Una página en la que estabas a medias puede perder lo que aún no habías guardado.\n\n' +
      'Todo lo que ya se guardó está a salvo. Para no volver a escribirlo, guarda primero, o cambia el tamaño del texto antes de empezar a agregar algo. Si estabas agregando por voz y ves **Aún no hay nada que revisar**, toca **Empezar de nuevo**.',
    keywords: ['tamaño del texto', 'reinicio', 'redibujar', 'perdí lo escrito'],
  },
  {
    id: 'troubleshooting.dark-mode',
    title: 'El modo oscuro se ve mal',
    questions: [
      'skip se queda claro cuando mi teléfono está oscuro',
      'por qué skip abre con pantalla clara en modo oscuro',
      'la animación de apertura es muy brillante',
      'el modo oscuro no funciona en skip',
      'skip ignora el modo oscuro de mi teléfono',
      'destello de luz al abrir skip de noche',
      'algunas partes se ven raras en modo oscuro',
      'skip está oscuro pero lo quiero claro',
      'el tema no sigue a mi teléfono',
      'modo oscuro se ve raro',
    ],
    answer:
      'Algunas cosas explican casi todo:\n\n' +
      '- **Skip no cambia cuando cambia tu teléfono.** **Apariencia** está en **Claro** u **Oscuro**. Elige **Sistema** en **Ajustes → Preferencias → Apariencia** para seguir a tu teléfono.\n' +
      '- **Una pantalla clara cuando Skip abre.** La animación del logo de apertura siempre se reproduce sobre su fondo crema, y luego Skip cambia a tu tema.\n' +
      '- **Algo difícil de leer en modo oscuro.** Cuéntanos qué página en **Ajustes → Soporte y comentarios → Escribir a soporte**, y describe lo que ves.\n\n' +
      'La apariencia es gratis en todos los planes y se guarda en cada teléfono.',
    keywords: ['modo oscuro', 'modo claro', 'tema', 'Apariencia'],
  },
  {
    id: 'troubleshooting.motion',
    title: '¿Puedo quitar las animaciones?',
    questions: [
      'demasiada animación en skip',
      'reducir movimiento skip',
      'la animación de apertura me marea',
      'quitar el video del logo',
      'animación de la pantalla de inicio de skip',
      'me mareo con la app',
      'puedo saltar la animación de introducción',
      'que el micrófono deje de pulsar',
      'sin animaciones',
      'menos movimiento en skip',
    ],
    answer:
      'Skip sigue el ajuste **Reducir movimiento** del iPhone. Actívalo en **Ajustes → Accesibilidad → Movimiento → Reducir movimiento**.\n\n' +
      'Con él activado, Skip se abre con el logo terminado como imagen fija en vez de reproducir la animación, y el micrófono de voz deja de pulsar y crecer mientras hablas. Skip no tiene un interruptor propio.',
    keywords: ['Reducir movimiento', 'animación', 'movimiento', 'mareo'],
  },
  {
    id: 'troubleshooting.accessibility',
    title: '¿Skip funciona con VoiceOver?',
    questions: [
      'skip es accesible',
      'compatibilidad con voiceover skip',
      'lector de pantalla skip budget',
      'las personas ciegas pueden usar skip',
      'funciones de accesibilidad',
      'skip lee los importes en voz alta',
      'skip para personas con discapacidad visual',
      'ayuda de accesibilidad',
      'voiceover lee mal una etiqueta',
      'skip se puede usar con un lector de pantalla',
    ],
    answer:
      'Sí. Skip está hecho para funcionar con VoiceOver. Los botones, las filas y las cifras tienen nombres hablados, y las filas de las páginas de agregar dicen si todavía hacen falta o son opcionales.\n\n' +
      'También sigue el tamaño de texto de tu iPhone y el ajuste **Reducir movimiento**. Con VoiceOver activado, la entrada por voz cambia a doble toque para empezar y detener, así que no necesitas mantener presionado el botón.\n\n' +
      'Si algo no se lee bien, cuéntanos qué página en **Ajustes → Soporte y comentarios → Escribir a soporte**.',
    keywords: ['VoiceOver', 'accesibilidad', 'lector de pantalla', 'ciego'],
  },
  {
    id: 'privacy.encryption',
    title: '¿Mis datos están cifrados?',
    questions: [
      'mis datos están cifrados',
      'skip usa cifrado',
      'la conexión es segura',
      'los hackers pueden ver mi presupuesto',
      'mi información se envía de forma segura',
      'https',
      'cómo se protegen mis datos',
      'mis datos están seguros en su servidor',
      'qué evita que alguien lea mis datos',
      'conexión cifrada',
      'skip encripta mis datos',
    ],
    answer:
      'Sí, en su camino entre tu teléfono y nuestro servidor. Skip solo habla con nuestro servidor por una conexión cifrada, del mismo tipo que usa el sitio web de tu banco, así que nadie en el camino puede leerlo.\n\nEn nuestro servidor, tus entradas pertenecen solo a tu cuenta. Otros usuarios de Skip nunca pueden verlas, y no se venden ni se comparten para publicidad.\n\nSkip tampoco pide ni guarda el acceso a tu banco, un número de tarjeta completo, una fecha de vencimiento ni un código de seguridad. Para dejar fuera a quien tome tu teléfono, activa **Ajustes → Preferencias → Bloqueo de la app**.',
    keywords: ['cifrado', 'seguro', 'HTTPS', 'hackers'],
  },
];

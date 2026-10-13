import type { IntentText } from '@/lib/ask-sam/types';

export const gettingStartedEs: IntentText[] = [
  // The big picture

  {
    id: 'getting-started.skip.what',
    title: '¿Qué es Skip?',
    questions: [
      '¿Qué es Skip?',
      'q hace esta app',
      '¿Para qué sirve Skip Budget?',
      'explícame qué es skip',
      '¿Qué puedo hacer con Skip?',
      '¿es una app de presupuesto?',
      '¿Cómo funciona Skip?',
      'para q sirve esta aplicacion',
      'skip app que es',
      'acabo de descargar esto, que hace en realidad',
      '¿Qué tipo de app es Skip?',
      'dame la versión corta de qué hace skip',
      'de que trata skip budjet',
    ],
    answer:
      'Skip es una app de presupuesto personal para iPhone. Tú le cuentas de tu dinero y ella lo guarda todo en un solo lugar: tu salario, tarjetas de crédito, cuentas bancarias, facturas, suscripciones, recibos, préstamos y ahorros.\n\n' +
      'Con eso, Skip te muestra tu **Saldo actual**, a dónde se fue tu dinero este mes y lo que viene en **Próximos**, y te avisa antes de facturas, renovaciones y el día de pago. Nunca se conecta a tu banco. Agregas las cosas escribiéndolas, escaneando un recibo o, con Skip Pro, por voz.\n\n' +
      'El lugar más fácil para empezar es la tarjeta **Primeros pasos** en **Inicio**.',
    keywords: ['skip', 'skip budget', 'de qué trata', 'app de presupuesto'],
  },
  {
    id: 'getting-started.skip.who',
    title: '¿Para quién es Skip?',
    questions: [
      '¿Para quién es Skip?',
      'esta app es para mi?',
      '¿Skip sirve si soy principiante?',
      '¿Puede usarla mi hijo adolescente?',
      '¿hay edad mínima para usar skip?',
      'pueden usar skip los niños',
      '¿Skip es para negocios o solo para uso personal?',
      'quien debe usar skip',
      'soy de los que odia hacer presupuestos, me sirve?',
      '¿Puedo usar Skip para mi negocio pequeño?',
      'q edad hay q tener para usar la app',
      'mi hija quiere llevar la cuenta de su dinero de bolsillo, se puede?',
      '¿Skip es solo para adultos?',
      'un niño puede tener su propia cuenta de skip',
    ],
    answer:
      'Skip es para cualquier persona que quiera ver con claridad a dónde va su dinero, sin entregar el acceso a su banco. Le sirve a quien le gusta tener el control: tú decides qué se agrega y Skip hace las sumas.\n\n' +
      'Algunas cosas que conviene saber:\n' +
      '- Una cuenta es para una sola persona.\n' +
      '- Es para adultos que manejan su propio dinero. No está pensada para niños.\n' +
      '- Es para dinero personal. No tiene funciones para negocios, como facturación a clientes o reportes de impuestos.\n' +
      '- Skip sirve para llevar el control y planificar. No es un banco ni da asesoría financiera.',
    keywords: ['edad', 'niños', 'negocio', 'principiante'],
  },
  {
    id: 'getting-started.skip.free',
    title: '¿Skip es gratis?',
    questions: [
      '¿Cuánto cuesta Skip?',
      '¿Tengo que pagar para usar Skip?',
      'la app es gratis o de pago',
      '¿Hay una versión gratis?',
      'que incluye la version gratuita',
      '¿Skip es gratis para siempre?',
      '¿El plan gratis se acaba?',
      'gratis vs pro en skip',
      '¿Hay que comprar algo para usarla?',
      'es gratis solo unas semanas y luego hay q pagar?',
      '¿Me van a cobrar después de unas semanas?',
      '¿Puedo usar Skip sin Pro?',
      'q pasa si nunca compro pro',
      '¿Es gratis descargarla?',
    ],
    answer:
      'Sí. Skip es gratis para descargar y usar, y el plan gratis no tiene límite de tiempo. Cubre lo de todos los días: tu salario (todos los que quieras), facturas, suscripciones, recibos, préstamos y la calculadora de préstamos, ahorros, metas y recordatorios.\n\n' +
      'El plan gratis tiene algunos límites:\n' +
      '- 1 tarjeta de crédito y 1 cuenta bancaria\n' +
      '- 15 escaneos de recibos y 15 cargas de archivos al mes\n' +
      '- El historial muestra los últimos 90 días. Lo más antiguo se conserva, solo que oculto.\n\n' +
      'Skip Pro es opcional, a {proMonthly} al mes o {proYearly} al año, cobrado por Apple. Quita esos límites y añade Entrada por voz, Análisis, Hábitos de gasto y exportación de pagos, con hasta 7 años de historial. Lo ves todo en **Ajustes → Skip Pro**.',
    keywords: ['gratis', 'precio', 'costo', 'plan gratis'],
  },
  {
    id: 'getting-started.skip.safe',
    title: '¿Es seguro usar Skip?',
    questions: [
      '¿Skip es seguro?',
      'mis datos estan protegidos',
      '¿Puedo confiar en Skip con la información de mi dinero?',
      'esta app es confiable?',
      '¿Skip es una estafa?',
      '¿Skip vende mis datos?',
      '¿Cómo protegen mi información?',
      '¿Es seguro poner mi tarjeta en Skip?',
      '¿pueden hackear mi banco por skip?',
      'skip es privado?',
      '¿Alguien más va a ver mi presupuesto?',
      'seguridad de mis datos financieros',
    ],
    answer:
      'Sí. Skip está hecho para guardar lo menos posible. Nunca te pide el acceso a tu banco, así que en Skip no hay nada que pueda llegar a él.\n\n' +
      '- Skip nunca guarda un número de tarjeta completo, la fecha de vencimiento ni el código de seguridad. Como máximo, los últimos 4 dígitos si decides escribirlos.\n' +
      '- Las fotos de recibos se leen en tu iPhone y nunca se suben. Solo se guardan la tienda, la fecha y el total que confirmas.\n' +
      '- Lo que guardas se conserva en tu propia cuenta en nuestro servidor, para que puedas iniciar sesión en otro iPhone y encontrarlo allí.\n' +
      '- Skip no tiene anuncios y no vende tus datos.\n\n' +
      'Para más privacidad en el teléfono, activa **Ajustes → Preferencias → Bloqueo de la app** para que pida Face ID antes de abrir Skip. Los detalles completos están en **Ajustes → Acerca de → Política de privacidad**.',
    keywords: ['seguro', 'privacidad', 'estafa', 'datos'],
  },
  {
    id: 'getting-started.skip.bank',
    title: '¿Skip se conecta a mi banco?',
    questions: [
      '¿Skip se conecta a mi banco?',
      'como vinculo mi cuenta bancaria',
      '¿Por qué no puedo sincronizar mi banco?',
      '¿skip usa plaid?',
      '¿Skip puede traer mis movimientos automáticamente?',
      'puedo importar mi estado de cuenta',
      'conectar mi banco a skip',
      '¿por qué tengo que escribir todo a mano?',
      '¿Hay sincronización bancaria?',
      '¿lee los movimientos de mi banco?',
      '¿puedo subir un csv de mi banco?',
      '¿Por qué Skip no ve mis gastos solo?',
      'sin conexion al banco xq',
      'se puede importar el extracto del banco',
    ],
    answer:
      'No, y es a propósito. Skip nunca te pide el acceso a tu banco, así que nadie puede llegar a él a través de Skip, y tu banco nunca sabe que Skip existe.\n\n' +
      'En cambio, tú le cuentas a Skip lo que pasa:\n' +
      '- Agrega una factura o suscripción una vez y Skip la repite según su calendario.\n' +
      '- Escanea o sube un recibo, o escríbelo.\n' +
      '- Escribe los saldos de tus tarjetas y cuentas, y Skip los mueve con lo que registras.\n\n' +
      'Eso también significa que los saldos no se actualizan solos y que no hay forma de importar un estado de cuenta. Si te gustaría tenerlo, envíanos la idea desde **Ajustes → Soporte y comentarios → Comparte una idea**.',
    keywords: ['sincronizar banco', 'plaid', 'conectar banco', 'importar'],
  },
  {
    id: 'getting-started.skip.not-a-bank',
    title: '¿Skip puede pagar mis facturas o mover dinero?',
    questions: [
      '¿Skip puede pagar mis facturas?',
      'puedo mandar dinero con skip',
      '¿Skip mueve dinero entre mis cuentas?',
      '¿skip es un banco?',
      '¿Skip me va a sacar dinero de mi cuenta?',
      '¿Skip da asesoría financiera?',
      'se puede transferir dinero en skip',
      '¿Skip paga mi tarjeta de crédito automáticamente?',
      '¿Skip guarda mi dinero?',
      'es como venmo o paypal?',
      '¿Skip me ayuda con mis impuestos?',
      'skip hace pagos por mi',
    ],
    answer:
      'No. Skip no es un banco ni una app de pagos, así que no puede pagar facturas, enviar dinero ni mover dinero entre tus cuentas. Lleva un registro de tu dinero y hace las sumas.\n\n' +
      'Cuando vence una factura, la pagas como siempre: por tu banco, tu tarjeta o la empresa. Skip te avisa antes de que venza y la muestra en tu mes.\n\n' +
      'Skip tampoco da asesoría financiera, fiscal ni legal. Cada cifra sale de lo que tú registraste.',
    keywords: ['pagar facturas', 'transferir', 'venmo', 'impuestos'],
  },
  {
    id: 'getting-started.platform.android',
    title: '¿Skip está en Android?',
    questions: [
      '¿Skip está en Android?',
      'version para android?',
      '¿Puedo tener Skip en mi Samsung?',
      'esta en google play skip',
      'mi pareja tiene android, ¿puede usar skip?',
      '¿Skip funciona en un Pixel?',
      '¿no hay app para android?',
      '¿Puedo usar Skip en un teléfono que no sea Apple?',
      'descargar skip para android',
      'me cambié a android, ¿cómo sigo usando skip?',
      '¿Hay Skip para Xiaomi o Huawei?',
    ],
    answer:
      'Por ahora Skip solo está en iPhone. No hay versión para Android.\n\n' +
      'Tus cosas se guardan en tu cuenta, no solo en el teléfono, así que no se pierde nada si te alejas un tiempo de tu iPhone. Inicia sesión en cualquier iPhone para verlas.\n\n' +
      'Si te gustaría tener Skip en Android, cuéntanoslo con **Comparte una idea** en **Ajustes → Soporte y comentarios**.',
    keywords: ['android', 'google play', 'samsung', 'pixel'],
  },
  {
    id: 'getting-started.platform.ipad',
    title: '¿Puedo usar Skip en mi iPad?',
    questions: [
      '¿Puedo usar Skip en iPad?',
      'hay version para ipad?',
      '¿Skip funciona en una tableta?',
      'existe app de skip para ipad',
      '¿puedo tener skip en mi iPhone y en mi iPad?',
      '¿Por qué Skip no se gira en mi iPad?',
      'skip en ipad horizontal',
      '¿Mis datos aparecen en mi iPad?',
      'skip es compatible con ipad',
      'instalar skip en tablet',
      'se ve chiquita la app en mi ipad',
    ],
    answer:
      'Skip está hecho para iPhone, y sus pantallas están diseñadas para la pantalla del iPhone. También puede funcionar en un iPad, pero no tiene un diseño pensado para la pantalla más grande del iPad.\n\nInicia sesión en el iPad igual que en tu iPhone y tus cosas estarán ahí, porque viven en tu cuenta.',
    keywords: ['ipad', 'tablet', 'tableta', 'horizontal'],
  },
  {
    id: 'getting-started.platform.web',
    title: '¿Hay versión web o para computadora?',
    questions: [
      '¿Hay una versión web de Skip?',
      'puedo usar skip en mi computadora',
      '¿Hay app de escritorio?',
      'skip pagina web iniciar sesion',
      '¿Puedo usar Skip en mi laptop?',
      'hay app para windows',
      '¿Puedo abrir Skip en el navegador?',
      '¿Skip está para Mac?',
      'como veo mi presupuesto en una pantalla grande',
      'skip en el ordenador',
      '¿se puede entrar online?',
      'skip tiene web?',
    ],
    answer:
      'No. Skip es una app para iPhone. No hay un sitio web donde iniciar sesión ni una versión pensada para computadoras.\n\n' +
      'Lo más parecido: con Skip Pro puedes exportar tus pagos como hoja de cálculo o PDF y abrirlos en una computadora.\n\n' +
      'Si te gustaría tener Skip en una computadora, envíanos la idea desde **Ajustes → Soporte y comentarios → Comparte una idea**.',
    keywords: ['web', 'navegador', 'computadora', 'ordenador'],
  },
  {
    id: 'getting-started.internet.need',
    title: '¿Necesito internet para usar Skip?',
    questions: [
      '¿Necesito internet para usar Skip?',
      'skip funciona sin conexion',
      '¿Puedo usar Skip sin wifi?',
      '¿funciona en modo avión?',
      '¿Skip guarda si no tengo señal?',
      '¿Skip gasta datos móviles?',
      '¿modo sin conexión?',
      'puedo agregar recibos sin internet',
      'skip consume muchos datos',
      '¿Por qué Skip necesita conexión?',
      '¿Puedo usar Skip en un avión?',
      '¿hace falta conexión para abrir la app?',
      'q pasa si pierdo la señal mientras uso skip',
      'sin wifi no carga mis facturas',
    ],
    answer:
      'Sí. Skip necesita conexión a internet para iniciar sesión, cargar tus cosas y guardar cambios, porque todo vive en tu cuenta y no solo en el teléfono. Sirven tanto el Wi-Fi como los datos móviles.\n\n' +
      'Sin conexión:\n' +
      '- Las páginas que ya abriste siguen en pantalla, pero puede que las nuevas no carguen.\n' +
      '- Guardar no funcionará y verás **Algo salió mal. Inténtalo de nuevo.** No se guarda nada para después, así que inténtalo otra vez cuando vuelvas a tener conexión.\n\n' +
      'El escaneo de recibos lee la foto en el propio iPhone, pero guardar el recibo sigue necesitando conexión.',
    keywords: ['sin conexión', 'offline', 'wifi', 'modo avión'],
  },
  {
    id: 'getting-started.devices.two-phones',
    title: '¿Puedo usar Skip en dos teléfonos?',
    questions: [
      '¿Puedo usar Skip en dos teléfonos?',
      'skip se sincroniza entre dispositivos',
      '¿Cómo pongo Skip en mi segundo iPhone?',
      'mis datos salen en mi otro telefono',
      '¿Puedo tener la sesión abierta en dos iPhone a la vez?',
      'skip en el telefono del trabajo y el personal',
      '¿sincroniza?',
      '¿Hay límite de dispositivos?',
      '¿Por qué mi modo oscuro es distinto en el otro teléfono?',
      '¿Los recordatorios llegan a los dos teléfonos?',
      'mi pro funciona en otro iphone',
      'varios dispositivos misma cuenta',
    ],
    answer:
      'Sí. Inicia sesión en el segundo iPhone igual que en el primero: el mismo ID de Apple, la misma cuenta de Google, o el mismo correo y contraseña. Todo lo que guardas vive en tu cuenta, así que los dos teléfonos muestran las mismas facturas, tarjetas, recibos y cifras.\n\nAlgunas cosas se configuran en cada teléfono, así que ajústalas en cada uno:\n- **Apariencia**, **Idioma**, **Respuesta háptica** y **Bloqueo de la app** en **Ajustes → Preferencias**\n- Las tiendas que Skip recordó por ti y las correcciones de voz\n\nPara que los recordatorios lleguen a un teléfono, activa un recordatorio o el **Resumen mensual** en **Ajustes → Preferencias → Recordatorios** en ese teléfono y permite las notificaciones cuando te lo pida. Si tienes Skip Pro, viene con tu cuenta de Skip, así que funciona en ambos.\n\nCerrar sesión en un teléfono también cierra la sesión en el otro.',
    keywords: ['sincronizar', 'segundo iphone', 'dos teléfonos', 'varios dispositivos'],
  },
  {
    id: 'getting-started.account.share',
    title: '¿Mi pareja puede compartir mi cuenta?',
    questions: [
      '¿Mi pareja puede usar mi cuenta?',
      'mi esposa y yo podemos compartir un presupuesto',
      '¿Mi esposo puede ver mi presupuesto?',
      '¿Cómo invito a alguien a mi presupuesto?',
      '¿Dos personas pueden usar una misma cuenta de Skip?',
      'cuenta conjunta con mi marido',
      'presupuesto compartido con mi compañero de piso',
      'puedo agregar a mi novia a mi skip',
      '¿Skip sirve para presupuestos en pareja?',
      '¿Puedo darle acceso a mi pareja?',
      'skip en familia',
      'compartir gastos con mi roomie',
    ],
    answer:
      'Skip está hecho para una persona por cuenta, y eso forma parte de los **Términos del servicio**. No hay presupuesto compartido ni familiar, ni forma de invitar a alguien a tu cuenta.\n\n' +
      'Lo más parecido: tu pareja puede crear su propia cuenta gratis de Skip en su iPhone. Para una factura que comparten, cada uno puede agregar su parte a su propia cuenta.\n\n' +
      'Si te gustaría tener presupuestos compartidos, envíanos la idea desde **Ajustes → Soporte y comentarios → Comparte una idea**.',
    keywords: ['pareja', 'compartir', 'familia', 'invitar'],
  },
  {
    id: 'getting-started.skip.who-makes',
    title: '¿Quién hace Skip?',
    questions: [
      '¿Quién hace Skip?',
      'quien esta detras de esta app',
      '¿De quién es Skip Budget?',
      'que empresa hizo skip',
      '¿Quién es el desarrollador?',
      '¿Skip lo hizo un banco?',
      '¿Con quién hablo sobre Skip?',
      'quien maneja skip',
      '¿Quién es el equipo de Weknd?',
      '¿cómo contacto a la gente que hace skip?',
      '¿Quién creó Skip Budget?',
      'de quien es esta app',
      '¿Qué equipo hizo Skip?',
      'quienes desarrollaron skip',
    ],
    answer:
      'Skip lo hace el equipo de Weknd. No lo hace un banco y no tiene anuncios.\n\n' +
      'Para contactar al equipo, ve a **Ajustes → Soporte y comentarios**:\n' +
      '- **Escribir a soporte** si algo falla o no está claro\n' +
      '- **Comparte una idea** para algo que te gustaría que Skip hiciera\n\n' +
      'Las respuestas llegan al correo con el que iniciaste sesión.',
    keywords: ['desarrollador', 'empresa', 'weknd', 'equipo'],
  },
  {
    id: 'getting-started.account.required',
    title: '¿Necesito una cuenta para usar Skip?',
    questions: [
      '¿Necesito una cuenta para usar Skip?',
      'puedo usar skip sin registrarme',
      '¿Por qué tengo que crear una cuenta?',
      'se puede saltar el inicio de sesion',
      'usar skip como invitado',
      '¿Hay modo invitado?',
      'para q skip pide mi correo',
      '¿Puedo probar Skip antes de crear una cuenta?',
      '¿no hay opcion sin cuenta?',
      'xq obligan a iniciar sesion',
    ],
    answer:
      'Sí. Skip necesita una cuenta antes de que puedas agregar algo. Tus cosas se guardan en ella, así que están a salvo si pierdes o cambias de teléfono, y puedes iniciar sesión en otro iPhone.\n\n' +
      'Crear una toma un minuto: **Continuar con Apple**, **Continuar con Google** o **Continuar con correo**. Apple y Google no piden contraseña ni código por correo.',
    keywords: ['invitado', 'sin cuenta', 'registro', 'por qué cuenta'],
  },

  // Opening Skip and the welcome pages

  {
    id: 'getting-started.launch.splash',
    title: '¿Qué es la animación al abrir Skip?',
    questions: [
      '¿Qué es la animación cuando abre Skip?',
      'xq sale un video cada vez que abro la app',
      '¿Puedo quitar la animación de inicio?',
      'que es lo del logo al principio',
      'video de la pantalla de apertura',
      '¿Por qué la pantalla de inicio sale clara en modo oscuro?',
      '¿El video de inicio me para la música?',
      'saltar la pantalla de carga de skip',
      'la animacion del logo es molesta',
      '¿Por qué la pantalla de apertura es color crema?',
      '¿Cuánto dura la animación de apertura?',
      'la animación de inicio me marea',
    ],
    answer:
      'Es Skip abriéndose. El símbolo de Skip crece, aparece la palabra Skip y luego se funde con la app. Dura unos 2 segundos, y mientras se reproduce Skip va cargando por debajo.\n\n' +
      '- Es silenciosa y no detiene la música ni los podcasts que estés escuchando.\n' +
      '- Siempre va sobre un fondo crema claro, incluso en modo oscuro. La app cambia a tu apariencia en cuanto se abre.\n' +
      '- Solo se reproduce cuando Skip arranca de cero, no cuando vuelves a Skip desde otra app.\n\n' +
      'No hay ajuste para quitarla. Si tienes activado **Reducir movimiento** en **Ajustes → Accesibilidad → Movimiento** de tu iPhone, ves un momento el logo ya terminado en lugar de la animación.',
    keywords: ['animación', 'logo', 'video de inicio', 'reducir movimiento'],
  },
  {
    id: 'getting-started.launch.stuck',
    title: 'Skip se queda en el logo de inicio',
    questions: [
      'Skip se queda en el logo',
      'la app no pasa de la pantalla de inicio',
      'Skip se congela al abrir',
      'se queda en la pantalla crema',
      'la animación de apertura nunca termina',
      'Skip no abre',
      'la app se cuelga al iniciar',
      'skip solo muestra el logo y nada más',
      'pantalla en blanco al abrir skip',
      'sigue cargando en la primera pantalla',
      'no abre la app, se queda pegada',
    ],
    answer:
      'Skip no se queda esperando mucho en el logo. Si la animación no puede reproducirse, Skip se abre de todos modos después de unos segundos.\n\n' +
      'Si aun así parece atascada:\n' +
      '1. Desliza hacia arriba desde la parte inferior de la pantalla y haz una pausa para ver tus apps abiertas.\n' +
      '2. Desliza Skip hacia arriba para sacarla de la pantalla y cerrarla.\n' +
      '3. Abre Skip de nuevo.\n\n' +
      'Si pasa cada vez, reinicia tu iPhone y busca una actualización de Skip en el App Store. Si sigue sin abrir, escribe a admin@skipapps.net para que lo revisemos.',
    keywords: ['congelado', 'no abre', 'pantalla en blanco', 'se queda en el logo'],
  },
  {
    id: 'getting-started.welcome.page',
    title: '¿Qué hay en la pantalla de bienvenida?',
    questions: [
      '¿Qué hay en la pantalla de bienvenida?',
      'que toco primero',
      '¿Cómo empiezo a usar Skip?',
      'la primera pagina dice tu dinero tu privacidad y ahora que',
      '¿Comenzar o Iniciar sesión, cuál elijo?',
      'para que sirve comenzar',
      'primera vez que abro skip',
      'soy nuevo, ¿por dónde empiezo?',
      '¿Qué es la página de bienvenida?',
      'q boton aprieto si soy nueva',
      'acabo de instalar skip, que oprimo',
    ],
    answer:
      'La pantalla de bienvenida es la primera página que ves antes de iniciar sesión. Muestra el símbolo de Skip, **Tu dinero, tu privacidad.** y un recordatorio de que Skip nunca necesita el acceso a tu banco.\n\n' +
      'Abajo hay dos opciones:\n' +
      '- **Comenzar** si es tu primera vez. Muestra dos páginas cortas sobre Skip y luego creas tu cuenta.\n' +
      '- **¿Ya tienes una cuenta? Inicia sesión** si ya usaste Skip antes.\n\n' +
      'Cuando ya iniciaste sesión, Skip se abre directo en **Inicio** y no vuelves a ver esta página a menos que cierres sesión.',
    keywords: ['bienvenida', 'comenzar', 'primera pantalla', 'usuario nuevo'],
  },
  {
    id: 'getting-started.welcome.why',
    title: '¿Qué es la página Por qué Skip?',
    questions: [
      '¿Qué es la página Por qué Skip?',
      'que significa conciencia privacidad control',
      'entiende tu dinero no solo lo automatices, ¿qué significa?',
      '¿Qué es la página que sigue después de Comenzar?',
      'explicación de la página por qué skip',
      'qué significa la frase del libro de cuentas',
      '¿Cuáles son las tres cosas de la pantalla Por qué Skip?',
      '¿Qué significa Decides tú, no un algoritmo?',
      'la pagina con la frase de los centavos',
      'qué quiere decir skip en esa página',
    ],
    answer:
      '**Por qué Skip** es la página que viene justo después de **Comenzar**. Explica la idea detrás de Skip: **Entiende tu dinero. No solo lo automatices.**\n\n' +
      'Tiene tres partes:\n' +
      '- **Conciencia**: Cada centavo, bien contado.\n' +
      '- **Privacidad**: Sin accesos a tu banco. Nunca.\n' +
      '- **Control**: Decides tú, no un algoritmo.\n\n' +
      'Antes la gente anotaba cada centavo en un libro de cuentas. Skip trae ese hábito de vuelta, sin el papeleo. Toca **Continuar**, abajo, para ver **Lo que Skip puede hacer**.',
    keywords: ['por qué skip', 'conciencia', 'privacidad', 'control'],
  },
  {
    id: 'getting-started.welcome.can-do',
    title: '¿Qué muestra Lo que Skip puede hacer?',
    questions: [
      '¿Qué muestra Lo que Skip puede hacer?',
      'cuales son las cinco cosas que hace skip',
      'la pagina con el boton vamos',
      '¿Qué significa Préstamos exactos?',
      'que quiere decir ahorro claro y automático',
      'si toco la lista de funciones no pasa nada',
      '¿Por qué no puedo tocar las filas de Lo que Skip puede hacer?',
      'explicacion de lo que skip puede hacer',
      '¿La lista de la introducción son todas las funciones?',
      'que pasa cuando le doy a vamos',
    ],
    answer:
      '**Lo que Skip puede hacer** es la última página antes de crear tu cuenta. Lista cinco cosas:\n\n' +
      '- **Sin conectar tu banco**: los datos de tu banco siempre son privados.\n' +
      '- **Escanea recibos al instante**: se leen en tu teléfono, nunca se suben.\n' +
      '- **Préstamos exactos**: interés diario, igual que tu banco.\n' +
      '- **Ahorro claro y automático**: lo que sobra se ahorra, con las cuentas a la vista.\n' +
      '- **Avisos antes de cada pago**: facturas, renovaciones y día de pago, con tiempo.\n\n' +
      'Las filas son solo para leer, así que tocarlas no hace nada. Toca **¡Vamos!** para elegir cómo registrarte.',
    keywords: ['lo que skip puede hacer', 'funciones', 'vamos', 'introducción'],
  },
  {
    id: 'getting-started.welcome.stuck',
    title: 'No encuentro el botón para seguir',
    questions: [
      'no encuentro el botón para continuar',
      'donde esta el boton de continuar',
      'estoy atorado en la página Por qué Skip',
      'como paso a la siguiente pagina',
      'la página no avanza',
      'no hay botón siguiente en la introducción',
      'el texto es muy grande y no veo ¡Vamos!',
      '¿Cómo salgo de las páginas de introducción?',
      'las palabras se cortan abajo',
      'donde esta el boton en la pagina de bienvenida',
      'no me sale el botón de comenzar',
    ],
    answer:
      'El botón para avanzar siempre está fijo en la parte de abajo de la pantalla, aunque la página sea más alta que tu pantalla:\n\n' +
      '- **Bienvenida**: **Comenzar**\n' +
      '- **Por qué Skip**: **Continuar**\n' +
      '- **Lo que Skip puede hacer**: **¡Vamos!**\n\n' +
      'Si usas texto más grande, una parte de la página puede quedar bajo el botón. Desliza hacia arriba en la página para leer el resto. El botón se queda donde está.',
    keywords: ['atorado', 'continuar', 'siguiente', 'texto grande'],
  },
  {
    id: 'getting-started.welcome.back',
    title: '¿Cómo vuelvo atrás en las páginas de bienvenida?',
    questions: [
      '¿Cómo vuelvo a la página de bienvenida anterior?',
      'puedo ver otra vez las paginas de introduccion',
      'quiero volver a leer la página Por qué Skip',
      '¿Cómo regreso a la pantalla de bienvenida?',
      'deslizar hacia atrás no me lleva a la bienvenida',
      'a donde se fue la introduccion despues de registrarme',
      '¿Puedo repetir la introducción?',
      'regresar desde configura tu inicio de sesión',
      'como vuelvo a la primera pantalla',
      'toqué ¡Vamos! muy rápido, ¿puedo regresar?',
      'quiero ver de nuevo el tutorial de bienvenida',
    ],
    answer:
      'Antes de iniciar sesión, puedes ir y volver con libertad. Toca la flecha de regreso arriba a la izquierda, o desliza hacia la derecha desde el borde izquierdo de la pantalla.\n\n' +
      'Cuando ya iniciaste sesión, las páginas de bienvenida se cierran detrás de ti a propósito, para que un deslizamiento no te saque de la app por error. Solo vuelven a aparecer después de cerrar sesión (**Ajustes → Cerrar sesión**, en **Cuenta**).',
    keywords: ['regresar', 'introducción', 'onboarding', 'volver a ver'],
  },

  // Creating an account

  {
    id: 'getting-started.signup.ways',
    title: '¿Cómo creo una cuenta?',
    questions: [
      '¿Cómo creo una cuenta?',
      'como me regsitro',
      'crear una cuenta nueva de skip',
      '¿Cómo me registro en Skip?',
      '¿De qué formas puedo registrarme?',
      '¿Dónde me registro?',
      'pasos para crear cuenta',
      'como empiezo con una cuenta',
      'qué es configura tu inicio de sesión',
      'Configura tu inicio de sesión, ¿qué elijo?',
      'usuario nuevo registro',
      'cuanto tarda crear la cuenta',
    ],
    answer:
      '1. En la pantalla de bienvenida, toca **Comenzar**.\n' +
      '2. Toca **Continuar** y luego **¡Vamos!**.\n' +
      '3. En **Configura tu inicio de sesión**, toca **Continuar con Google**, **Continuar con Apple** o **Continuar con correo**.\n\n' +
      'Con Apple o Google, entras de inmediato. Con correo, escribes tu correo y una contraseña, y luego el código de 6 dígitos que te enviamos por correo.\n\n' +
      'Después, Skip te pregunta cómo quieres que te llamemos y te muestra **Configuremos Skip** para ponerte en marcha.',
    keywords: ['registrarme', 'crear cuenta', 'registro', 'cuenta nueva'],
  },
  {
    id: 'getting-started.signup.which',
    title: '¿Apple, Google o correo? ¿Cuál uso?',
    questions: [
      '¿Me registro con Apple, Google o correo?',
      'cual opcion de inicio de sesion es mejor',
      'diferencia entre apple y correo',
      '¿Es mejor usar Google o correo?',
      'cual inicio de sesion debo elegir',
      'apple vs google para entrar',
      '¿Importa cómo me registre?',
      '¿Cuál es la forma más segura de entrar?',
      'continuar con apple o continuar con correo',
      '¿Puedo cambiar después cómo inicio sesión?',
      'qué conviene más: apple, google o mi correo',
    ],
    answer:
      'Cualquiera sirve, y todas te dan el mismo Skip. Elige la que sea menos probable que pierdas:\n\n' +
      '- **Continuar con Apple**: lo más rápido en iPhone. Sin contraseña, se confirma con Face ID o tu código, y puedes ocultar tu correo a Skip.\n' +
      '- **Continuar con Google**: cómodo si usas Gmail. No hay contraseña de Skip que recordar.\n' +
      '- **Continuar con correo**: sirve con cualquier correo. Creas una contraseña de al menos 6 caracteres y confirmas la dirección con un código de 6 dígitos.\n\n' +
      'Lo importante: usa siempre la misma forma. Entrar de otra manera puede abrir una cuenta distinta y vacía, y no hay ajuste para cambiar de método después.',
    keywords: ['apple', 'google', 'correo', 'cuál elegir'],
  },
  {
    id: 'getting-started.signup.email',
    title: '¿Cómo me registro con mi correo?',
    questions: [
      '¿Cómo me registro con mi correo?',
      'pasos de continuar con correo',
      'crear cuenta con correo y contraseña',
      '¿Dónde está el registro con correo?',
      'no quiero usar apple ni google',
      'como funciona crea tu cuenta',
      'registrarme sin id de apple',
      '¿Puedo usar mi correo del trabajo?',
      'registro por email',
      '¿puedo usar una dirección de hotmail o yahoo?',
      'quiero registrarme con email y password',
    ],
    answer:
      '1. En **Configura tu inicio de sesión**, toca **Continuar con correo**, debajo de los botones de Apple y Google.\n' +
      '2. Escribe tu **Correo**, una **Contraseña** y la misma contraseña otra vez en **Confirma la contraseña**.\n' +
      '3. Toca **Crear cuenta**.\n' +
      '4. Busca en tu bandeja de entrada un código de 6 dígitos y escríbelo en **Ingresa el código**. Skip lo revisa en cuanto entra el sexto dígito.\n\n' +
      'Sirve cualquier dirección de correo a la que tengas acceso. Tu contraseña necesita al menos 6 caracteres. Si ya tienes una cuenta, toca **Ya tengo una cuenta**.',
    keywords: ['registro con correo', 'continuar con correo', 'contraseña', 'hotmail'],
  },
  {
    id: 'getting-started.signup.apple',
    title: '¿Cómo funciona Continuar con Apple?',
    questions: [
      '¿Cómo funciona Continuar con Apple?',
      'iniciar sesion con apple id',
      '¿Qué es Ocultar mi correo?',
      'debo ocultar mi correo con apple',
      '¿Apple le da mi correo a Skip?',
      '¿Por qué mi correo es una dirección rara de privaterelay?',
      'entrar con apple',
      'registrarme con face id',
      '¿Iniciar sesión con Apple necesita contraseña?',
      '¿qué datos de mi id de apple recibe skip?',
      'Iniciar sesión con Apple, primera vez',
    ],
    answer:
      '**Continuar con Apple** usa el ID de Apple de tu iPhone, así que no hay contraseña de Skip ni código por correo.\n\n' +
      '1. Toca **Continuar con Apple** en **Configura tu inicio de sesión** o en **Iniciar sesión**.\n' +
      '2. Confirma con Face ID o tu código.\n' +
      '3. La primera vez, Apple te deja compartir tu correo o elegir **Ocultar mi correo electrónico**. Ocultar mi correo electrónico le da a Skip una dirección privada que termina en privaterelay.appleid.com y te reenvía los mensajes.\n\n' +
      'Sirve para gente nueva y para quien regresa: el mismo ID de Apple siempre abre la misma cuenta de Skip. Apple no le pasa tu nombre a Skip, así que Skip te pregunta después cómo quieres que te llamemos.',
    keywords: ['apple', 'id de apple', 'ocultar mi correo', 'privaterelay'],
  },
  {
    id: 'getting-started.signup.google',
    title: '¿Cómo funciona Continuar con Google?',
    questions: [
      '¿Cómo funciona Continuar con Google?',
      'entrar con gmail',
      'iniciar sesión con mi cuenta de google',
      '¿Por qué dice Abriendo Google?',
      'me pide usar google.com para iniciar sesion, ¿esta bien?',
      'registrarme con google',
      'usar mi gmail para skip',
      '¿Iniciar sesión con Google necesita contraseña?',
      'escoger otra cuenta de google',
      '¿Qué recibe Skip de Google?',
      '¿se abre una ventana de google al tocar el boton, es normal?',
    ],
    answer:
      '**Continuar con Google** te inicia sesión con tu cuenta de Google, así que no hay contraseña de Skip ni código por correo.\n\n' +
      '1. Toca **Continuar con Google**. Dice **Abriendo Google…** mientras arranca.\n' +
      '2. Tu iPhone puede preguntar si dejas que Skip Budget use google.com para iniciar sesión. Toca **Continuar**.\n' +
      '3. Elige tu cuenta de Google o inicia sesión en Google.\n\n' +
      'La misma cuenta de Google siempre abre la misma cuenta de Skip, así que elige la misma cada vez. Si cierras la ventana de Google, no cambia nada y puedes intentarlo de nuevo.',
    keywords: ['google', 'gmail', 'abriendo google', 'continuar con google'],
  },
  {
    id: 'getting-started.signup.other-methods',
    title: '¿Puedo iniciar sesión con mi número de teléfono?',
    questions: [
      '¿Puedo iniciar sesión con mi número de teléfono?',
      'entrar con facebook',
      '¿Hay inicio de sesión con Microsoft?',
      'registrarme por sms',
      'puedo usar un código por mensaje en vez de correo',
      'otras formas de iniciar sesión',
      'entrar con instagram',
      '¿no hay login con numero de telefono?',
      '¿Puedo entrar con un enlace mágico?',
      '¿Puedo usar una passkey?',
      'login con mensaje de texto',
    ],
    answer:
      'No. Skip tiene tres formas de iniciar sesión: **Continuar con Apple**, **Continuar con Google** y **Continuar con correo** (correo y contraseña). No hay inicio de sesión con número de teléfono, mensaje de texto, Facebook, Microsoft ni otro servicio.\n\n' +
      'Si te gustaría otra forma, envíanos la idea desde **Ajustes → Soporte y comentarios → Comparte una idea**.',
    keywords: ['teléfono', 'sms', 'facebook', 'passkey'],
  },
  {
    id: 'getting-started.signup.email-taken',
    title: 'Dice que ese correo ya tiene una cuenta',
    questions: [
      'Dice que ese correo ya tiene una cuenta',
      'correo ya registrado',
      'por que no puedo registrarme con mi correo',
      'Ese correo ya tiene una cuenta, pero nunca me registré',
      'al registrarme dice que el correo ya existe',
      'hice una cuenta antes y se me olvidó',
      'no puedo crear cuenta, correo en uso',
      'error correo ya existe',
      '¿Cómo uso un correo que ya tiene cuenta?',
      'mensaje de ya tengo una cuenta',
      'salio q el correo ya esta usado',
    ],
    answer:
      '**Ese correo ya tiene una cuenta.** significa que ya hay una cuenta de Skip con ese correo, probablemente de un registro anterior. Cada correo puede tener una sola cuenta de Skip.\n\n' +
      '1. Toca **Ya tengo una cuenta**.\n' +
      '2. Inicia sesión con tu contraseña.\n' +
      '3. Si no la recuerdas, toca **¿Olvidaste tu contraseña?** en la página **Iniciar sesión**.\n\n' +
      'Si primero usaste Apple o Google con este correo, toca ese botón en **Iniciar sesión**.',
    keywords: ['correo ya registrado', 'correo en uso', 'cuenta existente', 'ya tengo cuenta'],
  },
  {
    id: 'getting-started.signup.bad-email',
    title: 'Dice que mi correo no parece correcto',
    questions: [
      'Dice que mi correo no parece correcto',
      'esa dirección de correo no parece correcta',
      'skip no acepta mi correo',
      'error de correo inválido',
      '¿Por qué rechazan mi dirección de correo?',
      'mi correo está bien pero dice que está mal',
      'correo no válido al registrarme',
      'error en la casilla del correo',
      'formato de correo incorrecto',
      'no puedo escribir mi correo',
      'dice q mi email es invalido',
    ],
    answer:
      '**Esa dirección de correo no parece correcta.** significa que la dirección tiene un error o le falta una parte. Revisa:\n\n' +
      '- Una @ y un punto, como nombre@ejemplo.com\n' +
      '- Un espacio dentro de la dirección\n' +
      '- Una coma donde debería ir un punto\n\n' +
      'Corrígela y toca el botón otra vez. Si tu correo está bien y aun así no lo aceptan, prueba con **Continuar con Apple** o **Continuar con Google**.',
    keywords: ['correo inválido', 'formato de correo', 'dirección no válida', 'error de correo'],
  },
  {
    id: 'getting-started.signup.missing-fields',
    title: 'Me pide ingresar mi correo y contraseña',
    questions: [
      'Dice ingresa tu correo y tu contraseña',
      'error ingresa un correo y una contraseña',
      'Ingresa el correo de tu cuenta, ¿qué significa?',
      'por qué dice ingresa mi correo si ya lo puse',
      'el botón de iniciar sesión dice ingresa correo y contraseña',
      'error al tocar crear cuenta',
      'no pasa nada cuando toco iniciar sesión',
      'olvidé mi contraseña y me pide el correo',
      'me sigue pidiendo mi correo',
      'error de casilla vacía al iniciar sesión',
    ],
    answer:
      'Esto sale cuando una casilla está vacía. Skip necesita todas llenas para poder seguir:\n\n' +
      '- **Ingresa tu correo y tu contraseña.** en **Iniciar sesión**\n' +
      '- **Ingresa un correo y una contraseña.** en **Crea tu cuenta**\n' +
      '- **Ingresa el correo de tu cuenta.** en **¿Olvidaste tu contraseña?**\n\n' +
      'Toca cada casilla y llénala, y luego toca el botón otra vez. Si tu iPhone rellenó una contraseña guardada, revisa que la casilla de **Correo** también se haya llenado.',
    keywords: ['casilla vacía', 'ingresa tu correo', 'campo vacío', 'falta correo'],
  },

  // Email codes

  {
    id: 'getting-started.code.what',
    title: '¿Para qué sirve el código de 6 dígitos?',
    questions: [
      '¿Para qué sirve el código de 6 dígitos?',
      'por que necesito un codigo de verificacion',
      '¿Dónde escribo el código?',
      'que es la pagina ingresa el codigo',
      '¿Cómo verifico mi correo?',
      'puedo pegar el código',
      '¿El código se llena solo?',
      'dice ingresa los 6 dígitos',
      'confirmar mi correo en skip',
      'codigo otp que es',
      '¿Tengo que verificar mi cuenta?',
      'skip me mandó un número por correo, ¿dónde lo escribo?',
      '¿qué hago con el número del correo?',
      'el correo trae unos dígitos, ¿para qué son?',
    ],
    answer:
      'Cuando te registras con correo, Skip envía un código de 6 dígitos a esa dirección. Al escribirlo en **Ingresa el código** se comprueba que el correo es tuyo, lo que protege tu cuenta y te permite restablecer tu contraseña más adelante.\n\n' +
      '- Escribe o pega el código. Tu iPhone también puede ofrecértelo sobre el teclado.\n' +
      '- Skip lo revisa en cuanto están los 6 dígitos, o toca **Continuar**.\n' +
      '- **Ingresa los 6 dígitos.** significa que falta un dígito.\n' +
      '- Se envía el mismo tipo de código cuando usas **¿Olvidaste tu contraseña?**.\n\n' +
      'El inicio de sesión con Apple y Google no necesita código.',
    keywords: ['código', 'otp', 'verificación', '6 dígitos'],
  },
  {
    id: 'getting-started.code.missing',
    title: 'No me llegó el código por correo',
    questions: [
      'No me llegó el código por correo',
      'no llega el corre de verificacion',
      'el código nunca llegó',
      '¿Dónde está mi código?',
      'el correo de skip no llega',
      '¿Cómo reenvío el código?',
      'sigo esperando el código de 6 dígitos',
      'revisar spam por el código de skip',
      'escribí mal mi correo al registrarme',
      'no recibí el código para restablecer la contraseña',
      'no hay nada de skip en mi bandeja',
      'reenviar código no funciona',
      'ya pasaron minutos y no me llega el mail',
    ],
    answer:
      'Si el código no ha llegado:\n\n' +
      '1. Revisa tu carpeta de spam o correo no deseado. A veces los correos de apps nuevas caen ahí.\n' +
      '2. Revisa la dirección que aparece en **Ingresa el código**. Si tiene un error, toca la flecha de regreso y corrígela.\n' +
      '3. Toca **Reenviar código** para recibir uno nuevo, y usa el código del correo más reciente.\n' +
      '4. Espera un minuto entre intentos, para no llegar al límite.\n\n' +
      'Con **¿Olvidaste tu contraseña?**, el código solo llega si ese correo tiene una cuenta de Skip. Si te registraste con Apple o Google, usa ese botón en **Iniciar sesión**.',
    keywords: ['sin código', 'reenviar código', 'spam', 'no llega'],
  },
  {
    id: 'getting-started.code.wrong',
    title: 'Dice que mi código no es correcto',
    questions: [
      'Dice que mi código no es correcto',
      'ese código no es correcto, revísalo e inténtalo de nuevo',
      'código de verificación incorrecto',
      'el código no funciona',
      '¿Por qué rechazan mi código?',
      'escribí el código igualito y falla',
      'codigo invalido skip',
      'el código de mi correo no sirve',
      'otp equivocado',
      '¿Cómo borro las casillas del código?',
    ],
    answer:
      '**Ese código no es correcto. Revísalo e inténtalo de nuevo.** significa que los dígitos no coinciden con el último código que enviamos.\n\n' +
      '- Usa el código del correo más reciente de Skip. Si pediste un código nuevo, los anteriores pueden dejar de servir.\n' +
      '- Asegúrate de que el código se envió al mismo correo que aparece en la página.\n' +
      '- Para corregir un dígito, borra hasta llegar a él y vuelve a escribir.\n\n' +
      'Si sigue fallando, toca **Reenviar código** y usa el nuevo.',
    keywords: ['código incorrecto', 'código inválido', 'otp', 'no funciona'],
  },
  {
    id: 'getting-started.code.expired',
    title: 'Dice que mi código ya expiró',
    questions: [
      'Dice que mi código ya expiró',
      'ese código ya expiró, pide uno nuevo',
      'código expirado',
      '¿Cuánto dura el código?',
      '¿Por qué expiró mi código?',
      'el código viejo no funciona',
      'tardé mucho en escribir el código',
      'código de verificación vencido',
      'se agotó el tiempo del código',
      '¿El código caduca?',
    ],
    answer:
      '**Ese código ya expiró. Pide uno nuevo.** significa que el código es demasiado viejo para usarse. Los códigos solo duran un tiempo limitado, para proteger tu cuenta.\n\n' +
      'Toca **Reenviar código** en la misma página y escribe el código del correo más reciente. Si no está en tu bandeja de entrada, revisa también tu carpeta de spam.',
    keywords: ['código expirado', 'vencido', 'caducó', 'código viejo'],
  },
  {
    id: 'getting-started.code.too-many',
    title: 'Dice que hice demasiados intentos',
    questions: [
      'Dice demasiados intentos',
      'demasiados intentos, espera un minuto e inténtalo de nuevo',
      'me bloquearon por muchos intentos',
      'por que no me deja iniciar sesion',
      'error de límite de intentos',
      '¿Puedo intentar de nuevo ya?',
      'le di a reenviar demasiadas veces',
      '¿cuánto tengo que esperar para iniciar sesión?',
      'demasiadas solicitudes skip',
      'no me deja probar mi contraseña otra vez',
    ],
    answer:
      '**Demasiados intentos. Espera un minuto e inténtalo de nuevo.** significa que hubo varios intentos en poco tiempo, así que Skip hace una pausa para proteger tu cuenta. Puede salir al iniciar sesión, al enviar un código o al escribir un código.\n\n' +
      'Espera uno o dos minutos y vuelve a intentarlo una sola vez. Evita pedir un código nuevo muchas veces seguidas: cada solicitud cuenta, y solo el código más reciente es el que sirve.',
    keywords: ['demasiados intentos', 'límite', 'bloqueado', 'esperar'],
  },
  {
    id: 'getting-started.code.later',
    title: 'Nunca puse mi código, ¿qué hago?',
    questions: [
      'Nunca puse mi código, ¿qué hago?',
      'cerré la app antes de verificar',
      '¿Cómo termino de registrarme?',
      'mi cuenta no está confirmada',
      '¿Puedo verificar mi correo después?',
      'me salí en medio del registro',
      'cuenta sin verificar, ¿cómo entro?',
      'al iniciar sesión me manda un código otra vez',
      '¿Por qué iniciar sesión me pide un código?',
      'registro a medias',
    ],
    answer:
      'No pasa nada. Tu cuenta solo está esperando a ser confirmada.\n\n' +
      '1. Abre Skip y toca **¿Ya tienes una cuenta? Inicia sesión**.\n' +
      '2. Escribe el correo y la contraseña con los que te registraste y toca **Iniciar sesión**.\n' +
      '3. Skip envía un código nuevo y abre **Ingresa el código**.\n' +
      '4. Escribe el código nuevo y listo, ya estás dentro.\n\n' +
      'Por eso a veces iniciar sesión pide un código: significa que el correo nunca se confirmó. Si también olvidaste la contraseña, toca **¿Olvidaste tu contraseña?** en **Iniciar sesión**.',
    keywords: ['sin verificar', 'sin confirmar', 'terminar registro', 'verificar después'],
  },

  // Passwords

  {
    id: 'getting-started.password.rules',
    title: '¿Qué reglas tiene la contraseña?',
    questions: [
      '¿Qué reglas tiene la contraseña?',
      'cuántos caracteres debe tener mi contraseña',
      'la contraseña debe tener al menos 6 caracteres',
      '¿Mi contraseña necesita un número o un símbolo?',
      'requisitos de la contraseña',
      'longitud mínima de contraseña',
      'xq mi contraseña es muy corta',
      '¿Las cuentas de Apple y Google tienen contraseña de Skip?',
      '¿mi contraseña puede llevar espacios?',
      '¿Cómo es una buena contraseña para skip?',
      '¿La contraseña distingue mayúsculas y minúsculas?',
    ],
    answer:
      'Tu contraseña de Skip necesita al menos 6 caracteres. Sirven letras, números y símbolos, las mayúsculas cuentan distinto que las minúsculas, y cuanto más larga, más segura.\n\n' +
      'Si es más corta, verás **La contraseña debe tener al menos 6 caracteres.** La escribes dos veces (**Contraseña** y **Confirma la contraseña**), para que un error al teclear no te deje fuera.\n\n' +
      'Solo las cuentas con correo tienen contraseña de Skip. **Continuar con Apple** y **Continuar con Google** no usan una.',
    keywords: ['contraseña', 'longitud', 'caracteres', 'requisitos'],
  },
  {
    id: 'getting-started.password.mismatch',
    title: 'Dice que las contraseñas no coinciden',
    questions: [
      'Dice que las contraseñas no coinciden',
      'las contraseñas no coinciden',
      'error en confirmar contraseña',
      'las contraseñas no coinciden pero sí son iguales',
      '¿Por qué mis dos contraseñas no coinciden?',
      'para qué sirve confirmar la contraseña',
      'confirma la contraseña nueva no coincide',
      'error de coincidencia al registrarme',
      'escribí la misma contraseña dos veces',
      'contraseña y confirmar contraseña son diferentes',
    ],
    answer:
      '**Las contraseñas no coinciden.** significa que las dos casillas de contraseña no son exactamente iguales. Una mayúscula o un espacio de más cuenta como diferente.\n\n' +
      'Borra las dos casillas y escribe la contraseña otra vez en cada una (**Contraseña** y **Confirma la contraseña**, o **Contraseña nueva** y **Confirma la contraseña nueva**), y luego toca el botón otra vez.',
    keywords: ['no coinciden', 'confirmar contraseña', 'contraseñas distintas'],
  },
  {
    id: 'getting-started.password.forgot',
    title: 'Olvidé mi contraseña',
    questions: [
      'Olvidé mi contraseña',
      'restablecer mi contraseña',
      '¿Cómo recupero mi cuenta?',
      'no recuerdo mi contraseña de skip',
      'pasos para recuprar contraseña',
      'donde esta olvidaste tu contraseña',
      'no puedo entrar a mi cuenta',
      '¿Cómo vuelvo a entrar sin mi contraseña?',
      'página Crea una contraseña nueva',
      'correo para cambiar contraseña',
      'perdí mi contraseña',
      '¿Pierdo mis datos si restablezco la contraseña?',
      'olvide mi clave',
    ],
    answer:
      'Puedes crear una nueva en un par de minutos:\n\n' +
      '1. En la pantalla de bienvenida, toca **¿Ya tienes una cuenta? Inicia sesión**.\n' +
      '2. Toca **¿Olvidaste tu contraseña?** debajo de la casilla de contraseña.\n' +
      '3. Escribe el correo de tu cuenta y toca **Continuar**.\n' +
      '4. Escribe en **Ingresa el código** el código de 6 dígitos que te enviamos por correo.\n' +
      '5. En **Crea una contraseña nueva**, escribe una contraseña nueva dos veces y toca **Continuar**.\n\n' +
      'Quedas con la sesión iniciada y entras a **Inicio**, con todas tus cosas donde estaban. La próxima vez, inicia sesión con la contraseña nueva.',
    keywords: ['olvidé mi contraseña', 'restablecer', 'recuperar', 'clave'],
  },
  {
    id: 'getting-started.password.forgot-social',
    title: 'Usé Apple o Google, ¿cuál es mi contraseña?',
    questions: [
      'Me registré con Apple, ¿cuál es mi contraseña?',
      'cual es mi contraseña si use google',
      'no sé de qué forma me registré',
      'Olvidé mi contraseña pero usé Apple',
      'no hay contraseña con apple',
      '¿Cómo inicio sesión si me registré con Google?',
      'no recuerdo si usé correo o apple',
      '¿Con cuál inicié sesión?',
      'restablecer contraseña de mi cuenta de google',
      'contraseña de skip para id de apple',
    ],
    answer:
      'En ese caso no hay contraseña de Skip. Cuando te registras con **Continuar con Apple** o **Continuar con Google**, Apple o Google confirma que eres tú, así que Skip nunca crea una contraseña.\n\n' +
      'Para iniciar sesión, toca el mismo botón otra vez en **Iniciar sesión**. Si no sabes cuál usaste, prueba uno: el correcto abre tu cuenta con todas tus cosas. Si en cambio caes en una cuenta vacía, ve a **Ajustes**, toca **Cerrar sesión** (en **Cuenta**) y prueba la otra forma.',
    keywords: ['contraseña de apple', 'contraseña de google', 'qué método usé'],
  },
  {
    id: 'getting-started.password.change',
    title: '¿Cómo cambio mi contraseña?',
    questions: [
      '¿Cómo cambio mi contraseña?',
      'cambiar contraseña en ajustes',
      'donde esta el ajuste de contraseña',
      'actualizar mi contraseña de skip',
      'quiero otra contraseña pero me acuerdo de la anterior',
      'contraseña nueva con la sesión iniciada',
      '¿Puedo cambiar mi contraseña dentro de la app?',
      'como poner otra contraseña',
      'no veo la opción de cambiar contraseña',
      'filtraron mi contraseña, ¿cómo la cambio?',
    ],
    answer:
      'No hay un ajuste de contraseña dentro de Skip, pero puedes crear una nueva con **¿Olvidaste tu contraseña?**:\n\n1. Ve a **Ajustes** y toca **Cerrar sesión** (en **Cuenta**). Esto también cierra la sesión en tus otros teléfonos.\n2. En la pantalla de bienvenida, toca **¿Ya tienes una cuenta? Inicia sesión**.\n3. Toca **¿Olvidaste tu contraseña?**, escribe tu correo y toca **Continuar**.\n4. Escribe el código de 6 dígitos de tu correo.\n5. Escribe tu contraseña nueva dos veces y toca **Continuar**.\n\nVuelves a entrar con todo donde lo dejaste. Elige una contraseña que no hayas usado antes en Skip. Si inicias sesión con Apple o Google, no hay contraseña de Skip que cambiar.',
    keywords: ['cambiar contraseña', 'contraseña nueva', 'actualizar contraseña', 'clave'],
  },
  {
    id: 'getting-started.password.reset-error',
    title: 'Dice 6 caracteres pero mi contraseña es más larga',
    questions: [
      'Dice mínimo 6 caracteres pero mi contraseña es más larga',
      'crear contraseña nueva dice que es muy corta',
      'contraseña nueva rechazada',
      'por qué skip no acepta mi contraseña nueva',
      '¿Puedo reutilizar mi contraseña anterior?',
      'dice 6 caracteres pero tiene 10',
      'error al restablecer con contraseña larga',
      'no puedo guardar la contraseña nueva',
      'la misma contraseña de antes',
      'contraseña nueva no aceptada',
    ],
    answer:
      'Esto puede pasar en **Crea una contraseña nueva** cuando la contraseña nueva es igual a la anterior. Skip no acepta de nuevo tu contraseña anterior, y en ese caso muestra **La contraseña debe tener al menos 6 caracteres.**\n\n' +
      'Escribe una contraseña que no hayas usado antes en Skip, de al menos 6 caracteres, en las dos casillas, y toca **Continuar**.',
    keywords: ['muy corta', 'misma contraseña', 'contraseña anterior', 'rechazada'],
  },

  // Signing in and out

  {
    id: 'getting-started.signin.how',
    title: '¿Cómo inicio sesión?',
    questions: [
      '¿Cómo inicio sesión?',
      'donde esta el login',
      'ya tengo cuenta, ¿dónde entro?',
      'iniciar seción en skip',
      'como entro en un telefono nuevo',
      'toqué comenzar pero ya tengo cuenta',
      'pagina de inicio de sesion',
      '¿Cómo vuelvo a entrar a mi cuenta?',
      'entrar con correo y contraseña',
      '¿a dónde van los usuarios que ya tienen cuenta?',
      'reinstalé Skip, ¿cómo inicio sesión?',
      'como hago login',
    ],
    answer:
      '1. En la pantalla de bienvenida, toca **¿Ya tienes una cuenta? Inicia sesión**.\n' +
      '2. Escribe tu **Correo** y tu **Contraseña**, y luego toca **Iniciar sesión**.\n\n' +
      'Si te registraste con Apple o Google, toca **Continuar con Apple** o **Continuar con Google**, más abajo en la misma página.\n\n' +
      '¿Tocaste **Comenzar** por error? Todavía puedes entrar: los botones de Apple y Google en **Configura tu inicio de sesión** abren tu cuenta existente, y **Crea tu cuenta** tiene **Ya tengo una cuenta**.',
    keywords: ['iniciar sesión', 'entrar', 'login', 'cuenta existente'],
  },
  {
    id: 'getting-started.signin.wrong-password',
    title: 'Dice que mi correo y contraseña no coinciden',
    questions: [
      'Dice que mi correo y contraseña no coinciden',
      'ese correo y esa contraseña no coinciden',
      'error de contraseña incorrecta',
      'no puedo entrar y mi contraseña es correcta',
      'el inicio de sesión sigue fallando',
      'correo o contraseña incorrectos',
      '¿Por qué Skip no me deja iniciar sesión?',
      'mi login no funciona',
      'inicio de sesión inválido',
      'sé mi contraseña pero dice que no',
      'sale error de contraseña mal',
      'escribo bien mi contraseña y no entra',
      'skip no acepta mi contraseña',
    ],
    answer:
      '**Ese correo y esa contraseña no coinciden.** significa que Skip no encontró una cuenta con ese correo y esa contraseña exactos.\n\n' +
      '- Revisa que el correo no tenga errores y que sea el que usaste para registrarte.\n' +
      '- Las contraseñas distinguen mayúsculas. Revisa si hay una mayúscula que no querías o un espacio.\n' +
      '- Si te registraste con Apple o Google, no tienes una contraseña de Skip. Usa ese botón.\n' +
      '- ¿Sigues atorado? Toca **¿Olvidaste tu contraseña?** para crear una nueva.\n\n' +
      'Después de varios intentos seguidos, Skip puede pedirte que esperes un minuto.',
    keywords: ['contraseña incorrecta', 'no coinciden', 'no puedo entrar', 'login falla'],
  },
  {
    id: 'getting-started.signin.social-error',
    title: 'No funciona el inicio con Apple o Google',
    questions: [
      'No funciona iniciar sesión con Apple',
      'continuar con google no hace nada',
      'Primero inicia sesión con un ID de Apple en este dispositivo, ¿qué significa?',
      'iniciar sesión con apple no está disponible en este dispositivo',
      'error al entrar con apple',
      'falla el inicio con google',
      'no pasa nada después de elegir mi cuenta de google',
      'cerré la ventana de apple sin querer',
      'error después de face id al entrar con apple',
      'google algo salió mal al entrar',
      'apple sigue fallando para entrar',
      'toco continuar con apple y no hace nada',
      'el boton de google no sirve',
    ],
    answer:
      'Depende de lo que veas:\n\n' +
      '- **Primero inicia sesión con un ID de Apple en este dispositivo y luego inténtalo de nuevo.**: abre la app Ajustes del iPhone, inicia sesión con tu ID de Apple arriba y vuelve a intentarlo.\n' +
      '- **Iniciar sesión con Apple no está disponible en este dispositivo.**: usa **Continuar con Google** o **Continuar con correo**.\n' +
      '- **Algo salió mal. Inténtalo de nuevo.**: revisa tu conexión a internet e inténtalo una vez más.\n' +
      '- No pasa nada: si cerraste la ventana de Apple o de Google, Skip solo espera. Toca el botón otra vez.\n\n' +
      'Si sigue fallando, prueba la otra forma de iniciar sesión solo si eres nuevo. Si ya tienes una cuenta, sigue usando la forma con la que te registraste, para no terminar en una segunda cuenta.',
    keywords: ['error de apple', 'error de google', 'id de apple', 'no disponible'],
  },
  {
    id: 'getting-started.signin.stay',
    title: '¿Tengo que iniciar sesión cada vez?',
    questions: [
      '¿Tengo que iniciar sesión cada vez?',
      'skip mantiene mi sesión iniciada',
      'por que skip cerró mi sesión',
      'me quedo conectado al cerrar la app',
      '¿cuánto dura mi sesión?',
      '¿Puedo hacer que Skip pida Face ID al abrir?',
      'mantener sesión iniciada',
      'opción de recordarme',
      'skip me pidió iniciar sesión otra vez',
      'hay que iniciar sesión después de reiniciar el teléfono',
      'la app me sacó de mi cuenta',
      '¿tengo que escribir mi contraseña cada vez que abro skip?',
      '¿la app me recuerda cuando la vuelvo a abrir?',
    ],
    answer:
      'No. Una vez que inicias sesión, Skip te mantiene dentro en ese iPhone, incluso si cierras la app o reinicias el teléfono. Solo vuelves a iniciar sesión si tocas **Cerrar sesión**, borras y reinstalas Skip, o cambias de teléfono.\n\n' +
      'Si quieres que Skip se bloquee al abrirse, activa **Ajustes → Preferencias → Bloqueo de la app**. Pide Face ID, Touch ID o tu código antes de abrir Skip.',
    keywords: ['mantener sesión', 'recordarme', 'cerró sesión', 'face id'],
  },
  {
    id: 'getting-started.signin.empty-account',
    title: 'Inicié sesión y todo desapareció',
    questions: [
      'Inicié sesión y todo desapareció',
      'mis datos desaparecieron al iniciar sesión',
      'todo está vacío después de entrar',
      '¿Por qué Skip muestra Configuremos Skip si ya lo configuré?',
      'tengo dos cuentas por error',
      'entré y mis facturas no están',
      'adónde se fueron mis recibos después de iniciar sesión',
      'telefono nuevo y skip esta vacio',
      '¿Skip borró mis datos?',
      'entré con apple y es una cuenta en blanco',
      'mis registros viejos ya no están',
    ],
    answer:
      'No te preocupes. Casi siempre significa que estás en otra cuenta, nueva, y no que se borró algo. Pasa cuando entras de forma distinta a la última vez, como con Apple en lugar de correo, o con otra dirección de correo.\n\n' +
      'Para volver a tus cosas:\n' +
      '1. Ve a **Ajustes** y toca **Cerrar sesión** (en **Cuenta**).\n' +
      '2. Inicia sesión de la forma que usaste primero, con el mismo correo, ID de Apple o cuenta de Google.\n\n' +
      'Si usaste Apple con **Ocultar mi correo electrónico**, tu cuenta usa la dirección privada de Apple, así que inicia sesión con **Continuar con Apple**. Si solo faltan registros de hace más de 90 días, es el plan gratis que los oculta. Se conservan, y Skip Pro vuelve a mostrarlos.',
    keywords: ['datos perdidos', 'cuenta vacía', 'segunda cuenta', 'cuenta equivocada'],
  },
  {
    id: 'getting-started.signout.how',
    title: '¿Cómo cierro sesión?',
    questions: [
      '¿Cómo cierro sesión?',
      'salir de skip',
      'donde esta el boton de cerrar sesion',
      '¿Cerrar sesión borra mis datos?',
      'que pasa cuando cierro sesion',
      'salir de mi cuenta',
      'logout',
      '¿Pierdo algo si cierro sesión?',
      '¿Skip me pregunta antes de cerrar sesión?',
      'como desconectarme',
      'cerré sesión sin querer',
    ],
    answer:
      'Ve a **Ajustes**, baja hasta **Cuenta** y toca **Cerrar sesión**. Skip cierra tu sesión de inmediato, sin preguntar nada más, y vuelve a la pantalla de bienvenida.\n\nCerrar sesión no borra nada. Tus cosas se quedan en tu cuenta, listas para cuando vuelvas a entrar. También:\n- Cierra la sesión en cualquier otro teléfono donde uses Skip, así que tendrás que iniciar sesión allí también\n- Detiene los recordatorios de Skip en este teléfono hasta que vuelvas a iniciar sesión\n- Olvida algunas cosas que se guardan solo en este teléfono, como las tiendas que Skip recordó por ti, las correcciones de voz y las búsquedas recientes\n\nEliminar tu cuenta para siempre es **Eliminar cuenta**, justo debajo. Pregunta dos veces y no se puede deshacer.',
    keywords: ['cerrar sesión', 'salir', 'logout', 'desconectar'],
  },
  {
    id: 'getting-started.account.email-change',
    title: '¿Puedo cambiar mi correo?',
    questions: [
      '¿Puedo cambiar mi correo electrónico?',
      'actualizar el correo de mi cuenta',
      'como cambio el correo con el que entro',
      'tengo un correo nuevo, ¿cómo paso mi cuenta?',
      'cambiar correo en ajustes',
      'puse mal el correo en mi cuenta de skip',
      'pasar mi cuenta a otro correo',
      'editar mi correo',
      'mi correo viejo ya no existe',
      'mover mis datos a otro correo',
    ],
    answer:
      'No dentro de Skip. El correo con el que te registraste es la forma en que se encuentra tu cuenta, así que no hay ajuste para cambiarlo, y tampoco hay forma de pasar tus cosas a otra cuenta.\n\n' +
      'Si inicias sesión con Apple o Google, el correo viene de esa cuenta. Si cambiarlo es importante para ti, cuéntanoslo desde **Ajustes → Soporte y comentarios → Escribir a soporte**.',
    keywords: ['cambiar correo', 'actualizar correo', 'correo nuevo', 'editar correo'],
  },
  {
    id: 'getting-started.account.which-email',
    title: '¿Con qué correo tengo la sesión iniciada?',
    questions: [
      '¿Con qué correo tengo la sesión iniciada?',
      'donde veo el correo de mi cuenta',
      'cuál es el correo de mi cuenta de skip',
      'como veo en qué cuenta estoy',
      '¿Dónde muestra Skip mi correo?',
      'con que direccion me registre',
      'ver el correo con el que entro',
      'que id de apple usa skip',
      '¿mi correo aparece en algún lado?',
      'cómo sé qué cuenta es esta',
    ],
    answer:
      'Lo ves en **Ajustes → Soporte y comentarios → Escribir a soporte**. La casilla **Tu correo** muestra la dirección que usa tu cuenta. No tienes que enviar nada, solo toca el regreso.\n\n' +
      'Si termina en privaterelay.appleid.com, te registraste con Apple y elegiste **Ocultar mi correo electrónico**. Sigue usando **Continuar con Apple** para iniciar sesión.',
    keywords: ['mi correo', 'correo de la cuenta', 'qué cuenta', 'tu correo'],
  },
  {
    id: 'getting-started.account.switch',
    title: '¿Puedo cambiar entre dos cuentas?',
    questions: [
      '¿Puedo cambiar entre dos cuentas?',
      'dos cuentas de skip en un telefono',
      'como uso otra cuenta',
      'selector de cuentas',
      '¿Puedo unir dos cuentas de Skip?',
      'combinar mis cuentas',
      'cambiar a mi otra cuenta',
      'tener skip del trabajo y personal en un solo telefono',
      'cómo cambio de cuenta',
      'pasar mis datos de una cuenta a otra',
    ],
    answer:
      'Skip maneja una sola cuenta a la vez en un teléfono, y no hay selector de cuentas. Para usar otra cuenta:\n\n' +
      '1. Ve a **Ajustes** y toca **Cerrar sesión** (en **Cuenta**).\n' +
      '2. Inicia sesión con la otra cuenta.\n\n' +
      'Cada cuenta guarda sus propias cosas, y no se pierde nada al cerrar sesión. No hay forma de unir dos cuentas ni de pasar cosas entre ellas.',
    keywords: ['cambiar de cuenta', 'dos cuentas', 'unir cuentas', 'combinar'],
  },
  {
    id: 'getting-started.signin.terms',
    title: '¿Dónde están los Términos y la Política de privacidad?',
    questions: [
      '¿Dónde están los Términos del servicio?',
      'al continuar aceptas los términos, ¿dónde están?',
      'leer la política de privacidad antes de registrarme',
      'a qué estoy aceptando al iniciar sesión',
      'enlace de la política de privacidad en el inicio de sesión',
      'términos y condiciones de skip',
      'link al aviso de privacidad',
      '¿Dónde puedo leer sus términos?',
      'términos de uso de skip',
      'qué significa la línea de aceptar al iniciar sesión',
      'terminos y condiciones',
      '¿Dónde encuentro la política de privacidad en la app?',
      'donde esta el aviso de privacidad',
      'enséñame la política de privacidad',
    ],
    answer:
      'En la página **Iniciar sesión**, la línea **Al continuar, aceptas los Términos del servicio y el Aviso de privacidad** tiene ambos como enlaces. Toca cualquiera para leerlo.\n\n' +
      'Cuando ya iniciaste sesión, están en **Ajustes → Acerca de**: **Política de privacidad** (qué se guarda y quién más puede verlo) y **Términos del servicio**.\n\n' +
      'En resumen: Skip solo guarda lo que tú agregas, nunca el acceso a tu banco, no vende tus datos, y puedes borrar todo desde **Ajustes**.',
    keywords: [
      'términos',
      'política de privacidad',
      'aviso de privacidad',
      'términos y condiciones',
    ],
  },

  // Name and picture

  {
    id: 'getting-started.hello.name',
    title: '¿Por qué Skip me pide mi nombre?',
    questions: [
      '¿Por qué Skip me pide mi nombre?',
      'página cómo quieres que te llamemos',
      '¿Tengo que dar mi nombre real?',
      'puedo omitir el nombre',
      'para qué se usa el nombre',
      'skip me pregunta mi nombre cada vez que entro',
      'por qué apple no le dio mi nombre a skip',
      'Omitir por ahora en la página del nombre',
      '¿Puedo usar un apodo?',
      'qué pasa si no pongo nombre',
      'paso del nombre después de registrarme',
      'qué es el lápiz en el círculo grande al registrarme',
      'elegir una foto al registrarme',
    ],
    answer:
      'Justo después de crear tu cuenta, Skip pregunta **¿Cómo quieres que te llamemos?** El nombre que escribas en **Tu nombre** aparece arriba en **Inicio**. Sirve cualquier nombre o apodo.\n\n' +
      '- Toca **Continuar** para guardarlo. Verás **Nombre guardado**.\n' +
      '- Toca **Omitir por ahora** para dejarlo. **Inicio** dirá **Te damos la bienvenida** en su lugar.\n' +
      '- Toca la imagen redonda con el lápiz para abrir **Foto de perfil**. Toca una de las 15 imágenes y se guarda al instante.\n\n' +
      'Apple y Google no le pasan tu nombre a Skip, así que lo pregunta de todos modos. Si lo omites después de iniciar sesión con Apple o Google, vuelve a preguntar la próxima vez que inicies sesión. Puedes cambiar ambas cosas después en **Ajustes**, en **Perfil**.',
    keywords: ['nombre', 'apodo', 'omitir por ahora', 'cómo te llamemos'],
  },

  // The setup checklist

  {
    id: 'getting-started.setup.what',
    title: '¿Qué es Configuremos Skip?',
    questions: [
      '¿Qué es Configuremos Skip?',
      'qué es la lista de configuración',
      'cuáles son los cinco pasos después de registrarme',
      '¿Por qué un paso tiene borde morado?',
      'qué significa el borde ciruela en un paso',
      'qué significan los números del 1 al 5',
      'qué hace Todo listo: abrir Skip',
      'como funciona la configuración',
      'la lista que sale después de crear mi cuenta',
      'pasos tachados en la configuración',
      'qué hace continuar en la lista',
    ],
    answer:
      '**Configuremos Skip** es una lista corta que ves después de crear tu cuenta. Cada paso abre la página real para hacerlo, y al guardar vuelves aquí:\n\n' +
      '1. **Configura tu salario**\n' +
      '2. **Agrega tu tarjeta de crédito y tu cuenta bancaria**\n' +
      '3. **Agrega tus facturas**\n' +
      '4. **Agrega tus suscripciones**\n' +
      '5. **Agrega un recibo** (Opcional)\n\n' +
      'El paso que toca hacer a continuación tiene un borde ciruela. Los pasos hechos llevan una marca ciruela y aparecen tachados. Toca **Continuar** para abrir el siguiente paso, o toca tú el paso que quieras. Cuando los cinco estén hechos, toca **Todo listo: abrir Skip**.',
    keywords: ['configuración', 'lista de pasos', 'configuremos skip', 'todo listo'],
  },
  {
    id: 'getting-started.setup.later',
    title: '¿Puedo omitir la configuración y hacerla después?',
    questions: [
      '¿Puedo omitir la configuración y hacerla después?',
      'botón de configurar después',
      'solo quiero explorar primero',
      '¿Tengo que terminar la configuración?',
      'saltar la configuración',
      'qué hace omitir el recibo abrir skip',
      'salir de la configuración',
      'no tengo tiempo para configurar todo ahorita',
      '¿Puedo volver a la configuración después?',
      'como llego a inicio sin configurar',
      '¿puedo saltarme los pasos e ir a inicio?',
      'no tengo tiempo para todos estos pasos, llévame a inicio',
      'cómo salgo de configuremos skip y uso la app',
      'aún no quiero agregar todo, ¿puedo entrar sin más?',
    ],
    answer:
      'Sí. Toca **Configurar después**, abajo en **Configuremos Skip**, y vas directo a **Inicio**. Lo que ya agregaste se queda.\n\n' +
      'Los mismos pasos te esperan en **Inicio**, en la tarjeta **Primeros pasos**, que marca cada uno según agregas cosas. También puedes agregar lo que quieras en cualquier momento con **Agregar rápido** en **Inicio**, o desde la pestaña **Tarjetas**.\n\n' +
      'Cuando los primeros cuatro pasos están hechos, el enlace de abajo cambia a **Omitir el recibo: abrir Skip**, porque el recibo es opcional.',
    keywords: ['configurar después', 'omitir configuración', 'más tarde', 'omitir el recibo'],
  },
  {
    id: 'getting-started.setup.pay',
    title: '¿Qué es el paso Configura tu salario?',
    questions: [
      '¿Qué es el paso Configura tu salario?',
      'por qué el salario es el primer paso',
      'cómo agrego mi sueldo en la configuración',
      'configura tu salario',
      '¿Tengo que agregar mi sueldo?',
      'me pagan por hora, ¿qué pongo en configura tu salario?',
      'y si tengo dos trabajos en la configuración',
      'no tengo sueldo, ¿puedo saltarme el paso 1?',
      'paso 1 de la configuración',
      'a donde va mi salario despues de la configuracion',
      'que pongo si cobro cada semana',
    ],
    answer:
      '**Configura tu salario** es el primer paso porque tu **Saldo actual**, los ahorros y **Análisis** cuentan lo que entra.\n\n' +
      'Al tocarlo se abre **Salario**, donde agregas tu pago: fijo o por hora, cuánto y cada cuánto. Puedes agregar todos los salarios que quieras, en cualquier plan. Guarda y vuelves a la lista con el paso marcado.\n\n' +
      '¿Sin pago regular? Puedes dejar este paso y hacer los demás. Después, tu salario vive en **Tarjetas → Salario**, o en **Agregar rápido → Salario** en **Inicio**.',
    keywords: ['configura tu salario', 'salario', 'sueldo', 'paso 1'],
  },
  {
    id: 'getting-started.setup.wallet',
    title: '¿Qué es el paso de tarjeta y cuenta bancaria?',
    questions: [
      '¿Qué es el paso de tarjeta y cuenta bancaria?',
      'paso agrega tu tarjeta de crédito y tu cuenta bancaria',
      'paso 2 de la configuración',
      'por qué la configuración pide primero una tarjeta de crédito',
      'tengo que agregar tarjeta y cuenta las dos',
      '¿Es seguro poner mi tarjeta en la configuración?',
      'que escribo de mi tarjeta en la configuracion',
      'cuántas tarjetas puedo agregar en la configuración',
      'formulario de tarjeta en la configuración',
      '¿Puedo agregar mi tarjeta de débito?',
      'qué datos pide el formulario de la tarjeta de crédito',
      'qué es el día de vencimiento en el formulario de la tarjeta',
      'qué pide el paso de la cuenta bancaria',
      'paso 2: qué va en las casillas de tarjeta y banco',
    ],
    answer:
      'El paso 2, **Agrega tu tarjeta de crédito y tu cuenta bancaria**, agrega los lugares de donde sale tu dinero.\n\n' +
      '1. Toca el paso. Primero se abre el formulario de la tarjeta de crédito: un nombre para la tarjeta, su saldo ahora y el día en que vence su pago.\n' +
      '2. Guarda la tarjeta. Verás **Agrega tu cuenta bancaria**.\n' +
      '3. Toca **Agregar cuenta bancaria** para agregar una ahora, u **Omitir** para dejarlo.\n\n' +
      'El paso queda marcado de cualquier forma, porque basta con una tarjeta o una cuenta. Skip nunca pide un número de tarjeta completo. El plan gratis tiene lugar para 1 tarjeta de crédito y 1 cuenta bancaria.',
    keywords: ['tarjeta de crédito', 'cuenta bancaria', 'paso 2', 'formulario de tarjeta'],
  },
  {
    id: 'getting-started.setup.no-card',
    title: 'No tengo tarjeta de crédito',
    questions: [
      'No tengo tarjeta de crédito',
      'puedo omitir el paso de la tarjeta',
      'solo quiero agregar mi cuenta bancaria',
      '¿Necesito una tarjeta de crédito para usar Skip?',
      'yo solo uso efectivo',
      'sin tarjeta de crédito, ¿qué hago en la configuración?',
      'agregar cuenta bancaria sin tarjeta',
      'solo tengo tarjeta de débito',
      'paso 2 sin tarjeta de crédito',
      '¿Puedo usar Skip sin ninguna tarjeta?',
      '¿puedo terminar la configuración solo con una cuenta bancaria?',
      'uso cuenta de débito, no tarjeta de crédito, ¿qué hago?',
      'la configuración insiste en una tarjeta de crédito y no tengo',
      'sin tarjeta de crédito, ¿cómo paso del paso 2?',
    ],
    answer:
      'No hay problema. No hace falta una tarjeta de crédito. El paso 2 se marca con una tarjeta de crédito o con una cuenta bancaria.\n\nEl paso de configuración abre primero el formulario de la tarjeta de crédito, así que para agregar solo una cuenta bancaria:\n1. Toca **Configurar después**, o regresa desde el formulario de la tarjeta y luego toca **Configurar después**.\n2. Abre la pestaña **Tarjetas** y toca **+ Agregar** junto a **Cuentas bancarias**.\n3. Llénalo y toca **Agregar cuenta**. El paso queda marcado en la tarjeta **Primeros pasos** de **Inicio**.\n\nTambién puedes no agregar ninguna. Cuando una factura pregunta **Se paga con**, puedes elegir **Omitir**.',
    keywords: ['sin tarjeta', 'efectivo', 'débito', 'solo banco'],
  },
  {
    id: 'getting-started.setup.account-offer',
    title: '¿Qué es la página Agrega tu cuenta bancaria?',
    questions: [
      '¿Qué es la página Agrega tu cuenta bancaria?',
      'la página después de guardar mi tarjeta en la configuración',
      'agregar cuenta bancaria u omitir',
      '¿Debo agregar mi cuenta bancaria ahora?',
      'qué pasa si toco omitir en agrega tu cuenta bancaria',
      'omití la cuenta bancaria, ¿puedo agregarla después?',
      '¿Por qué Skip me pidió mi cuenta bancaria después de la tarjeta?',
      'agregar cuenta bancaria, ¿se conecta a mi banco?',
      'el paso 2 está marcado pero no agregué cuenta bancaria',
      'pantalla agrega tu cuenta bancaria',
      'después de agregar una tarjeta me pide una cuenta',
      '¿Necesito una cuenta bancaria?',
      'puedo omitir la cuenta bancaria',
    ],
    answer:
      'Sale durante la configuración justo después de guardar tu primera tarjeta de crédito, porque casi siempre el salario llega a una cuenta bancaria.\n\n- **Agregar cuenta bancaria** abre el formulario de la cuenta bancaria. Llénalo y toca **Agregar cuenta**, y regresas a la lista.\n- **Omitir** te lleva directo de vuelta a la lista.\n\nEl paso queda marcado de cualquier forma. Agregar una cuenta no te conecta con tu banco; tú escribes su nombre y su saldo. Tampoco es obligatoria: sin una, tu salario igual cuenta en tu **Saldo actual**. Puedes agregar una cuando quieras desde **Tarjetas**: toca **+ Agregar** junto a **Cuentas bancarias**.',
    keywords: ['agrega tu cuenta bancaria', 'agregar cuenta bancaria', 'omitir', 'configuración'],
  },
  {
    id: 'getting-started.setup.bills',
    title: '¿Cómo funciona el paso Agrega tus facturas?',
    questions: [
      '¿Cómo funciona el paso Agrega tus facturas?',
      'agregar mis facturas en la configuración',
      'paso 3 de la configuración',
      '¿Puedo agregar más de una factura en la configuración?',
      'seguir agregando facturas en la configuración',
      'qué facturas debo agregar',
      'cómo corrijo una factura que agregué en la configuración',
      'agregué una factura, ¿cómo vuelvo a la lista de pasos?',
      'renta, teléfono e internet en la configuración',
      'la página de facturas está vacía en la configuración',
      'botón agregar otra factura',
      'omitir por ahora en las facturas',
      '¿puedo agregar las facturas después?',
      'a dónde me lleva Listo en agrega tus facturas',
    ],
    answer:
      '**Agrega tus facturas** es donde agregas cada factura que se repite: la renta, el teléfono, el internet y demás, una por una.\n\n1. Toca **Agregar una factura**, llénala y guarda.\n2. Vuelves a la lista, que muestra cada factura que agregaste.\n3. Toca **Agregar otra factura** para la siguiente, o **Listo** para volver a la lista de pasos.\n\nCon una factura basta para marcar el paso y llenar **Próximos** en **Inicio**. Toca una factura de la lista para cambiarla. ¿Aún no es el momento? Toca **Omitir por ahora** y agrega facturas cuando quieras con **Agregar rápido → Factura**.',
    keywords: ['agrega tus facturas', 'facturas', 'paso 3', 'agregar otra factura'],
  },
  {
    id: 'getting-started.setup.subscriptions',
    title: '¿Cómo funciona el paso de suscripciones?',
    questions: [
      '¿Cómo funciona el paso Agrega tus suscripciones?',
      'agregar mis suscripciones en la configuración',
      'paso 4 de la configuración',
      'agregar netflix durante la configuración',
      'agregar otra suscripción',
      'qué cuenta como suscripción en la configuración',
      '¿el gimnasio es factura o suscripción?',
      'cómo cambio una suscripción que agregué en la configuración',
      'página de suscripciones en la configuración',
      'tengo muchas suscripciones, ¿las agrego todas ahora?',
      'spotify y disney en el paso de suscripciones',
    ],
    answer:
      '**Agrega tus suscripciones** es para todo lo que se renueva solo: Netflix, Spotify, el gimnasio y demás, una por una.\n\n' +
      '1. Toca **Agregar una suscripción**, llénala y guarda.\n' +
      '2. Vuelves a la lista de lo que agregaste.\n' +
      '3. Toca **Agregar otra suscripción**, o **Listo** para volver a la lista de pasos.\n\n' +
      'Con una basta para marcar el paso. Puedes agregar el resto cuando quieras con **Agregar rápido → Suscripción** en **Inicio**. Toca una de la lista para cambiarla, o toca **Omitir por ahora** para dejar el paso.',
    keywords: ['agrega tus suscripciones', 'suscripciones', 'paso 4', 'netflix'],
  },
  {
    id: 'getting-started.setup.receipt',
    title: '¿Tengo que agregar un recibo en la configuración?',
    questions: [
      '¿Tengo que agregar un recibo?',
      'agrega un recibo es opcional',
      'paso 5 de la configuración',
      'no tengo ningún recibo para agregar',
      '¿Por qué el paso del recibo es opcional?',
      'el recibo de la configuración cuenta para mis escaneos gratis',
      'Primeros pasos dice 4 de 5 por el recibo',
      '¿Qué recibo agrego primero?',
      '¿Puedo escribir el recibo en vez de escanearlo?',
      'omitir el paso del recibo',
      'es obligatorio el último paso de la configuración',
      '¿puedo terminar primeros pasos sin un recibo?',
      'hay que agregar un recibo para terminar primeros pasos',
    ],
    answer:
      'No. **Agrega un recibo** es el único paso marcado como **Opcional**, y Skip funciona bien sin él.\n\n' +
      'Cuando los pasos 1 al 4 están hechos, la lista ofrece **Agregar un recibo** (escanearlo, subirlo o escribirlo) y **Omitir el recibo: abrir Skip**.\n\n' +
      'Dos cosas que conviene saber:\n' +
      '- En el plan gratis, un escaneo o una carga cuenta dentro de los 15 escaneos y 15 cargas que tienes al mes. Escribir un recibo no cuenta.\n' +
      '- La tarjeta **Primeros pasos** en **Inicio** muestra **4 de 5 listos** hasta que agregues un recibo u ocultes la tarjeta.',
    keywords: ['recibo', 'opcional', 'paso 5', 'omitir el recibo'],
  },
  {
    id: 'getting-started.setup.ticks',
    title: '¿Por qué un paso está marcado o no?',
    questions: [
      '¿Por qué un paso está marcado o no?',
      'agregué una factura pero el paso no se marca',
      'cómo marco un paso',
      '¿Puedo desmarcar un paso?',
      '¿Por qué no puedo tocar un paso terminado?',
      'el paso se marcó solo',
      'mi préstamo no marca agrega tus facturas',
      'el paso de la configuración no se actualiza',
      '¿Cómo sabe Skip que un paso está hecho?',
      'se quitó la marca',
      'borré mi factura y el paso volvió',
    ],
    answer:
      'Skip marca cada paso por sí solo, según lo que hay en tu cuenta. No puedes marcar ni desmarcar un paso a mano:\n\n' +
      '- **Configura tu salario**: al menos un salario\n' +
      '- **Agrega tu tarjeta de crédito y tu cuenta bancaria**: al menos una tarjeta o una cuenta bancaria\n' +
      '- **Agrega tus facturas**: al menos una factura en tus facturas mensuales\n' +
      '- **Agrega tus suscripciones**: al menos una suscripción\n' +
      '- **Agrega un recibo**: al menos un recibo\n\n' +
      'Así que una factura agregada desde **Agregar rápido** también marca el paso de facturas. Un préstamo que dejaste fuera de las facturas mensuales no cuenta como factura. Si borras lo único que sostiene un paso, su marca desaparece. Los pasos hechos no se pueden tocar; haz los cambios desde sus propias páginas.',
    keywords: ['marca', 'palomita', 'hecho', 'paso sin marcar'],
  },
  {
    id: 'getting-started.setup.again',
    title: '¿Por qué volvió a salir la lista de configuración?',
    questions: [
      '¿Por qué volvió a salir la lista de configuración?',
      'la configuración sale cada vez que inicio sesión',
      'por qué veo configuremos skip después de iniciar sesión',
      '¿Por qué Skip se saltó la lista de configuración?',
      'nunca vi los pasos de configuración',
      'al iniciar sesión me llevó directo a inicio',
      'la configuración sigue volviendo',
      'cómo evito que salga la configuración',
      'por qué no me apareció la configuración',
      'inicié sesión y me salió la lista de pasos',
      'volví a entrar y salió configuremos skip, como si mi cuenta estuviera vacía',
      'por qué skip me trata como usuario nuevo al entrar',
      'cada vez que inicio sesión me pide configurar skip',
      'entré de nuevo y la cuenta parece nueva, pidiendo configuración',
    ],
    answer:
      '**Configuremos Skip** sale después de iniciar sesión solo cuando tu cuenta está vacía y no has ocultado la tarjeta **Primeros pasos**. Vacía significa que todavía no hay salario, tarjetas, cuentas, facturas, suscripciones ni recibos. En cuanto hay algo en tu cuenta, iniciar sesión te lleva directo a **Inicio**.\n\nAsí que si la ves pero esperabas tus cosas, probablemente estás en otra cuenta. Cierra sesión e inicia sesión de la forma que usabas antes.\n\nSi es tu primera vez, toca **Continuar** para empezar, o **Configurar después**. Ocultar la tarjeta **Primeros pasos** en **Inicio** también evita que la lista aparezca al iniciar sesión.',
    keywords: ['configuración otra vez', 'lista otra vez', 'directo a inicio', 'configurar todo'],
  },

  // The Getting started card on Home

  {
    id: 'getting-started.card.what',
    title: '¿Qué es la tarjeta Primeros pasos?',
    questions: [
      '¿Qué es la tarjeta Primeros pasos?',
      'qué es la lista que sale en inicio',
      'qué significa 2 de 5 listos',
      'qué es la barra morada de primeros pasos',
      'primeros pasos en la pantalla de inicio',
      'la tarjeta de debajo de agregar rápido con pasos',
      '¿Cómo termino primeros pasos?',
      'tocar un paso en primeros pasos',
      'cuando desaparece primeros pasos',
      'barra de progreso en inicio',
    ],
    answer:
      '**Primeros pasos** es la tarjeta en **Inicio**, justo debajo de **Agregar rápido**. Muestra los mismos cinco pasos de configuración de la lista, para que termines de configurar cuando quieras.\n\n' +
      '- **2 de 5 listos**, por ejemplo, y la barra ciruela muestran cuánto llevas.\n' +
      '- Toca cualquier paso sin marca para abrirlo.\n' +
      '- Los pasos se marcan solos a medida que agregas cosas, desde cualquier parte de la app.\n\n' +
      'La tarjeta desaparece sola cuando los cinco pasos están hechos, o cuando tocas la **X** para ocultarla.',
    keywords: ['primeros pasos', 'lista', 'progreso', 'de 5 listos'],
  },
  {
    id: 'getting-started.card.hide',
    title: '¿Cómo oculto la tarjeta Primeros pasos?',
    questions: [
      '¿Cómo oculto la tarjeta Primeros pasos?',
      'quitar primeros pasos de inicio',
      'cerrar la tarjeta de configuración',
      'qué hace la x en primeros pasos',
      'descartar primeros pasos',
      'no quiero la lista en inicio',
      '¿Ocultar Primeros pasos deshace mi configuración?',
      'deshacerme del recuadro de primeros pasos',
      'desactivar primeros pasos',
      '¿Primeros pasos también se oculta en mi otro teléfono?',
      'quitar la tarjeta de configuración de mi pantalla de inicio',
      'la tarjeta de la lista en mi página de inicio, ¿puedo cerrarla?',
    ],
    answer:
      'Toca la **X** arriba a la derecha de la tarjeta **Primeros pasos** en **Inicio**. Se oculta de inmediato, y sigue oculta en todos los teléfonos donde inicies sesión.\n\n' +
      'Ocultarla no deshace nada de lo que configuraste. También significa que la lista de configuración no volverá a aparecer cuando inicies sesión.\n\n' +
      '¿Cambiaste de idea? Recupérala desde **Ajustes → Soporte y comentarios → Primeros pasos**.',
    keywords: ['ocultar', 'descartar', 'cerrar', 'quitar primeros pasos'],
  },
  {
    id: 'getting-started.card.back',
    title: '¿Cómo recupero la tarjeta Primeros pasos?',
    questions: [
      '¿Cómo recupero la tarjeta Primeros pasos?',
      'volver a mostrar primeros pasos',
      'oculté la lista por error',
      'mostrar otra vez los pasos de configuración',
      'a dónde se fue primeros pasos',
      'restaurar la tarjeta primeros pasos',
      'salió el mensaje la guía de inicio volvió, ¿qué pasó?',
      'toqué primeros pasos en ajustes y no sale nada',
      'deshacer ocultar primeros pasos',
      'no aparece la tarjeta primeros pasos en inicio',
      '¿Qué hace Primeros pasos en Soporte?',
      'poner otra vez los pasos de configuración en inicio',
      'la fila primeros pasos en soporte y comentarios',
    ],
    answer:
      '1. Ve a **Ajustes → Soporte y comentarios**.\n2. Toca **Primeros pasos** (Vuelve a mostrar los pasos de configuración en Inicio).\n\nSkip te lleva a **Inicio** y muestra **La guía de inicio volvió**. La tarjeta muestra otra vez los cinco pasos, con los que ya hiciste marcados.\n\nSi los cinco pasos ya están hechos, no hay nada que mostrar, así que la tarjeta no aparece.',
    keywords: [
      'recuperar primeros pasos',
      'restaurar',
      'mostrar otra vez',
      'soporte y comentarios',
    ],
  },
  {
    id: 'getting-started.card.reappeared',
    title: '¿Por qué volvió Primeros pasos?',
    questions: [
      '¿Por qué volvió Primeros pasos?',
      'la tarjeta de configuración salió otra vez en inicio',
      'primeros pasos reapareció',
      'terminé la configuración pero la tarjeta volvió',
      'por qué primeros pasos está otra vez en inicio',
      'la lista volvió sola',
      'primeros pasos volvió después de borrar una factura',
      'la tarjeta dice 4 de 5 otra vez',
      'primeros pasos sigue regresando',
      'por qué hay un paso abierto de nuevo',
    ],
    answer:
      'La tarjeta vuelve sola cuando un paso que tenía marcado ya no está hecho. Por ejemplo, si borras tu única factura, **Agrega tus facturas** deja de estar hecho, así que la tarjeta aparece otra vez con ese paso abierto.\n\n' +
      'Agrega otra vez lo que falta, o toca la **X** de la tarjeta para ocultarla. Una vez oculta, no vuelve hasta que la recuperes desde **Ajustes → Soporte y comentarios → Primeros pasos**.',
    keywords: ['volvió', 'reapareció', 'otra vez', 'primeros pasos'],
  },

  // Getting around

  {
    id: 'getting-started.start.first',
    title: '¿Qué debo hacer primero?',
    questions: [
      '¿Qué debo hacer primero?',
      'por dónde empiezo',
      'como configuro skip',
      'la mejor forma de empezar con skip',
      'en qué orden agrego las cosas',
      '¿Cuánto tarda la configuración?',
      'me abruma, ¿qué es lo primero que agrego?',
      'primeros pasos para empezar a usar skip',
      'qué necesito para arrancar',
      'qué agrego después de registrarme',
      'acabo de descargar la app, ¿por dónde empiezo?',
      'acabo de bajar skip, ¿qué hago ahora?',
      'recién instalé la app, ¿cuál es el paso uno?',
      'tengo una cuenta nueva, ¿qué configuro primero?',
    ],
    answer:
      'Agrega primero tu salario, porque la mayoría de las cifras de Skip parten de lo que entra. Luego sigue **Configuremos Skip** después de registrarte, o la tarjeta **Primeros pasos** en **Inicio**:\n\n' +
      '1. **Configura tu salario**\n' +
      '2. **Agrega tu tarjeta de crédito y tu cuenta bancaria**\n' +
      '3. **Agrega tus facturas**\n' +
      '4. **Agrega tus suscripciones**\n' +
      '5. **Agrega un recibo** (opcional)\n\n' +
      'Toma unos minutos, y puedes parar cuando quieras. Después, el hábito de todos los días es rápido: agrega lo que gastas con **Agregar rápido** en **Inicio**.',
    keywords: ['primero', 'empezar', 'comenzar', 'orden'],
  },
  {
    id: 'getting-started.nav.tabs',
    title: '¿Qué son las pestañas de abajo?',
    questions: [
      '¿Qué son las pestañas de abajo?',
      'qué significan los íconos de abajo',
      'como me muevo por la app',
      'qué es el ícono de la casa',
      'para qué sirve el ícono de la cartera',
      'qué es el ícono del rayo',
      'por qué una pestaña muestra nombre y las otras no',
      'barra de navegación explicada',
      'tocar la pestaña en la que estoy no hace nada',
      'menú de la parte de abajo de la pantalla',
      '¿dónde está el menú?',
      'que iconos hay abajo',
    ],
    answer:
      'La barra de abajo te lleva por Skip. La pestaña en la que estás aparece como una píldora ciruela con su nombre; las demás muestran solo un ícono.\n\n' +
      '- **Inicio** (casa): tu **Saldo actual**, **Agregar rápido**, a dónde se fue tu dinero este mes y día por día\n' +
      '- **Tarjetas** (cartera): tarjetas de crédito, cuentas bancarias, y **Salario**, **Ahorros**, **Préstamos** y **Metas**\n' +
      '- **Actividad** (recibo): todo lo que registraste, en una sola lista\n' +
      '- **Ajustes** (rayo): Skip Pro, tu perfil, preferencias, ayuda y cerrar sesión\n\n' +
      'El botón redondo del extremo derecho es para agregar por voz. Tocar la pestaña en la que ya estás no hace nada.',
    keywords: ['pestañas', 'barra de pestañas', 'menú', 'íconos'],
  },
  {
    id: 'getting-started.nav.voice',
    title: '¿Qué es el botón redondo de la barra?',
    questions: [
      '¿Qué es el botón redondo de la barra de pestañas?',
      'qué es el círculo morado de abajo a la derecha',
      'por qué el botón redondo dice pro',
      'qué hace el botón de la onda de sonido',
      'botón de voz',
      'el botón grande junto a las pestañas',
      'el botón redondo no hace nada cuando lo toco',
      'botón para agregar por voz',
      '¿puedo ocultar el botón de voz?',
      'qué es la insignia pro del botón',
      'al tocar el círculo sale una página de pro',
    ],
    answer:
      'Es el botón de Voz, en el extremo derecho de la barra de pestañas, en todas las pestañas. Con Skip Pro, tócalo y di algo como Netflix $15.99 cada mes para agregar un recibo, una factura o una suscripción. Revisas lo que Skip escuchó antes de que se guarde algo.\n\n' +
      'En el plan gratis tiene una pequeña insignia **Pro**. Al tocarlo se muestra lo que hace la entrada por voz, con una forma de conseguir Skip Pro, o **Ahora no** para regresar.\n\n' +
      'Justo después de que Skip se abre, el botón espera un momento hasta saber cuál es tu plan, así que un toque muy temprano puede no hacer nada. Solo vuelve a tocar. No hay ajuste para ocultarlo.',
    keywords: ['voz', 'botón de voz', 'botón redondo', 'insignia pro'],
  },
  {
    id: 'getting-started.nav.back',
    title: '¿Cómo regreso a la página anterior?',
    questions: [
      '¿Cómo regreso a la página anterior?',
      'no hay botón de regresar',
      'deslizar para volver no funciona',
      'como cierro una pagina',
      'cómo salgo de esta pantalla',
      'flecha de regreso',
      'por qué no puedo deslizar para volver mientras agrego algo',
      'volver un paso',
      'cómo vuelvo a la pantalla anterior',
      'estoy atorado en una página, ¿cómo salgo?',
    ],
    answer:
      'Toca la flecha de regreso arriba a la izquierda, o desliza hacia la derecha desde el borde izquierdo de la pantalla. En las cuatro pestañas principales no hay a dónde regresar; toca otra pestaña de la barra.\n\n' +
      'Mientras agregas algo con varios pasos, el deslizamiento está desactivado para que no pierdas tu trabajo por accidente. Usa la flecha para volver un paso. Si sales a la mitad, Skip pregunta antes de tirar lo que escribiste.',
    keywords: ['regresar', 'volver', 'deslizar', 'flecha'],
  },
  {
    id: 'getting-started.nav.find',
    title: '¿Dónde encuentro cada cosa en Skip?',
    questions: [
      '¿Dónde encuentro cada cosa en Skip?',
      'qué pestaña tiene mis facturas',
      'dónde está mi salario',
      'dónde encuentro los préstamos',
      'dónde están los ahorros',
      'dónde está la campana',
      'dónde están los ajustes de recordatorios',
      'mapa de la app',
      'no encuentro nada en esta app',
      'donde esta todo',
      'donde veo los recibos',
      'dónde está la sección de ayuda',
    ],
    answer:
      'Aquí está dónde vive cada cosa:\n\n' +
      '- **Salario**: **Tarjetas → Salario**, o **Agregar rápido → Salario** en **Inicio**\n' +
      '- Tarjetas de crédito y cuentas bancarias: la pestaña **Tarjetas**\n' +
      '- **Facturas mensuales**, **Suscripciones** y **Recibos**: **Inicio**, bajo **A dónde se fue tu dinero**\n' +
      '- **Préstamos**: **Inicio → Ve más allá**, o **Tarjetas → Préstamos**\n' +
      '- **Hábitos de gasto**: **Inicio → Ve más allá**\n' +
      '- **Ahorros** y **Metas**: la pestaña **Tarjetas**\n' +
      '- **Análisis**: **Inicio**, debajo de **Ve más allá**\n' +
      '- Todo lo que registraste: la pestaña **Actividad**\n' +
      '- **Notificaciones**: la campana arriba a la derecha de **Inicio**\n' +
      '- **Recordatorios**: **Ajustes → Preferencias**\n' +
      '- Ayuda: **Ajustes → Soporte y comentarios**',
    keywords: ['dónde', 'encontrar', 'mapa', 'menú'],
  },
  {
    id: 'getting-started.help.tour',
    title: '¿Hay un tour o tutorial?',
    questions: [
      '¿Hay un tour o tutorial?',
      '¿Cómo aprendo a usar Skip?',
      'hay una guia',
      'recorrido por la app',
      'enséñame cómo funciona skip',
      'dónde está la página de ayuda',
      '¿Hay videos de cómo usar Skip?',
      '¿hay preguntas frecuentes?',
      '¿Puedo repetir el tutorial?',
      'guía de inicio otra vez',
    ],
    answer:
      'No hay un tour aparte. Skip te va mostrando todo sobre la marcha:\n\n' +
      '- Las páginas de bienvenida explican qué es Skip antes de que te registres.\n' +
      '- **Configuremos Skip** y la tarjeta **Primeros pasos** en **Inicio** te guían por los cinco pasos de configuración.\n' +
      '- **Preguntas frecuentes** es una página de respuestas cortas. Ábrela con el enlace de abajo.\n\n' +
      'Y puedes preguntarme lo que quieras, cuando quieras: estoy en **Ajustes → Soporte y comentarios** y al final de **Ajustes**.',
    keywords: ['tour', 'tutorial', 'guía', 'preguntas frecuentes'],
  },
  {
    id: 'getting-started.platform.ios-version',
    title: '¿Qué iPhone e iOS necesito?',
    questions: [
      'skip funciona en ios 16',
      '¿Qué iPhone necesito?',
      'versión mínima de ios',
      '¿Skip va a funcionar en mi iPhone viejo?',
      'puedo usar skip en un iphone 8',
      'no se instala la app, ios muy viejo',
      'requiere una versión más nueva de ios',
      '¿funciona en iphone se?',
      'qué ios necesito para skip',
      'skip no es compatible con mi iphone',
    ],
    answer:
      'Skip necesita iOS 16.4 o posterior. Eso incluye el iPhone 8, el iPhone SE (2.ª generación) y todos los iPhone más nuevos.\n\nSi el App Store dice que Skip necesita un iOS más nuevo, actualiza tu iPhone en **Ajustes → General → Actualización de software** y vuelve a intentarlo.\n\nAlgunas funciones también necesitan algo del teléfono: escanear necesita la cámara, el **Bloqueo de la app** necesita Face ID o Touch ID configurados, y **Voz** necesita el Dictado activado.',
    keywords: ['versión de ios', 'ios 16', 'iphone viejo', 'compatible'],
  },
  {
    id: 'getting-started.nav.icons',
    title: '¿Qué hacen el lápiz, la papelera y el +?',
    questions: [
      'qué hace el ícono del lápiz',
      'qué significa el ícono de la papelera',
      'para qué es el bote de basura',
      'botón de lápiz arriba a la derecha',
      'significado de los íconos en skip',
      'qué hace el signo más',
      'cómo edito algo en skip',
      'dónde está el botón de editar',
      'cómo borro cosas en skip',
      'qué hace el lápiz chiquito en un logo',
      'pa q sirve el lapiz',
    ],
    answer:
      'Funcionan igual en todo Skip:\n\n- **Lápiz**: edita. Está arriba en la página de un recibo, factura, suscripción, tarjeta o cuenta, y en las metas, los meses de ahorro y las tarjetas de hábitos. Un lápiz pequeño sobre un logo cambia el logo.\n- **Papelera**: elimina. En **Salario** quita una fuente de pago (toca **Guardar** para terminar), y en la página de **Recordatorios** borra un recordatorio.\n- **+**: agrega, como **+ Agregar** en **Tarjetas** o el **+** en **Facturas mensuales**.\n\nPara eliminar la mayoría de las cosas, ábrelas, toca el lápiz y busca **Eliminar** abajo. Skip pregunta antes de eliminar un recibo, factura, suscripción, préstamo, tarjeta, cuenta, meta o hábito.',
    keywords: ['lápiz', 'papelera', 'basura', 'más'],
  },
];

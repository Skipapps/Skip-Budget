import { defineMessages } from '@/i18n/translate';

/**
 * The loan screens, plus the amount-entry pads, keypad and figure every money field shares. Only
 * the words live here: every figure is formatted by @/i18n, so a sentence never carries a "$" or "%".
 */
export const loanMessages = defineMessages({
  // Amount entry: the big figure, the keypad, the full-screen pads.
  'loan.amountFigure.amount': {
    en: 'Amount, {amount}',
    es: 'Importe, {amount}',
    fr: 'Montant, {amount}',
  },
  'loan.amountFigure.rate': {
    en: 'Rate, {rate} percent',
    es: 'Tasa, {rate} por ciento',
    fr: 'Taux, {rate} pour cent',
  },
  'loan.keypad.decimal': {
    en: 'Decimal point',
    es: 'Punto decimal',
    fr: 'Virgule décimale',
  },
  'loan.keypad.deleteLast': {
    en: 'Delete last digit',
    es: 'Borrar el último dígito',
    fr: 'Effacer le dernier chiffre',
  },
  'loan.calcPad.title': { en: 'Calculator', es: 'Calculadora', fr: 'Calculatrice' },
  'loan.calcPad.divideByZero': {
    en: 'Cannot divide by zero',
    es: 'No se puede dividir entre cero',
    fr: 'Division par zéro impossible',
  },
  'loan.amountTile.open': { en: 'Open', es: 'Abrir', fr: 'Ouvrir' },
  'loan.sliderRow.edit': {
    en: '{label}, {value}. Edit',
    es: '{label}, {value}. Editar',
    fr: '{label}, {value}. Modifier',
  },

  // A loan term: "5 yrs 3 mo". English matches formatTerm in src/lib/loan.ts.
  'loan.term.months': {
    en: { one: '{count} mo', other: '{count} mo' },
    es: { one: '{count} mes', other: '{count} meses' },
    fr: { one: '{count} mois', other: '{count} mois' },
  },
  'loan.term.years': {
    en: { one: '{count} yr', other: '{count} yrs' },
    es: { one: '{count} año', other: '{count} años' },
    fr: { one: '{count} an', other: '{count} ans' },
  },
  'loan.term.yearsMonths': {
    en: '{years} {months}',
    es: '{years} {months}',
    fr: '{years} {months}',
  },

  // Words several loan screens share.
  'loan.amount': { en: 'Loan amount', es: 'Importe del préstamo', fr: 'Montant du prêt' },
  'loan.interestRate': { en: 'Interest rate', es: 'Tasa de interés', fr: 'Taux d’intérêt' },
  'loan.termLabel': { en: 'Term', es: 'Plazo', fr: 'Durée' },
  'loan.monthlyPayment': {
    en: 'Monthly payment',
    es: 'Pago mensual',
    fr: 'Paiement mensuel',
  },
  'loan.borrowed': { en: 'Borrowed', es: 'Prestado', fr: 'Emprunté' },
  'loan.firstPayment': { en: 'First payment', es: 'Primer pago', fr: 'Premier paiement' },
  'loan.extraMonthly': {
    en: 'Extra each month',
    es: 'Extra cada mes',
    fr: 'Supplément chaque mois',
  },
  'loan.lumpSum': {
    en: 'One-off overpayment',
    es: 'Abono a capital único',
    fr: 'Versement supplémentaire unique',
  },
  'loan.fees': {
    en: 'Fees paid upfront',
    es: 'Comisiones pagadas por adelantado',
    fr: 'Frais payés d’avance',
  },

  // How interest accrues: the chips and their notes on the calculator.
  'loan.basis.daily365': { en: 'Daily · 365', es: 'Diario · 365', fr: 'Quotidien · 365' },
  'loan.basis.monthlyRests': {
    en: 'Monthly rests',
    es: 'Cálculo mensual',
    fr: 'Calcul mensuel',
  },
  'loan.basisNote.actual360': {
    en: 'Interest accrues every day, but the year is counted as 360 days — so a full year costs 365/360 of the quoted rate. A commercial lending convention.',
    es: 'Los intereses se generan cada día, pero el año se cuenta como de 360 días, así que un año completo cuesta 365/360 de la tasa indicada. Es una convención de los préstamos comerciales.',
    fr: 'Les intérêts courent chaque jour, mais l’année compte 360 jours — une année complète coûte donc 365/360 du taux annoncé. Une convention des prêts commerciaux.',
  },
  'loan.basisNote.actual365': {
    en: 'Interest accrues every day on what is still owed, so a 31-day month costs more than a 28-day one. How US auto, personal and student loans are billed.',
    es: 'Los intereses se generan cada día sobre lo que aún debes, así que un mes de 31 días cuesta más que uno de 28. Así se cobran los préstamos de auto, personales y estudiantiles en EE. UU.',
    fr: 'Les intérêts courent chaque jour sur ce que tu dois encore, donc un mois de 31 jours coûte plus cher qu’un mois de 28. C’est ainsi que sont facturés les prêts auto, personnels et étudiants aux États-Unis.',
  },
  'loan.basisNote.monthly': {
    en: 'One twelfth of the annual rate each month, whatever the calendar says — February costs the same as March. What mortgages, UK personal loans and every rate table quote. Any odd days before the first payment are charged on top, by the day.',
    es: 'Una doceava parte de la tasa anual cada mes, diga lo que diga el calendario: febrero cuesta lo mismo que marzo. Es lo que cotizan las hipotecas, los préstamos personales del Reino Unido y todas las tablas de tasas. Los días sueltos antes del primer pago se cobran aparte, por día.',
    fr: 'Un douzième du taux annuel chaque mois, peu importe le calendrier — février coûte autant que mars. C’est ce qu’affichent les prêts hypothécaires, les prêts personnels au Royaume-Uni et toutes les grilles de taux. Les jours en plus avant le premier paiement sont facturés en sus, au jour le jour.',
  },
  'loan.basisNote.thirty360': {
    en: 'Every month counted as 30 days and every year as 360. The bond convention, and how older mortgages were written.',
    es: 'Cada mes cuenta como 30 días y cada año como 360. Es la convención de los bonos y la de las hipotecas antiguas.',
    fr: 'Chaque mois compte pour 30 jours et chaque année pour 360. La convention des obligations, et celle des anciens prêts hypothécaires.',
  },

  // The loan calculator.
  'loan.calculator.title': {
    en: 'Loan calculator',
    es: 'Calculadora de préstamos',
    fr: 'Calculateur de prêt',
  },
  'loan.calculator.paymentsLastOn': {
    en: {
      one: '{count} payment · last on {date}',
      other: '{count} payments · last on {date}',
    },
    es: { one: '{count} pago · último el {date}', other: '{count} pagos · último el {date}' },
    fr: {
      one: '{count} paiement · dernier le {date}',
      other: '{count} paiements · dernier le {date}',
    },
  },
  'loan.calculator.plusExtra': {
    en: 'Plus {extra} extra — {total} leaves your account each month.',
    es: 'Más {extra} extra: cada mes salen {total} de tu cuenta.',
    fr: 'Plus {extra} en supplément — ton compte est débité de {total} chaque mois.',
  },
  'loan.calculator.firstCoversMonthPlus': {
    en: {
      one: 'First payment covers a month plus {count} day — {interest} of it is interest.',
      other: 'First payment covers a month plus {count} days — {interest} of it is interest.',
    },
    es: {
      one: 'El primer pago cubre un mes y {count} día: {interest} son intereses.',
      other: 'El primer pago cubre un mes y {count} días: {interest} son intereses.',
    },
    fr: {
      one: 'Le premier paiement couvre un mois et {count} jour, dont {interest} d’intérêts.',
      other: 'Le premier paiement couvre un mois et {count} jours, dont {interest} d’intérêts.',
    },
  },
  'loan.calculator.firstCoversDays': {
    en: {
      one: 'First payment covers {count} day, not a month — {interest} of it is interest.',
      other: 'First payment covers {count} days, not a month — {interest} of it is interest.',
    },
    es: {
      one: 'El primer pago cubre {count} día, no un mes: {interest} son intereses.',
      other: 'El primer pago cubre {count} días, no un mes: {interest} son intereses.',
    },
    fr: {
      one: 'Le premier paiement couvre {count} jour, pas un mois, dont {interest} d’intérêts.',
      other: 'Le premier paiement couvre {count} jours, pas un mois, dont {interest} d’intérêts.',
    },
  },
  'loan.calculator.theLoan': { en: 'The loan', es: 'El préstamo', fr: 'Le prêt' },
  'loan.calculator.dates': { en: 'Dates', es: 'Fechas', fr: 'Dates' },
  'loan.calculator.moneyReceived': {
    en: 'Money received',
    es: 'Dinero recibido',
    fr: 'Argent reçu',
  },
  'loan.calculator.overpaymentsAndFees': {
    en: 'Overpayments and fees',
    es: 'Abonos a capital y comisiones',
    fr: 'Versements supplémentaires et frais',
  },
  'loan.calculator.nothingExtra': {
    en: 'Nothing extra',
    es: 'Nada extra',
    fr: 'Aucun supplément',
  },
  'loan.calculator.overpaymentLands': {
    en: 'Overpayment lands',
    es: 'Fecha del abono',
    fr: 'Date du versement',
  },
  // Not common.none: Spanish agrees "ninguna" with "comisiones".
  'loan.calculator.noFees': { en: 'None', es: 'Ninguna', fr: 'Aucun' },
  'loan.calculator.howInterestCharged': {
    en: 'How interest is charged',
    es: 'Cómo se cobran los intereses',
    fr: 'Comment les intérêts sont calculés',
  },
  'loan.calculator.interestPaid': {
    en: 'Interest paid',
    es: 'Intereses pagados',
    fr: 'Intérêts payés',
  },
  'loan.calculator.feesAtClosing': {
    en: 'Fees at closing',
    es: 'Comisiones al contratar',
    fr: 'Frais à la signature',
  },
  'loan.calculator.totalRepay': {
    en: 'Total you repay',
    es: 'Total que pagas',
    fr: 'Total remboursé',
  },
  'loan.calculator.aprNote': {
    en: 'The APR is what the credit costs once the fees and the length of the first period are counted in — the figure a US lender has to disclose. It is higher than the rate whenever you pay for the loan before you start repaying it.',
    es: 'El APR es lo que cuesta el crédito una vez que se cuentan las comisiones y la duración del primer periodo: la cifra que un prestamista de EE. UU. debe informar. Es más alto que la tasa siempre que pagas por el préstamo antes de empezar a devolverlo.',
    fr: 'L’APR est ce que coûte le crédit une fois les frais et la durée de la première période comptés — le chiffre qu’un prêteur américain doit divulguer. Il dépasse le taux chaque fois que tu paies pour le prêt avant de commencer à le rembourser.',
  },
  'loan.calculator.ifYouOverpay': {
    en: 'If you overpay',
    es: 'Si haces abonos a capital',
    fr: 'Si tu verses plus',
  },
  'loan.calculator.interestSaved': {
    en: 'Interest saved',
    es: 'Intereses ahorrados',
    fr: 'Intérêts économisés',
  },
  'loan.calculator.paidOffEarlyBy': {
    en: 'Paid off early by',
    es: 'Liquidado antes por',
    fr: 'Remboursé plus tôt de',
  },
  'loan.calculator.clearOn': {
    en: 'Clear on {date} instead of {contractDate}, paying the same {payment} a month plus what you add.',
    es: 'Lo liquidas el {date} en lugar del {contractDate}, pagando los mismos {payment} al mes más lo que agregues.',
    fr: 'Remboursé le {date} au lieu du {contractDate}, en payant les mêmes {payment} par mois plus ce que tu ajoutes.',
  },
  'loan.calculator.confirmTitle': {
    en: 'Add this to monthly bills?',
    es: '¿Agregar esto a las facturas mensuales?',
    fr: 'Ajouter ceci aux factures mensuelles ?',
  },
  'loan.calculator.confirmMessage': {
    en: '{payment} a month for {term}, filed under Loans.',
    es: '{payment} al mes durante {term}, en la categoría Préstamos.',
    fr: '{payment} par mois pendant {term}, classé sous Prêts.',
  },
  'loan.calculator.confirmMessageOverpaying': {
    en: '{payment} a month for {term}, filed under Loans. The overpayments are not saved with it — the bill is the contract payment.',
    es: '{payment} al mes durante {term}, en la categoría Préstamos. Los abonos a capital no se guardan con el préstamo: la factura es el pago del contrato.',
    fr: '{payment} par mois pendant {term}, classé sous Prêts. Les versements supplémentaires ne sont pas enregistrés avec lui — la facture correspond au paiement prévu au contrat.',
  },
  'loan.calculator.amountCaption': {
    en: 'How much you are borrowing',
    es: 'Cuánto vas a pedir prestado',
    fr: 'Combien tu empruntes',
  },
  'loan.calculator.rateCaption': {
    en: 'Annual percentage rate',
    es: 'Tasa de interés anual',
    fr: 'Taux annuel en pourcentage',
  },
  'loan.calculator.extraCaption': {
    en: 'Paid on top of the contract payment',
    es: 'Se paga además del pago del contrato',
    fr: 'Payé en plus du paiement prévu au contrat',
  },
  'loan.calculator.lumpCaption': {
    en: 'A single payment against the balance',
    es: 'Un solo pago que se abona al saldo',
    fr: 'Un seul versement sur le solde',
  },
  'loan.calculator.feesCaption': {
    en: 'Arrangement fee, points — anything deducted at closing',
    es: 'Comisión por apertura, puntos: todo lo que se descuenta al contratar',
    fr: 'Frais de dossier, points — tout ce qui est retenu à la signature',
  },

  // The two parts of a loan, under the bar.
  'loan.proportion.borrowed': {
    en: 'Borrowed {amount}',
    es: 'Prestado {amount}',
    fr: 'Emprunté {amount}',
  },
  'loan.proportion.interest': {
    en: 'Interest {share}',
    es: 'Intereses {share}',
    fr: 'Intérêts {share}',
  },

  // The card that opens the schedule.
  'loan.scheduleCard.title': {
    en: 'Where each payment goes',
    es: 'A dónde va cada pago',
    fr: 'Où va chaque paiement',
  },
  'loan.scheduleCard.summary': {
    en: {
      one: '{share} of your first payment is interest — see the {count} payment',
      other: '{share} of your first payment is interest — see all {count} payments',
    },
    es: {
      one: '{share} de tu primer pago se va en intereses: ve {count} pago',
      other: '{share} de tu primer pago se va en intereses: ve los {count} pagos',
    },
    fr: {
      one: '{share} de ton premier paiement va aux intérêts — vois {count} paiement',
      other: '{share} de ton premier paiement va aux intérêts — vois les {count} paiements',
    },
  },
  'loan.scheduleCard.a11y': {
    en: 'Where each payment goes. First payment: {interest} interest, {principal} off the balance. Opens the full schedule.',
    es: 'A dónde va cada pago. Primer pago: {interest} de intereses, {principal} a capital. Abre el calendario completo.',
    fr: 'Où va chaque paiement. Premier paiement : {interest} d’intérêts, {principal} en capital. Ouvre le calendrier complet.',
  },

  // The payment schedule.
  'loan.schedule.title': {
    en: 'Payment schedule',
    es: 'Calendario de pagos',
    fr: 'Calendrier de remboursement',
  },
  'loan.schedule.summary': {
    en: '{payment} a month for {term}, at {rate}.',
    es: '{payment} al mes durante {term}, al {rate}.',
    fr: '{payment} par mois pendant {term}, à {rate}.',
  },
  'loan.basisFootnote.actual365': {
    en: 'Interest accrues daily on what is still owed, so a 31-day month costs more than a 28-day one.',
    es: 'Los intereses se generan cada día sobre lo que aún debes, así que un mes de 31 días cuesta más que uno de 28.',
    fr: 'Les intérêts courent chaque jour sur ce que tu dois encore, donc un mois de 31 jours coûte plus cher qu’un mois de 28.',
  },
  'loan.basisFootnote.actual360': {
    en: 'Interest accrues daily on what is still owed, over a 360-day year, so a full year costs a little more than the quoted rate.',
    es: 'Los intereses se generan cada día sobre lo que aún debes, con un año de 360 días, así que un año completo cuesta un poco más que la tasa indicada.',
    fr: 'Les intérêts courent chaque jour sur ce que tu dois encore, sur une année de 360 jours, donc une année complète coûte un peu plus que le taux annoncé.',
  },
  'loan.basisFootnote.thirty360': {
    en: 'Every month is counted as 30 days and every year as 360, so every period costs the same.',
    es: 'Cada mes cuenta como 30 días y cada año como 360, así que todos los periodos cuestan lo mismo.',
    fr: 'Chaque mois compte pour 30 jours et chaque année pour 360, donc chaque période coûte la même chose.',
  },
  'loan.basisFootnote.monthly': {
    en: 'Interest is charged in monthly rests — one twelfth of the annual rate on what is still owed — so February costs the same as March. Any odd days before the first payment are charged on top, by the day.',
    es: 'Los intereses se cobran por mes (una doceava parte de la tasa anual sobre lo que aún debes), así que febrero cuesta lo mismo que marzo. Los días sueltos antes del primer pago se cobran aparte, por día.',
    fr: 'Les intérêts sont calculés chaque mois — un douzième du taux annuel sur ce que tu dois encore — donc février coûte autant que mars. Les jours en plus avant le premier paiement sont facturés en sus, au jour le jour.',
  },
  'loan.schedule.yearSplit': {
    en: '{interest} interest · {principal} off',
    es: '{interest} de intereses · {principal} a capital',
    fr: '{interest} d’intérêts · {principal} en capital',
  },
  'loan.schedule.assumes': {
    en: 'Assumes every payment lands on time and the rate never moves — paying late costs the extra days.',
    es: 'Supone que cada pago llega a tiempo y que la tasa nunca cambia: pagar tarde cuesta los días de más.',
    fr: 'Suppose que chaque paiement arrive à temps et que le taux ne bouge jamais — payer en retard coûte les jours en plus.',
  },
  'loan.schedule.overpaidNote': {
    en: 'The overpayments you set are already in these rows, which is why the schedule ends early.',
    es: 'Los abonos a capital que indicaste ya están en estas filas; por eso el calendario termina antes.',
    fr: 'Les versements supplémentaires que tu as indiqués sont déjà dans ces lignes ; c’est pourquoi le calendrier se termine plus tôt.',
  },
  'loan.schedule.payExtraNote': {
    en: 'Paying extra against the balance shortens the term.',
    es: 'Abonar de más al saldo acorta el plazo.',
    fr: 'Verser plus sur le solde raccourcit la durée.',
  },
  'loan.schedule.rowA11y': {
    en: {
      one: 'Payment {number}, {date}, covering {count} day. {payment}: {interest} interest, {principal} off the balance. {balance} left.',
      other:
        'Payment {number}, {date}, covering {count} days. {payment}: {interest} interest, {principal} off the balance. {balance} left.',
    },
    es: {
      one: 'Pago {number}, {date}, cubre {count} día. {payment}: {interest} de intereses, {principal} a capital. Quedan {balance}.',
      other:
        'Pago {number}, {date}, cubre {count} días. {payment}: {interest} de intereses, {principal} a capital. Quedan {balance}.',
    },
    fr: {
      one: 'Paiement {number}, {date}, couvre {count} jour. {payment} : {interest} d’intérêts, {principal} en capital. Reste {balance}.',
      other:
        'Paiement {number}, {date}, couvre {count} jours. {payment} : {interest} d’intérêts, {principal} en capital. Reste {balance}.',
    },
  },
  'loan.schedule.rowA11yExtra': {
    en: {
      one: 'Payment {number}, {date}, covering {count} day. {payment}: {interest} interest, {principal} off the balance, including {extra} paid extra. {balance} left.',
      other:
        'Payment {number}, {date}, covering {count} days. {payment}: {interest} interest, {principal} off the balance, including {extra} paid extra. {balance} left.',
    },
    es: {
      one: 'Pago {number}, {date}, cubre {count} día. {payment}: {interest} de intereses, {principal} a capital, incluidos {extra} de pago extra. Quedan {balance}.',
      other:
        'Pago {number}, {date}, cubre {count} días. {payment}: {interest} de intereses, {principal} a capital, incluidos {extra} de pago extra. Quedan {balance}.',
    },
    fr: {
      one: 'Paiement {number}, {date}, couvre {count} jour. {payment} : {interest} d’intérêts, {principal} en capital, dont {extra} versés en supplément. Reste {balance}.',
      other:
        'Paiement {number}, {date}, couvre {count} jours. {payment} : {interest} d’intérêts, {principal} en capital, dont {extra} versés en supplément. Reste {balance}.',
    },
  },
  'loan.schedule.rowSplitDays': {
    en: '{principal} off · {interest} interest · {days}d',
    es: '{principal} a capital · {interest} de intereses · {days} d',
    fr: '{principal} en capital · {interest} d’intérêts · {days} j',
  },
  'loan.schedule.rowSplitExtra': {
    en: '{principal} off · {interest} interest · {extra} extra',
    es: '{principal} a capital · {interest} de intereses · {extra} extra',
    fr: '{principal} en capital · {interest} d’intérêts · {extra} en supplément',
  },
  'loan.schedule.left': { en: '{amount} left', es: 'Quedan {amount}', fr: 'Reste {amount}' },

  // Filing a loan as a bill.
  'loan.save.title': {
    en: 'Add to monthly bills',
    es: 'Agregar a facturas mensuales',
    fr: 'Ajouter aux factures mensuelles',
  },
  'loan.save.subtitle': {
    en: 'This becomes a monthly bill under Loans, so it counts against what you have left.',
    es: 'Se convierte en una factura mensual en Préstamos, así que cuenta contra lo que te queda.',
    fr: 'Ça devient une facture mensuelle sous Prêts, donc elle compte dans ce qui te reste.',
  },
  'loan.save.rate': { en: 'Rate', es: 'Tasa', fr: 'Taux' },
  'loan.save.ratePerYear': { en: '{rate} a year', es: '{rate} anual', fr: '{rate} par an' },
  'loan.save.termPayments': {
    en: { one: '{term} · {count} payment', other: '{term} · {count} payments' },
    es: { one: '{term} · {count} pago', other: '{term} · {count} pagos' },
    fr: { one: '{term} · {count} paiement', other: '{term} · {count} paiements' },
  },
  'loan.save.interestOverTerm': {
    en: 'Interest over the term',
    es: 'Intereses en todo el plazo',
    fr: 'Intérêts sur toute la durée',
  },
  'loan.save.name': { en: 'Name', es: 'Nombre', fr: 'Nom' },
  'loan.save.namePlaceholder': {
    en: 'Car loan, student loan…',
    es: 'Préstamo de auto, préstamo estudiantil…',
    fr: 'Prêt auto, prêt étudiant…',
  },
  'loan.save.icon': { en: 'Icon', es: 'Ícono', fr: 'Icône' },
  'loan.save.paidFrom': { en: 'Paid from', es: 'Se paga desde', fr: 'Payé depuis' },
  'loan.save.needName': {
    en: 'Give the loan a name so you can spot it in your bills.',
    es: 'Ponle un nombre al préstamo para encontrarlo en tus facturas.',
    fr: 'Donne un nom au prêt pour le repérer dans tes factures.',
  },
  'loan.save.noPayment': {
    en: 'That loan does not have a payment to save.',
    es: 'Ese préstamo no tiene un pago que guardar.',
    fr: 'Ce prêt n’a pas de paiement à enregistrer.',
  },
  'loan.save.saving': { en: 'Saving…', es: 'Guardando…', fr: 'Enregistrement…' },
  'loan.save.addToBills': {
    en: 'Add to bills',
    es: 'Agregar a facturas',
    fr: 'Ajouter aux factures',
  },
});

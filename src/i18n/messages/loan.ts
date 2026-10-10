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

  // A loan term in whole words: "5 years 3 months".
  'loan.term.months': {
    en: { one: '{count} month', other: '{count} months' },
    es: { one: '{count} mes', other: '{count} meses' },
    fr: { one: '{count} mois', other: '{count} mois' },
  },
  'loan.term.years': {
    en: { one: '{count} year', other: '{count} years' },
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
  'loan.interest': { en: 'Interest', es: 'Intereses', fr: 'Intérêts' },
  'loan.rate': { en: 'Rate', es: 'Tasa', fr: 'Taux' },
  'loan.totalInterest': {
    en: 'Total interest',
    es: 'Intereses totales',
    fr: 'Intérêts totaux',
  },
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
  'loan.calculator.moreOptions': {
    en: 'More options',
    es: 'Más opciones',
    fr: 'Plus d’options',
  },
  'loan.calculator.moreOptionsHint': {
    en: 'Extra payments & fees',
    es: 'Pagos extra y comisiones',
    fr: 'Paiements supplémentaires et frais',
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
  // The one line under More options, in the words of the convention chosen there.
  'loan.calculator.interestLine.actual365': {
    en: 'Interest is worked out daily on what you still owe.',
    es: 'Los intereses se calculan cada día sobre lo que aún debes.',
    fr: 'Les intérêts sont calculés chaque jour sur ce que tu dois encore.',
  },
  'loan.calculator.interestLine.actual360': {
    en: 'Interest is worked out daily on what you still owe, over a 360-day year.',
    es: 'Los intereses se calculan cada día sobre lo que aún debes, con un año de 360 días.',
    fr: 'Les intérêts sont calculés chaque jour sur ce que tu dois encore, sur une année de 360 jours.',
  },
  'loan.calculator.interestLine.monthly': {
    en: 'Interest is worked out monthly on what you still owe.',
    es: 'Los intereses se calculan cada mes sobre lo que aún debes.',
    fr: 'Les intérêts sont calculés chaque mois sur ce que tu dois encore.',
  },
  'loan.calculator.interestLine.thirty360': {
    en: 'Interest is worked out monthly on what you still owe, every month counted as 30 days.',
    es: 'Los intereses se calculan cada mes sobre lo que aún debes, contando cada mes como de 30 días.',
    fr: 'Les intérêts sont calculés chaque mois sur ce que tu dois encore, chaque mois comptant pour 30 jours.',
  },
  // The bank's own payment, and what the person's changes leave the loan with.
  'loan.calculator.bankPayment': {
    en: 'Your bank’s payment',
    es: 'El pago de tu banco',
    fr: 'Le paiement de ta banque',
  },
  'loan.calculator.skipWorksOut': {
    en: 'Skip works it out as {amount}.',
    es: 'Skip lo calcula en {amount}.',
    fr: 'Skip le calcule à {amount}.',
  },
  'loan.calculator.balloon': {
    en: 'Your last payment would be {amount}.',
    es: 'Tu último pago sería de {amount}.',
    fr: 'Ton dernier paiement serait de {amount}.',
  },
  'loan.calculator.problemMonthly': {
    en: 'Your bank’s payment can’t keep up with this loan’s interest any more (at least {minimum}). Change it, or use Skip’s figure.',
    es: 'El pago de tu banco ya no alcanza para cubrir los intereses de este préstamo (mínimo {minimum}). Cámbialo o usa el cálculo de Skip.',
    fr: 'Le paiement de ta banque ne suffit plus à couvrir les intérêts de ce prêt (au moins {minimum}). Modifie-le ou utilise le calcul de Skip.',
  },
  'loan.calculator.problemPayment': {
    en: 'Payment {number} is now less than its interest (at least {minimum}). Change it on the schedule.',
    es: 'El pago {number} ahora es menor que sus intereses (mínimo {minimum}). Cámbialo en el calendario.',
    fr: 'Le paiement {number} est maintenant inférieur à ses intérêts (au moins {minimum}). Modifie-le dans le calendrier.',
  },
  'loan.calculator.problemLast': {
    en: 'Payment {number} is now the last one, which is always what’s left, so your change to it can’t be used.',
    es: 'El pago {number} ahora es el último, que siempre es lo que queda, así que tu cambio no se puede usar.',
    fr: 'Le paiement {number} est maintenant le dernier, qui est toujours ce qui reste : ta modification ne peut pas être utilisée.',
  },
  'loan.calculator.problemOther': {
    en: 'Payment {number} can’t be used as it is. Change it on the schedule.',
    es: 'El pago {number} no se puede usar así. Cámbialo en el calendario.',
    fr: 'Le paiement {number} ne peut pas être utilisé tel quel. Modifie-le dans le calendrier.',
  },
  'loan.calculator.unused': {
    en: {
      one: 'Your change to payment {numbers} isn’t used: the loan is paid off before it.',
      other: 'Your changes to payments {numbers} aren’t used: the loan is paid off before them.',
    },
    es: {
      one: 'Tu cambio al pago {numbers} no se usa: el préstamo se liquida antes.',
      other: 'Tus cambios a los pagos {numbers} no se usan: el préstamo se liquida antes.',
    },
    fr: {
      one: 'Ta modification du paiement {numbers} n’est pas utilisée : le prêt est remboursé avant.',
      other:
        'Tes modifications des paiements {numbers} ne sont pas utilisées : le prêt est remboursé avant.',
    },
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
  // A typed figure past a slider's end is kept as typed; these are the only figures refused.
  'loan.calculator.amountAboveZero': {
    en: 'Type an amount above zero.',
    es: 'Escribe un importe mayor que cero.',
    fr: 'Entre un montant supérieur à zéro.',
  },
  'loan.calculator.rateNeeded': {
    en: 'Type a rate of zero or more.',
    es: 'Escribe una tasa de cero o más.',
    fr: 'Entre un taux de zéro ou plus.',
  },
  'loan.calculator.feesCaption': {
    en: 'Arrangement fee, points — anything deducted at closing',
    es: 'Comisión por apertura, puntos: todo lo que se descuenta al contratar',
    fr: 'Frais de dossier, points — tout ce qui est retenu à la signature',
  },

  // The card that opens the schedule.
  'loan.scheduleCard.subtitle': {
    en: {
      one: 'See where the {count} payment goes',
      other: 'See where all {count} payments go',
    },
    es: { one: 'Mira a dónde va {count} pago', other: 'Mira a dónde van los {count} pagos' },
    fr: { one: 'Vois où va {count} paiement', other: 'Vois où vont les {count} paiements' },
  },

  // The payment schedule.
  'loan.schedule.title': {
    en: 'Payment schedule',
    es: 'Calendario de pagos',
    fr: 'Calendrier de remboursement',
  },
  'loan.schedule.rateApr': { en: '{rate} APR', es: '{rate} APR', fr: '{rate} APR' },
  // The term, then how many payments the schedule holds: "5 years · 60".
  'loan.schedule.termCount': {
    en: '{term} · {count}',
    es: '{term} · {count}',
    fr: '{term} · {count}',
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
  'loan.schedule.yearSummary': {
    en: {
      one: '{count} payment · {interest} interest',
      other: '{count} payments · {interest} interest',
    },
    es: {
      one: '{count} pago · {interest} de intereses',
      other: '{count} pagos · {interest} de intereses',
    },
    fr: {
      one: '{count} paiement · {interest} d’intérêts',
      other: '{count} paiements · {interest} d’intérêts',
    },
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
  'loan.schedule.rowSplit': {
    en: '{principal} principal · {interest} interest',
    es: '{principal} a capital · {interest} de intereses',
    fr: '{principal} en capital · {interest} d’intérêts',
  },
  'loan.schedule.rowSplitExtra': {
    en: '{principal} principal · {interest} interest · {extra} extra',
    es: '{principal} a capital · {interest} de intereses · {extra} extra',
    fr: '{principal} en capital · {interest} d’intérêts · {extra} en supplément',
  },
  'loan.schedule.left': { en: '{amount} left', es: 'Quedan {amount}', fr: 'Reste {amount}' },
  'loan.schedule.changed': { en: 'Changed', es: 'Cambiado', fr: 'Modifié' },
  'loan.schedule.changedA11y': {
    en: 'Changed by you.',
    es: 'Lo cambiaste tú.',
    fr: 'Modifié par toi.',
  },
  'loan.schedule.rowHint': {
    en: 'Opens this payment so you can change it.',
    es: 'Abre este pago para que puedas cambiarlo.',
    fr: 'Ouvre ce paiement pour que tu puisses le modifier.',
  },
  'loan.schedule.showAll': {
    en: 'Show all {count} payments',
    es: 'Ver los {count} pagos',
    fr: 'Voir les {count} paiements',
  },

  // Filing a loan as a bill.
  'loan.save.title': {
    en: 'Save this loan',
    es: 'Guardar este préstamo',
    fr: 'Enregistrer ce prêt',
  },
  'loan.save.subtitle': {
    en: 'It’ll show under Loans as a monthly bill.',
    es: 'Aparecerá en Préstamos como una factura mensual.',
    fr: 'Il apparaîtra sous Prêts comme une facture mensuelle.',
  },
  'loan.save.perMonth': { en: '/ month', es: '/ mes', fr: '/ mois' },
  'loan.save.payments': { en: 'Payments', es: 'Pagos', fr: 'Paiements' },
  'loan.save.paymentsMonthly': {
    en: { one: '{count} monthly', other: '{count} monthly' },
    es: { one: '{count} mensual', other: '{count} mensuales' },
    fr: { one: '{count} mensuel', other: '{count} mensuels' },
  },
  'loan.save.name': { en: 'Name', es: 'Nombre', fr: 'Nom' },
  'loan.save.namePlaceholder': {
    en: 'e.g. Car loan',
    es: 'p. ej., Préstamo de auto',
    fr: 'p. ex. Prêt auto',
  },
  'loan.save.loanType': { en: 'Loan type', es: 'Tipo de préstamo', fr: 'Type de prêt' },
  'loan.save.paidFrom': { en: 'Paid from', es: 'Se paga desde', fr: 'Payé depuis' },
  'loan.save.skipSource': { en: 'Skip', es: 'Omitir', fr: 'Passer' },
  // {fields} is the boxes still empty, by the names they carry on the page.
  'loan.save.missing': {
    en: 'To save this loan, fill in: {fields}.',
    es: 'Para guardar el préstamo, completa: {fields}.',
    fr: 'Pour enregistrer ce prêt, remplis : {fields}.',
  },
  'loan.save.noPayment': {
    en: 'That loan does not have a payment to save.',
    es: 'Ese préstamo no tiene un pago que guardar.',
    fr: 'Ce prêt n’a pas de paiement à enregistrer.',
  },
  // The loans table holds a rate from 0 to 100, to nine decimals.
  'loan.save.rateOutOfRange': {
    en: 'Skip can save rates from {min} to {max}, with up to nine decimals.',
    es: 'Skip puede guardar tasas de {min} a {max}, con hasta nueve decimales.',
    fr: 'Skip peut enregistrer des taux de {min} à {max}, avec neuf décimales au plus.',
  },
  // {items} names each change that cannot be used, as the calculator lists them.
  'loan.save.fix': {
    en: 'To save this loan, fix: {items}.',
    es: 'Para guardar el préstamo, corrige: {items}.',
    fr: 'Pour enregistrer ce prêt, corrige : {items}.',
  },
  'loan.save.fixMonthly': {
    en: 'the monthly payment',
    es: 'el pago mensual',
    fr: 'le paiement mensuel',
  },
  'loan.save.fixPayment': {
    en: 'payment {number}',
    es: 'el pago {number}',
    fr: 'le paiement {number}',
  },
  // When the database refuses a loan for a reason the page can name.
  'loan.save.refusedPayments': {
    en: 'Skip couldn’t save your changed payments. Check them on the schedule, then try again.',
    es: 'Skip no pudo guardar tus pagos cambiados. Revísalos en el calendario e inténtalo de nuevo.',
    fr: 'Skip n’a pas pu enregistrer tes paiements modifiés. Vérifie-les dans le calendrier, puis réessaie.',
  },
  'loan.save.refusedLastPayment': {
    en: 'Skip couldn’t save when this loan ends. Check your changed payments, then try again.',
    es: 'Skip no pudo guardar cuándo termina este préstamo. Revisa tus pagos cambiados e inténtalo de nuevo.',
    fr: 'Skip n’a pas pu enregistrer la fin de ce prêt. Vérifie tes paiements modifiés, puis réessaie.',
  },
  'loan.save.saving': { en: 'Saving…', es: 'Guardando…', fr: 'Enregistrement…' },
  'loan.save.saveToLoans': {
    en: 'Save to Loans',
    es: 'Guardar en Préstamos',
    fr: 'Enregistrer dans Prêts',
  },

  // The page for the monthly payment, or for one payment of the schedule.
  'loan.payment.skipFigure': {
    en: 'Skip’s figure',
    es: 'Cálculo de Skip',
    fr: 'Calcul de Skip',
  },
  'loan.payment.monthlyHint': {
    en: 'Type the payment on your bank statement or loan papers. The last payment takes up any difference.',
    es: 'Escribe el pago de tu estado de cuenta o de tu contrato. El último pago cubre cualquier diferencia.',
    fr: 'Entre le paiement indiqué sur ton relevé ou ton contrat de prêt. Le dernier paiement absorbe la différence.',
  },
  'loan.payment.useThis': {
    en: 'Use this payment',
    es: 'Usar este pago',
    fr: 'Utiliser ce paiement',
  },
  'loan.payment.useSkip': {
    en: 'Use Skip’s figure',
    es: 'Usar el cálculo de Skip',
    fr: 'Utiliser le calcul de Skip',
  },
  'loan.payment.title': { en: 'Payment {number}', es: 'Pago {number}', fr: 'Paiement {number}' },
  'loan.payment.regular': {
    en: 'Regular payment',
    es: 'Pago regular',
    fr: 'Paiement régulier',
  },
  'loan.payment.interest': {
    en: 'Interest this time',
    es: 'Intereses de este pago',
    fr: 'Intérêts de ce paiement',
  },
  'loan.payment.minimum': {
    en: 'The least it can be',
    es: 'Lo mínimo posible',
    fr: 'Le minimum possible',
  },
  'loan.payment.owed': {
    en: 'Pays the loan off',
    es: 'Liquida el préstamo',
    fr: 'Rembourse le prêt',
  },
  'loan.payment.thisPayment': { en: 'This payment', es: 'Este pago', fr: 'Ce paiement' },
  'loan.payment.singleHint': {
    en: 'Pay more or less this once. Every balance after it is worked out again, and the last payment takes up the difference.',
    es: 'Paga más o menos esta vez. Todos los saldos posteriores se vuelven a calcular, y el último pago cubre la diferencia.',
    fr: 'Paie plus ou moins cette fois. Tous les soldes suivants sont recalculés, et le dernier paiement absorbe la différence.',
  },
  'loan.payment.payoffHint': {
    en: 'Anything above {owed} pays the loan off, and is taken as {owed}.',
    es: 'Cualquier monto mayor que {owed} liquida el préstamo y se toma como {owed}.',
    fr: 'Tout montant supérieur à {owed} rembourse le prêt et compte comme {owed}.',
  },
  'loan.payment.backToRegular': {
    en: 'Back to the regular payment',
    es: 'Volver al pago regular',
    fr: 'Revenir au paiement régulier',
  },
  'loan.payment.locked': {
    en: 'This is the last payment. It’s always what’s left on the loan, so it can’t be changed.',
    es: 'Este es el último pago. Siempre es lo que queda del préstamo, así que no se puede cambiar.',
    fr: 'C’est le dernier paiement. C’est toujours ce qui reste du prêt, il ne peut donc pas être modifié.',
  },
  'loan.payment.paidOff': {
    en: 'The loan is paid off before this payment.',
    es: 'El préstamo se liquida antes de este pago.',
    fr: 'Le prêt est remboursé avant ce paiement.',
  },
  'loan.payment.gone': {
    en: 'This loan isn’t open any more. Go back to the calculator to change it.',
    es: 'Este préstamo ya no está abierto. Vuelve a la calculadora para cambiarlo.',
    fr: 'Ce prêt n’est plus ouvert. Retourne au calculateur pour le modifier.',
  },

  // Why a typed payment is not taken.
  'loan.refusal.notAnAmount': {
    en: 'Type an amount, to the cent.',
    es: 'Escribe un importe, hasta los centavos.',
    fr: 'Entre un montant, au cent près.',
  },
  'loan.refusal.zero': {
    en: 'Type an amount above zero.',
    es: 'Escribe un importe mayor que cero.',
    fr: 'Entre un montant supérieur à zéro.',
  },
  'loan.refusal.belowInterestMonthly': {
    en: 'That can’t keep up with this loan’s interest. The least it can be is {minimum}.',
    es: 'Eso no alcanza para cubrir los intereses de este préstamo. Lo mínimo posible es {minimum}.',
    fr: 'Cela ne suffit pas à couvrir les intérêts de ce prêt. Le minimum possible est {minimum}.',
  },
  'loan.refusal.belowInterest': {
    en: 'That doesn’t cover this payment’s interest. The least it can be is {minimum}.',
    es: 'Eso no cubre los intereses de este pago. Lo mínimo posible es {minimum}.',
    fr: 'Cela ne couvre pas les intérêts de ce paiement. Le minimum possible est {minimum}.',
  },
  'loan.refusal.noSuchPayment': {
    en: 'This loan has no such payment.',
    es: 'Este préstamo no tiene ese pago.',
    fr: 'Ce prêt n’a pas ce paiement.',
  },
  'loan.refusal.lastPayment': {
    en: 'The last payment is always what’s left, so it can’t be changed.',
    es: 'El último pago siempre es lo que queda, así que no se puede cambiar.',
    fr: 'Le dernier paiement est toujours ce qui reste, il ne peut donc pas être modifié.',
  },

  // What a loan is for, on the save page's grid.
  'loan.type.personal': { en: 'Personal', es: 'Personal', fr: 'Personnel' },
  'loan.type.car': { en: 'Car', es: 'Auto', fr: 'Auto' },
  'loan.type.student': { en: 'Student', es: 'Estudiantil', fr: 'Études' },
  'loan.type.home': { en: 'Home', es: 'Vivienda', fr: 'Maison' },
  'loan.type.business': { en: 'Business', es: 'Negocio', fr: 'Entreprise' },
  'loan.type.medical': { en: 'Medical', es: 'Médico', fr: 'Médical' },
  'loan.type.creditCard': { en: 'Credit card', es: 'Tarjeta de crédito', fr: 'Carte de crédit' },
  'loan.type.other': { en: 'Other', es: 'Otro', fr: 'Autre' },
});

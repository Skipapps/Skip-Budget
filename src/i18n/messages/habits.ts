import { defineMessages } from '@/i18n/translate';

/**
 * Spending habits. The icon names are what is read under each icon and by VoiceOver; the icon id
 * (`food-dining/coffee`) is what is stored. French meals follow Canada: déjeuner, dîner, souper.
 */
export const habitsMessages = defineMessages({
  // The icon picker's group headings.
  'habits.category.foodDining': {
    en: 'Food & Dining',
    es: 'Comida y restaurantes',
    fr: 'Alimentation et restos',
  },
  'habits.category.transport': { en: 'Transport', es: 'Transporte', fr: 'Transport' },
  'habits.category.shopping': { en: 'Shopping', es: 'Compras', fr: 'Magasinage' },
  'habits.category.entertainment': {
    en: 'Entertainment',
    es: 'Entretenimiento',
    fr: 'Divertissement',
  },
  'habits.category.health': { en: 'Health', es: 'Salud', fr: 'Santé' },
  'habits.category.fitness': { en: 'Fitness', es: 'Ejercicio', fr: 'Forme physique' },
  'habits.category.wellness': { en: 'Wellness', es: 'Bienestar', fr: 'Bien-être' },
  'habits.category.homeBills': {
    en: 'Home & Bills',
    es: 'Hogar y facturas',
    fr: 'Maison et factures',
  },
  'habits.category.familyPets': {
    en: 'Family & Pets',
    es: 'Familia y mascotas',
    fr: 'Famille et animaux',
  },
  'habits.category.relationships': { en: 'Relationships', es: 'Relaciones', fr: 'Relations' },
  'habits.category.learningGrowth': {
    en: 'Learning & Growth',
    es: 'Aprender y crecer',
    fr: 'Apprendre et grandir',
  },
  'habits.category.finance': { en: 'Finance', es: 'Finanzas', fr: 'Finances' },
  'habits.category.goals': { en: 'Goals', es: 'Metas', fr: 'Objectifs' },

  // Food & Dining
  'habits.icon.foodDining.alcoholNightlife': {
    en: 'Alcohol & nightlife',
    es: 'Alcohol y vida nocturna',
    fr: 'Alcool et vie nocturne',
  },
  'habits.icon.foodDining.breakfast': { en: 'Breakfast', es: 'Desayuno', fr: 'Déjeuner' },
  'habits.icon.foodDining.coffee': { en: 'Coffee', es: 'Café', fr: 'Café' },
  'habits.icon.foodDining.dinnerOut': {
    en: 'Dinner out',
    es: 'Cenar fuera',
    fr: 'Souper au resto',
  },
  'habits.icon.foodDining.fastFood': {
    en: 'Fast food',
    es: 'Comida rápida',
    fr: 'Restauration rapide',
  },
  'habits.icon.foodDining.groceries': { en: 'Groceries', es: 'Supermercado', fr: 'Épicerie' },
  'habits.icon.foodDining.lunchOut': { en: 'Lunch out', es: 'Comer fuera', fr: 'Dîner au resto' },
  'habits.icon.foodDining.restaurant': { en: 'Restaurant', es: 'Restaurante', fr: 'Restaurant' },
  'habits.icon.foodDining.snacksSweets': {
    en: 'Snacks & sweets',
    es: 'Botanas y dulces',
    fr: 'Collations et sucreries',
  },
  'habits.icon.foodDining.softDrinks': {
    en: 'Soft drinks',
    es: 'Refrescos',
    fr: 'Boissons gazeuses',
  },

  // Transport
  'habits.icon.transport.bike': { en: 'Bike', es: 'Bicicleta', fr: 'Vélo' },
  'habits.icon.transport.bus': { en: 'Bus', es: 'Autobús', fr: 'Autobus' },
  'habits.icon.transport.car': { en: 'Car', es: 'Auto', fr: 'Auto' },
  'habits.icon.transport.flights': { en: 'Flights', es: 'Vuelos', fr: 'Vols' },
  'habits.icon.transport.parking': { en: 'Parking', es: 'Estacionamiento', fr: 'Stationnement' },
  'habits.icon.transport.taxiRides': {
    en: 'Taxi & rides',
    es: 'Taxi y traslados',
    fr: 'Taxi et covoiturage',
  },
  'habits.icon.transport.train': { en: 'Train', es: 'Tren', fr: 'Train' },

  // Shopping
  'habits.icon.shopping.accessories': { en: 'Accessories', es: 'Accesorios', fr: 'Accessoires' },
  'habits.icon.shopping.clothes': { en: 'Clothes', es: 'Ropa', fr: 'Vêtements' },
  'habits.icon.shopping.gifts': { en: 'Gifts', es: 'Regalos', fr: 'Cadeaux' },
  'habits.icon.shopping.hairCare': {
    en: 'Hair care',
    es: 'Cuidado del cabello',
    fr: 'Soins capillaires',
  },
  'habits.icon.shopping.jewelry': { en: 'Jewelry', es: 'Joyería', fr: 'Bijoux' },
  'habits.icon.shopping.onlineShopping': {
    en: 'Online shopping',
    es: 'Compras en línea',
    fr: 'Magasinage en ligne',
  },
  'habits.icon.shopping.personalCare': {
    en: 'Personal care',
    es: 'Cuidado personal',
    fr: 'Soins personnels',
  },
  'habits.icon.shopping.shoes': { en: 'Shoes', es: 'Zapatos', fr: 'Chaussures' },

  // Entertainment
  'habits.icon.entertainment.books': { en: 'Books', es: 'Libros', fr: 'Livres' },
  'habits.icon.entertainment.concerts': { en: 'Concerts', es: 'Conciertos', fr: 'Concerts' },
  'habits.icon.entertainment.funOutings': { en: 'Fun outings', es: 'Paseos', fr: 'Sorties' },
  'habits.icon.entertainment.games': { en: 'Games', es: 'Juegos', fr: 'Jeux' },
  'habits.icon.entertainment.moviesStreaming': {
    en: 'Movies & streaming',
    es: 'Películas y series',
    fr: 'Films et séries',
  },
  'habits.icon.entertainment.music': { en: 'Music', es: 'Música', fr: 'Musique' },
  'habits.icon.entertainment.parties': { en: 'Parties', es: 'Fiestas', fr: 'Fêtes' },

  // Health
  'habits.icon.health.dental': { en: 'Dental', es: 'Dentista', fr: 'Dentiste' },
  'habits.icon.health.doctorVisit': {
    en: 'Doctor visit',
    es: 'Consulta médica',
    fr: 'Rendez-vous médical',
  },
  'habits.icon.health.eyeCare': {
    en: 'Eye care',
    es: 'Cuidado de la vista',
    fr: 'Soins des yeux',
  },
  'habits.icon.health.firstAid': {
    en: 'First aid',
    es: 'Primeros auxilios',
    fr: 'Premiers soins',
  },
  'habits.icon.health.gymMembership': {
    en: 'Gym membership',
    es: 'Membresía del gimnasio',
    fr: 'Abonnement au gym',
  },
  'habits.icon.health.healthInsurance': {
    en: 'Health insurance',
    es: 'Seguro médico',
    fr: 'Assurance santé',
  },
  'habits.icon.health.hospital': { en: 'Hospital', es: 'Hospital', fr: 'Hôpital' },
  'habits.icon.health.medicine': { en: 'Medicine', es: 'Medicamentos', fr: 'Médicaments' },

  // Fitness
  'habits.icon.fitness.cycling': { en: 'Cycling', es: 'Ciclismo', fr: 'Cyclisme' },
  'habits.icon.fitness.running': { en: 'Running', es: 'Correr', fr: 'Course à pied' },
  'habits.icon.fitness.swimming': { en: 'Swimming', es: 'Natación', fr: 'Natation' },
  'habits.icon.fitness.trackWeight': {
    en: 'Track weight',
    es: 'Control de peso',
    fr: 'Suivi du poids',
  },
  'habits.icon.fitness.workout': { en: 'Workout', es: 'Entrenamiento', fr: 'Entraînement' },

  // Wellness
  'habits.icon.wellness.brushTeeth': {
    en: 'Brush teeth',
    es: 'Lavarse los dientes',
    fr: 'Se brosser les dents',
  },
  'habits.icon.wellness.drinkWater': { en: 'Drink water', es: 'Tomar agua', fr: 'Boire de l’eau' },
  'habits.icon.wellness.eatHealthy': {
    en: 'Eat healthy',
    es: 'Comer sano',
    fr: 'Manger sainement',
  },
  'habits.icon.wellness.meditate': { en: 'Meditate', es: 'Meditar', fr: 'Méditer' },
  'habits.icon.wellness.pray': { en: 'Pray', es: 'Orar', fr: 'Prier' },
  'habits.icon.wellness.quitSmoking': {
    en: 'Quit smoking',
    es: 'Dejar de fumar',
    fr: 'Arrêter de fumer',
  },
  'habits.icon.wellness.sleepEarly': {
    en: 'Sleep early',
    es: 'Dormir temprano',
    fr: 'Se coucher tôt',
  },
  'habits.icon.wellness.takeVitamins': {
    en: 'Take vitamins',
    es: 'Tomar vitaminas',
    fr: 'Prendre des vitamines',
  },
  'habits.icon.wellness.wakeUpEarly': {
    en: 'Wake up early',
    es: 'Levantarse temprano',
    fr: 'Se lever tôt',
  },

  // Home & Bills
  'habits.icon.homeBills.cleaning': { en: 'Cleaning', es: 'Limpieza', fr: 'Ménage' },
  'habits.icon.homeBills.electricity': { en: 'Electricity', es: 'Luz', fr: 'Électricité' },
  'habits.icon.homeBills.furniture': { en: 'Furniture', es: 'Muebles', fr: 'Meubles' },
  'habits.icon.homeBills.homeRepairs': {
    en: 'Home repairs',
    es: 'Reparaciones del hogar',
    fr: 'Réparations à la maison',
  },
  'habits.icon.homeBills.internet': { en: 'Internet', es: 'Internet', fr: 'Internet' },
  'habits.icon.homeBills.laundry': { en: 'Laundry', es: 'Lavandería', fr: 'Lessive' },
  'habits.icon.homeBills.mortgage': { en: 'Mortgage', es: 'Hipoteca', fr: 'Hypothèque' },
  'habits.icon.homeBills.phoneBill': {
    en: 'Phone bill',
    es: 'Plan de celular',
    fr: 'Forfait cellulaire',
  },
  'habits.icon.homeBills.rent': { en: 'Rent', es: 'Renta', fr: 'Loyer' },
  'habits.icon.homeBills.waterBill': { en: 'Water bill', es: 'Agua', fr: 'Eau' },

  // Family & Pets
  'habits.icon.familyPets.babyKids': {
    en: 'Baby & kids',
    es: 'Bebé y niños',
    fr: 'Bébé et enfants',
  },
  'habits.icon.familyPets.childcare': { en: 'Childcare', es: 'Guardería', fr: 'Garderie' },
  'habits.icon.familyPets.donations': { en: 'Donations', es: 'Donativos', fr: 'Dons' },
  'habits.icon.familyPets.pets': { en: 'Pets', es: 'Mascotas', fr: 'Animaux' },
  'habits.icon.familyPets.school': { en: 'School', es: 'Escuela', fr: 'École' },

  // Relationships
  'habits.icon.relationships.callFamily': {
    en: 'Call family',
    es: 'Llamar a la familia',
    fr: 'Appeler la famille',
  },
  'habits.icon.relationships.dateNight': {
    en: 'Date night',
    es: 'Salir en pareja',
    fr: 'Soirée en amoureux',
  },

  // Learning & Growth
  'habits.icon.learningGrowth.careForPlants': {
    en: 'Care for plants',
    es: 'Cuidar las plantas',
    fr: 'Soigner les plantes',
  },
  'habits.icon.learningGrowth.journal': { en: 'Journal', es: 'Diario', fr: 'Journal' },
  'habits.icon.learningGrowth.learnALanguage': {
    en: 'Learn a language',
    es: 'Aprender un idioma',
    fr: 'Apprendre une langue',
  },
  'habits.icon.learningGrowth.onlineCourse': {
    en: 'Online course',
    es: 'Curso en línea',
    fr: 'Cours en ligne',
  },
  'habits.icon.learningGrowth.paintDraw': {
    en: 'Paint & draw',
    es: 'Pintar y dibujar',
    fr: 'Peindre et dessiner',
  },
  'habits.icon.learningGrowth.planTheDay': {
    en: 'Plan the day',
    es: 'Planear el día',
    fr: 'Planifier la journée',
  },
  'habits.icon.learningGrowth.practiceMusic': {
    en: 'Practice music',
    es: 'Practicar música',
    fr: 'Pratiquer la musique',
  },
  'habits.icon.learningGrowth.read': { en: 'Read', es: 'Leer', fr: 'Lire' },

  // Finance
  'habits.icon.finance.bankFees': {
    en: 'Bank fees',
    es: 'Comisiones bancarias',
    fr: 'Frais bancaires',
  },
  'habits.icon.finance.creditCard': {
    en: 'Credit card',
    es: 'Tarjeta de crédito',
    fr: 'Carte de crédit',
  },
  'habits.icon.finance.insurance': { en: 'Insurance', es: 'Seguros', fr: 'Assurances' },
  'habits.icon.finance.investments': { en: 'Investments', es: 'Inversiones', fr: 'Placements' },
  'habits.icon.finance.subscriptions': {
    en: 'Subscriptions',
    es: 'Suscripciones',
    fr: 'Abonnements',
  },
  'habits.icon.finance.taxes': { en: 'Taxes', es: 'Impuestos', fr: 'Impôts' },

  // Goals
  'habits.icon.goals.bigPurchase': { en: 'Big purchase', es: 'Compra grande', fr: 'Gros achat' },
  'habits.icon.goals.buyAHome': { en: 'Buy a home', es: 'Comprar casa', fr: 'Acheter une maison' },
  'habits.icon.goals.educationFund': {
    en: 'Education fund',
    es: 'Fondo para estudios',
    fr: 'Fonds d’études',
  },
  'habits.icon.goals.emergencyFund': {
    en: 'Emergency fund',
    es: 'Fondo de emergencia',
    fr: 'Fonds d’urgence',
  },
  'habits.icon.goals.justSaving': {
    en: 'Just saving',
    es: 'Solo ahorrar',
    fr: 'Simplement épargner',
  },
  'habits.icon.goals.newCar': { en: 'New car', es: 'Auto nuevo', fr: 'Nouvelle auto' },
  'habits.icon.goals.newGadget': { en: 'New gadget', es: 'Nuevo gadget', fr: 'Nouveau gadget' },
  'habits.icon.goals.other': { en: 'Other', es: 'Otro', fr: 'Autre' },
  'habits.icon.goals.payOffDebt': {
    en: 'Pay off debt',
    es: 'Pagar deudas',
    fr: 'Rembourser ses dettes',
  },
  'habits.icon.goals.retirement': { en: 'Retirement', es: 'Retiro', fr: 'Retraite' },
  'habits.icon.goals.startABusiness': {
    en: 'Start a business',
    es: 'Abrir un negocio',
    fr: 'Lancer une entreprise',
  },
  'habits.icon.goals.startInvesting': {
    en: 'Start investing',
    es: 'Empezar a invertir',
    fr: 'Commencer à investir',
  },
  'habits.icon.goals.vacation': { en: 'Vacation', es: 'Vacaciones', fr: 'Vacances' },
  'habits.icon.goals.wedding': { en: 'Wedding', es: 'Boda', fr: 'Mariage' },
  'habits.icon.goals.worldTrip': {
    en: 'World trip',
    es: 'Viaje por el mundo',
    fr: 'Tour du monde',
  },

  // The dashboard.
  'habits.title': { en: 'Spending habits', es: 'Hábitos de gasto', fr: 'Habitudes de dépense' },
  'habits.add': { en: 'Add a habit', es: 'Agregar un hábito', fr: 'Ajouter une habitude' },
  'habits.empty.title': {
    en: 'Track a spending habit',
    es: 'Sigue un hábito de gasto',
    fr: 'Suis une habitude de dépense',
  },
  'habits.empty.message': {
    en: 'Pick something you buy often, like coffee. Tap the days you buy it, and Skip adds up what the other days save.',
    es: 'Elige algo que compras seguido, como el café. Toca los días que lo compras y Skip suma lo que ahorras los demás días.',
    fr: 'Choisis quelque chose que tu achètes souvent, comme un café. Touche les jours où tu l’achètes, et Skip additionne ce que les autres jours te font économiser.',
  },
  'habits.hero.spentThisWeek': {
    en: 'Spent this week',
    es: 'Gastado esta semana',
    fr: 'Dépensé cette semaine',
  },
  'habits.hero.spentThatWeek': {
    en: 'Spent that week',
    es: 'Gastado esa semana',
    fr: 'Dépensé cette semaine-là',
  },
  'habits.hero.saved': { en: 'Saved so far', es: 'Ahorrado hasta hoy', fr: 'Économisé jusqu’ici' },
  'habits.hero.spoken': {
    en: '{label}, {spent}. Saved so far, {saved}.',
    es: '{label}, {spent}. Ahorrado hasta hoy, {saved}.',
    fr: '{label}, {spent}. Économisé jusqu’ici, {saved}.',
  },

  // The week selector.
  'habits.week.previous': { en: 'Previous week', es: 'Semana anterior', fr: 'Semaine précédente' },
  'habits.week.next': { en: 'Next week', es: 'Semana siguiente', fr: 'Semaine suivante' },
  'habits.week.this': { en: 'This week', es: 'Esta semana', fr: 'Cette semaine' },
  'habits.week.last': { en: 'Last week', es: 'La semana pasada', fr: 'La semaine dernière' },
  'habits.week.backToThis': {
    en: 'Goes back to this week',
    es: 'Regresa a esta semana',
    fr: 'Revient à cette semaine',
  },
  'habits.week.spoken': { en: '{label}, {range}', es: '{label}, {range}', fr: '{label}, {range}' },

  // A habit's card. The figures are followed by these small words: "$10.00 saved".
  'habits.card.saved': { en: 'saved', es: 'ahorrado', fr: 'économisé' },
  'habits.card.spent': { en: 'spent', es: 'gastado', fr: 'dépensé' },
  'habits.card.notYet': {
    en: 'Not tracking yet',
    es: 'Aún sin seguimiento',
    fr: 'Pas encore suivie',
  },
  'habits.card.boughtToday': { en: 'Bought today', es: 'Comprado hoy', fr: 'Acheté aujourd’hui' },
  'habits.card.new': {
    en: 'New · tap the days you bought it',
    es: 'Nuevo · toca los días que lo compraste',
    fr: 'Nouveau · touche les jours où tu l’as acheté',
  },
  'habits.card.skipped': {
    en: { one: '{count} day skipped', other: '{count} days skipped' },
    es: { one: '{count} día sin comprar', other: '{count} días sin comprar' },
    fr: { one: '{count} jour sans achat', other: '{count} jours sans achat' },
  },
  'habits.card.boughtYesterday': { en: 'Bought yesterday', es: 'Comprado ayer', fr: 'Acheté hier' },
  'habits.card.skippedWeek': {
    en: 'Skipped all week',
    es: 'Sin comprar en toda la semana',
    fr: 'Aucun achat de la semaine',
  },
  'habits.card.boughtDays': {
    en: { one: 'Bought on {count} day', other: 'Bought on {count} days' },
    es: { one: 'Comprado {count} día', other: 'Comprado {count} días' },
    fr: { one: 'Acheté {count} jour', other: 'Acheté {count} jours' },
  },
  'habits.card.spoken': {
    en: '{name}, {price} each time, {status}, {saved} saved, {spent} spent.',
    es: '{name}, {price} cada vez, {status}, {saved} ahorrado, {spent} gastado.',
    fr: '{name}, {price} chaque fois, {status}, {saved} économisé, {spent} dépensé.',
  },
  'habits.card.spokenNotYet': {
    en: '{name}, {price} each time, {status}.',
    es: '{name}, {price} cada vez, {status}.',
    fr: '{name}, {price} chaque fois, {status}.',
  },
  'habits.card.hint': { en: 'Opens the habit.', es: 'Abre el hábito.', fr: 'Ouvre l’habitude.' },

  // One day's circle, as VoiceOver reads it. {day} is "Monday, October 5".
  'habits.day.date': {
    en: '{weekday}, {month} {day}',
    es: '{weekday} {day} de {month}',
    fr: '{weekday} {day} {month}',
  },
  'habits.day.bought': {
    en: '{day}, bought, {amount}',
    es: '{day}, comprado, {amount}',
    fr: '{day}, acheté, {amount}',
  },
  'habits.day.boughtHint': {
    en: 'Removes this receipt.',
    es: 'Quita este recibo.',
    fr: 'Retire ce reçu.',
  },
  'habits.day.open': { en: '{day}, not bought', es: '{day}, sin comprar', fr: '{day}, pas acheté' },
  'habits.day.openHint': {
    en: 'Records {amount} spent on this day.',
    es: 'Registra {amount} gastados este día.',
    fr: 'Enregistre {amount} dépensés ce jour-là.',
  },
  'habits.day.today': {
    en: '{day}, today, not bought yet',
    es: '{day}, hoy, aún sin comprar',
    fr: '{day}, aujourd’hui, pas encore acheté',
  },
  'habits.day.future': {
    en: '{day}, still to come',
    es: '{day}, todavía no llega',
    fr: '{day}, à venir',
  },
  // Every day label starts with the habit, so two cards' Thursdays never read alike.
  'habits.day.named': { en: '{name}, {label}', es: '{name}, {label}', fr: '{name}, {label}' },
  'habits.day.hidden': {
    en: '{day}, kept but not shown on Free',
    es: '{day}, guardado pero no visible en Gratis',
    fr: '{day}, conservé mais pas affiché en Gratuit',
  },
  'habits.day.before': {
    en: '{day}, before this habit started',
    es: '{day}, antes de empezar este hábito',
    fr: '{day}, avant le début de cette habitude',
  },

  // Tapping a filled day.
  'habits.remove.title': {
    en: 'Remove {weekday}’s {name} ({amount})?',
    es: '¿Quitar {name} del {weekday} ({amount})?',
    fr: 'Retirer {name} de {weekday} ({amount}) ?',
  },
  'habits.remove.titleToday': {
    en: 'Remove today’s {name} ({amount})?',
    es: '¿Quitar {name} de hoy ({amount})?',
    fr: 'Retirer {name} d’aujourd’hui ({amount}) ?',
  },
  'habits.remove.titleDate': {
    en: 'Remove {name} on {date} ({amount})?',
    es: '¿Quitar {name} del {date} ({amount})?',
    fr: 'Retirer {name} du {date} ({amount}) ?',
  },
  'habits.remove.message': {
    en: 'This deletes the receipt.',
    es: 'Esto elimina el recibo.',
    fr: 'Cela supprime le reçu.',
  },

  // A habit's own page.
  'habits.detail.edit': { en: 'Edit {name}', es: 'Editar {name}', fr: 'Modifier {name}' },
  'habits.detail.eachTime': { en: 'Each time', es: 'Cada vez', fr: 'Chaque fois' },
  'habits.detail.started': { en: 'Started', es: 'Inicio', fr: 'Début' },
  'habits.detail.spent': {
    en: 'Spent so far',
    es: 'Gastado hasta hoy',
    fr: 'Dépensé jusqu’ici',
  },
  'habits.detail.bought': {
    en: { one: '{count} bought', other: '{count} bought' },
    es: { one: '{count} comprado', other: '{count} comprados' },
    fr: { one: '{count} acheté', other: '{count} achetés' },
  },
  'habits.detail.skipped': {
    en: { one: '{count} skipped', other: '{count} skipped' },
    es: { one: '{count} sin comprar', other: '{count} sin comprar' },
    fr: { one: '{count} sans achat', other: '{count} sans achat' },
  },
  'habits.detail.tally': {
    en: '{bought} · {skipped}',
    es: '{bought} · {skipped}',
    fr: '{bought} · {skipped}',
  },
  'habits.detail.empty': {
    en: 'No receipts yet. Tap a day you bought it.',
    es: 'Aún no hay recibos. Toca un día en que lo compraste.',
    fr: 'Aucun reçu pour l’instant. Touche un jour où tu l’as acheté.',
  },

  // Editing a receipt filed from a habit.
  'habits.receipt.startedOn': {
    en: '{name} started on {date}.',
    es: '{name} empezó el {date}.',
    fr: '{name} a commencé le {date}.',
  },
  'habits.receipt.dayTaken': {
    en: '{name} already has a receipt on that day.',
    es: '{name} ya tiene un recibo ese día.',
    fr: '{name} a déjà un reçu ce jour-là.',
  },
});

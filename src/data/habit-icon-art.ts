import type { FC } from 'react';
import type { SvgProps } from 'react-native-svg';

/*
 * A module of its own so a component test can stand the drawings in: Jest turns an .svg import
 * into a number, not a component. Relative paths rather than @/assets because Jest maps @/ to
 * src/ only; this way Jest still resolves every file, so a missing drawing fails the registry test.
 */
import EntertainmentBooks from '../../assets/habit-icons/entertainment/books.svg';
import EntertainmentConcerts from '../../assets/habit-icons/entertainment/concerts.svg';
import EntertainmentFunOutings from '../../assets/habit-icons/entertainment/fun-outings.svg';
import EntertainmentGames from '../../assets/habit-icons/entertainment/games.svg';
import EntertainmentMoviesStreaming from '../../assets/habit-icons/entertainment/movies-streaming.svg';
import EntertainmentMusic from '../../assets/habit-icons/entertainment/music.svg';
import EntertainmentParties from '../../assets/habit-icons/entertainment/parties.svg';
import FamilyPetsBabyKids from '../../assets/habit-icons/family-pets/baby-kids.svg';
import FamilyPetsChildcare from '../../assets/habit-icons/family-pets/childcare.svg';
import FamilyPetsDonations from '../../assets/habit-icons/family-pets/donations.svg';
import FamilyPetsPets from '../../assets/habit-icons/family-pets/pets.svg';
import FamilyPetsSchool from '../../assets/habit-icons/family-pets/school.svg';
import FinanceBankFees from '../../assets/habit-icons/finance/bank-fees.svg';
import FinanceCreditCard from '../../assets/habit-icons/finance/credit-card.svg';
import FinanceInsurance from '../../assets/habit-icons/finance/insurance.svg';
import FinanceInvestments from '../../assets/habit-icons/finance/investments.svg';
import FinanceSubscriptions from '../../assets/habit-icons/finance/subscriptions.svg';
import FinanceTaxes from '../../assets/habit-icons/finance/taxes.svg';
import FitnessCycling from '../../assets/habit-icons/fitness/cycling.svg';
import FitnessRunning from '../../assets/habit-icons/fitness/running.svg';
import FitnessSwimming from '../../assets/habit-icons/fitness/swimming.svg';
import FitnessTrackWeight from '../../assets/habit-icons/fitness/track-weight.svg';
import FitnessWorkout from '../../assets/habit-icons/fitness/workout.svg';
import FoodDiningAlcoholNightlife from '../../assets/habit-icons/food-dining/alcohol-nightlife.svg';
import FoodDiningBreakfast from '../../assets/habit-icons/food-dining/breakfast.svg';
import FoodDiningCoffee from '../../assets/habit-icons/food-dining/coffee.svg';
import FoodDiningDinnerOut from '../../assets/habit-icons/food-dining/dinner-out.svg';
import FoodDiningFastFood from '../../assets/habit-icons/food-dining/fast-food.svg';
import FoodDiningGroceries from '../../assets/habit-icons/food-dining/groceries.svg';
import FoodDiningLunchOut from '../../assets/habit-icons/food-dining/lunch-out.svg';
import FoodDiningRestaurant from '../../assets/habit-icons/food-dining/restaurant.svg';
import FoodDiningSnacksSweets from '../../assets/habit-icons/food-dining/snacks-sweets.svg';
import FoodDiningSoftDrinks from '../../assets/habit-icons/food-dining/soft-drinks.svg';
import GoalsBigPurchase from '../../assets/habit-icons/goals/big-purchase.svg';
import GoalsBuyAHome from '../../assets/habit-icons/goals/buy-a-home.svg';
import GoalsEducationFund from '../../assets/habit-icons/goals/education-fund.svg';
import GoalsEmergencyFund from '../../assets/habit-icons/goals/emergency-fund.svg';
import GoalsJustSaving from '../../assets/habit-icons/goals/just-saving.svg';
import GoalsNewCar from '../../assets/habit-icons/goals/new-car.svg';
import GoalsNewGadget from '../../assets/habit-icons/goals/new-gadget.svg';
import GoalsOther from '../../assets/habit-icons/goals/other.svg';
import GoalsPayOffDebt from '../../assets/habit-icons/goals/pay-off-debt.svg';
import GoalsRetirement from '../../assets/habit-icons/goals/retirement.svg';
import GoalsStartABusiness from '../../assets/habit-icons/goals/start-a-business.svg';
import GoalsStartInvesting from '../../assets/habit-icons/goals/start-investing.svg';
import GoalsVacation from '../../assets/habit-icons/goals/vacation.svg';
import GoalsWedding from '../../assets/habit-icons/goals/wedding.svg';
import GoalsWorldTrip from '../../assets/habit-icons/goals/world-trip.svg';
import HealthDental from '../../assets/habit-icons/health/dental.svg';
import HealthDoctorVisit from '../../assets/habit-icons/health/doctor-visit.svg';
import HealthEyeCare from '../../assets/habit-icons/health/eye-care.svg';
import HealthFirstAid from '../../assets/habit-icons/health/first-aid.svg';
import HealthGymMembership from '../../assets/habit-icons/health/gym-membership.svg';
import HealthHealthInsurance from '../../assets/habit-icons/health/health-insurance.svg';
import HealthHospital from '../../assets/habit-icons/health/hospital.svg';
import HealthMedicine from '../../assets/habit-icons/health/medicine.svg';
import HomeBillsCleaning from '../../assets/habit-icons/home-bills/cleaning.svg';
import HomeBillsElectricity from '../../assets/habit-icons/home-bills/electricity.svg';
import HomeBillsFurniture from '../../assets/habit-icons/home-bills/furniture.svg';
import HomeBillsHomeRepairs from '../../assets/habit-icons/home-bills/home-repairs.svg';
import HomeBillsInternet from '../../assets/habit-icons/home-bills/internet.svg';
import HomeBillsLaundry from '../../assets/habit-icons/home-bills/laundry.svg';
import HomeBillsMortgage from '../../assets/habit-icons/home-bills/mortgage.svg';
import HomeBillsPhoneBill from '../../assets/habit-icons/home-bills/phone-bill.svg';
import HomeBillsRent from '../../assets/habit-icons/home-bills/rent.svg';
import HomeBillsWaterBill from '../../assets/habit-icons/home-bills/water-bill.svg';
import LearningGrowthCareForPlants from '../../assets/habit-icons/learning-growth/care-for-plants.svg';
import LearningGrowthJournal from '../../assets/habit-icons/learning-growth/journal.svg';
import LearningGrowthLearnALanguage from '../../assets/habit-icons/learning-growth/learn-a-language.svg';
import LearningGrowthOnlineCourse from '../../assets/habit-icons/learning-growth/online-course.svg';
import LearningGrowthPaintDraw from '../../assets/habit-icons/learning-growth/paint-draw.svg';
import LearningGrowthPlanTheDay from '../../assets/habit-icons/learning-growth/plan-the-day.svg';
import LearningGrowthPracticeMusic from '../../assets/habit-icons/learning-growth/practice-music.svg';
import LearningGrowthRead from '../../assets/habit-icons/learning-growth/read.svg';
import RelationshipsCallFamily from '../../assets/habit-icons/relationships/call-family.svg';
import RelationshipsDateNight from '../../assets/habit-icons/relationships/date-night.svg';
import ShoppingAccessories from '../../assets/habit-icons/shopping/accessories.svg';
import ShoppingClothes from '../../assets/habit-icons/shopping/clothes.svg';
import ShoppingGifts from '../../assets/habit-icons/shopping/gifts.svg';
import ShoppingHairCare from '../../assets/habit-icons/shopping/hair-care.svg';
import ShoppingJewelry from '../../assets/habit-icons/shopping/jewelry.svg';
import ShoppingOnlineShopping from '../../assets/habit-icons/shopping/online-shopping.svg';
import ShoppingPersonalCare from '../../assets/habit-icons/shopping/personal-care.svg';
import ShoppingShoes from '../../assets/habit-icons/shopping/shoes.svg';
import TransportBike from '../../assets/habit-icons/transport/bike.svg';
import TransportBus from '../../assets/habit-icons/transport/bus.svg';
import TransportCar from '../../assets/habit-icons/transport/car.svg';
import TransportFlights from '../../assets/habit-icons/transport/flights.svg';
import TransportParking from '../../assets/habit-icons/transport/parking.svg';
import TransportTaxiRides from '../../assets/habit-icons/transport/taxi-rides.svg';
import TransportTrain from '../../assets/habit-icons/transport/train.svg';
import WellnessBrushTeeth from '../../assets/habit-icons/wellness/brush-teeth.svg';
import WellnessDrinkWater from '../../assets/habit-icons/wellness/drink-water.svg';
import WellnessEatHealthy from '../../assets/habit-icons/wellness/eat-healthy.svg';
import WellnessMeditate from '../../assets/habit-icons/wellness/meditate.svg';
import WellnessPray from '../../assets/habit-icons/wellness/pray.svg';
import WellnessQuitSmoking from '../../assets/habit-icons/wellness/quit-smoking.svg';
import WellnessSleepEarly from '../../assets/habit-icons/wellness/sleep-early.svg';
import WellnessTakeVitamins from '../../assets/habit-icons/wellness/take-vitamins.svg';
import WellnessWakeUpEarly from '../../assets/habit-icons/wellness/wake-up-early.svg';

/** Every habit drawing by icon id. The ids are stored on habits, so a file is never renamed. */
export const HABIT_ICON_ART = {
  'entertainment/books': EntertainmentBooks,
  'entertainment/concerts': EntertainmentConcerts,
  'entertainment/fun-outings': EntertainmentFunOutings,
  'entertainment/games': EntertainmentGames,
  'entertainment/movies-streaming': EntertainmentMoviesStreaming,
  'entertainment/music': EntertainmentMusic,
  'entertainment/parties': EntertainmentParties,
  'family-pets/baby-kids': FamilyPetsBabyKids,
  'family-pets/childcare': FamilyPetsChildcare,
  'family-pets/donations': FamilyPetsDonations,
  'family-pets/pets': FamilyPetsPets,
  'family-pets/school': FamilyPetsSchool,
  'finance/bank-fees': FinanceBankFees,
  'finance/credit-card': FinanceCreditCard,
  'finance/insurance': FinanceInsurance,
  'finance/investments': FinanceInvestments,
  'finance/subscriptions': FinanceSubscriptions,
  'finance/taxes': FinanceTaxes,
  'fitness/cycling': FitnessCycling,
  'fitness/running': FitnessRunning,
  'fitness/swimming': FitnessSwimming,
  'fitness/track-weight': FitnessTrackWeight,
  'fitness/workout': FitnessWorkout,
  'food-dining/alcohol-nightlife': FoodDiningAlcoholNightlife,
  'food-dining/breakfast': FoodDiningBreakfast,
  'food-dining/coffee': FoodDiningCoffee,
  'food-dining/dinner-out': FoodDiningDinnerOut,
  'food-dining/fast-food': FoodDiningFastFood,
  'food-dining/groceries': FoodDiningGroceries,
  'food-dining/lunch-out': FoodDiningLunchOut,
  'food-dining/restaurant': FoodDiningRestaurant,
  'food-dining/snacks-sweets': FoodDiningSnacksSweets,
  'food-dining/soft-drinks': FoodDiningSoftDrinks,
  'goals/big-purchase': GoalsBigPurchase,
  'goals/buy-a-home': GoalsBuyAHome,
  'goals/education-fund': GoalsEducationFund,
  'goals/emergency-fund': GoalsEmergencyFund,
  'goals/just-saving': GoalsJustSaving,
  'goals/new-car': GoalsNewCar,
  'goals/new-gadget': GoalsNewGadget,
  'goals/other': GoalsOther,
  'goals/pay-off-debt': GoalsPayOffDebt,
  'goals/retirement': GoalsRetirement,
  'goals/start-a-business': GoalsStartABusiness,
  'goals/start-investing': GoalsStartInvesting,
  'goals/vacation': GoalsVacation,
  'goals/wedding': GoalsWedding,
  'goals/world-trip': GoalsWorldTrip,
  'health/dental': HealthDental,
  'health/doctor-visit': HealthDoctorVisit,
  'health/eye-care': HealthEyeCare,
  'health/first-aid': HealthFirstAid,
  'health/gym-membership': HealthGymMembership,
  'health/health-insurance': HealthHealthInsurance,
  'health/hospital': HealthHospital,
  'health/medicine': HealthMedicine,
  'home-bills/cleaning': HomeBillsCleaning,
  'home-bills/electricity': HomeBillsElectricity,
  'home-bills/furniture': HomeBillsFurniture,
  'home-bills/home-repairs': HomeBillsHomeRepairs,
  'home-bills/internet': HomeBillsInternet,
  'home-bills/laundry': HomeBillsLaundry,
  'home-bills/mortgage': HomeBillsMortgage,
  'home-bills/phone-bill': HomeBillsPhoneBill,
  'home-bills/rent': HomeBillsRent,
  'home-bills/water-bill': HomeBillsWaterBill,
  'learning-growth/care-for-plants': LearningGrowthCareForPlants,
  'learning-growth/journal': LearningGrowthJournal,
  'learning-growth/learn-a-language': LearningGrowthLearnALanguage,
  'learning-growth/online-course': LearningGrowthOnlineCourse,
  'learning-growth/paint-draw': LearningGrowthPaintDraw,
  'learning-growth/plan-the-day': LearningGrowthPlanTheDay,
  'learning-growth/practice-music': LearningGrowthPracticeMusic,
  'learning-growth/read': LearningGrowthRead,
  'relationships/call-family': RelationshipsCallFamily,
  'relationships/date-night': RelationshipsDateNight,
  'shopping/accessories': ShoppingAccessories,
  'shopping/clothes': ShoppingClothes,
  'shopping/gifts': ShoppingGifts,
  'shopping/hair-care': ShoppingHairCare,
  'shopping/jewelry': ShoppingJewelry,
  'shopping/online-shopping': ShoppingOnlineShopping,
  'shopping/personal-care': ShoppingPersonalCare,
  'shopping/shoes': ShoppingShoes,
  'transport/bike': TransportBike,
  'transport/bus': TransportBus,
  'transport/car': TransportCar,
  'transport/flights': TransportFlights,
  'transport/parking': TransportParking,
  'transport/taxi-rides': TransportTaxiRides,
  'transport/train': TransportTrain,
  'wellness/brush-teeth': WellnessBrushTeeth,
  'wellness/drink-water': WellnessDrinkWater,
  'wellness/eat-healthy': WellnessEatHealthy,
  'wellness/meditate': WellnessMeditate,
  'wellness/pray': WellnessPray,
  'wellness/quit-smoking': WellnessQuitSmoking,
  'wellness/sleep-early': WellnessSleepEarly,
  'wellness/take-vitamins': WellnessTakeVitamins,
  'wellness/wake-up-early': WellnessWakeUpEarly,
} satisfies Record<string, FC<SvgProps>>;

export type HabitIconId = keyof typeof HABIT_ICON_ART;

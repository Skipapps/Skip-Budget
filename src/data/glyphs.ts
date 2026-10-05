import {
  AppWindow,
  Car,
  ChefHat,
  Clapperboard,
  Coffee,
  Droplets,
  Dumbbell,
  Fuel,
  GraduationCap,
  HeartPulse,
  House,
  IdCard,
  Landmark,
  Laptop,
  Music,
  Newspaper,
  PawPrint,
  Pill,
  Plane,
  ReceiptText,
  Shirt,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Sofa,
  Sparkles,
  Trash2,
  Tv,
  Users,
  Utensils,
  Wifi,
  Zap,
  type LucideIcon,
} from 'lucide-react-native';

export type Glyph = LucideIcon;

/**
 * Every glyph a bill, group or spending category can wear, keyed by the id stored against it. One
 * table so the same idea (Insurance, say) is drawn the same way everywhere.
 */
export const GLYPHS: Record<string, Glyph> = {
  // Bill categories.
  housing: House,
  energy: Zap,
  water: Droplets,
  internet: Wifi,
  mobile: Smartphone,
  insurance: ShieldCheck,
  loans: Landmark,
  transport: Car,
  family: Users,
  other: ReceiptText,

  // Icons offered for a bill someone names themselves, and for groups.
  education: GraduationCap,
  pets: PawPrint,
  tv: Tv,
  shopping: ShoppingBag,
  travel: Plane,
  coffee: Coffee,
  music: Music,
  waste: Trash2,
  software: AppWindow,
  health: HeartPulse,

  // Spending categories — receipts and subscriptions share the ledger's mark.
  groceries: ShoppingCart,
  dining: Utensils,
  fuel: Fuel,
  pharmacy: Pill,
  clothing: Shirt,
  electronics: Laptop,
  home: Sofa,
  beauty: Sparkles,
  entertainment: Clapperboard,
  fitness: Dumbbell,
  news: Newspaper,
  meals: ChefHat,
  memberships: IdCard,
  utilities: Zap,
  telecom: Smartphone,
  finance: Landmark,
};

/** The neutral glyph: a bill, for anything filed under Other or not known. */
export const FALLBACK_GLYPH: Glyph = ReceiptText;

/** Stroke for every glyph, matching the app's other Lucide icons. */
export const GLYPH_STROKE = 1.8;

export function glyphFor(id: string | null | undefined): Glyph | undefined {
  return id && Object.hasOwn(GLYPHS, id) ? GLYPHS[id] : undefined;
}

import type { ImageSourcePropType } from 'react-native';

/**
 * The faces someone can pick for their account.
 *
 * Bundled with the app rather than uploaded, which is the whole design: the
 * profile stores an id, nothing leaves the phone, and there is no bucket,
 * permission prompt or crop step between wanting a picture and having one.
 *
 * Generated from "Skip assets/Avatar icons". `require` takes a literal path,
 * so this list is written out rather than built from a directory read.
 */

export type Avatar = {
  id: string;
  /** Read aloud by a screen reader, so it describes the drawing. */
  label: string;
  source: ImageSourcePropType;
};

export const AVATARS: Avatar[] = [
  {
    id: 'afro-hair-sunglasses',
    label: 'Afro Hair Sunglasses',
    source: require('@/assets/avatars/afro-hair-sunglasses.png'),
  },
  {
    id: 'athlete-character-headband',
    label: 'Athlete Character Headband',
    source: require('@/assets/avatars/athlete-character-headband.png'),
  },
  {
    id: 'basketball-player-sport',
    label: 'Basketball Player Sport',
    source: require('@/assets/avatars/basketball-player-sport.png'),
  },
  {
    id: 'bearded-male-hipster',
    label: 'Bearded Male Hipster',
    source: require('@/assets/avatars/bearded-male-hipster.png'),
  },
  {
    id: 'blonde-hair-sunglasses',
    label: 'Blonde Hair Sunglasses',
    source: require('@/assets/avatars/blonde-hair-sunglasses.png'),
  },
  {
    id: 'doctor-medical',
    label: 'Doctor Medical',
    source: require('@/assets/avatars/doctor-medical.png'),
  },
  {
    id: 'edgy-male-youth',
    label: 'Edgy Male Youth',
    source: require('@/assets/avatars/edgy-male-youth.png'),
  },
  {
    id: 'elegant-female-performer',
    label: 'Elegant Female Performer',
    source: require('@/assets/avatars/elegant-female-performer.png'),
  },
  {
    id: 'emo-style-hair',
    label: 'Emo Style Hair',
    source: require('@/assets/avatars/emo-style-hair.png'),
  },
  {
    id: 'female-call-center-agent',
    label: 'Female Call Center Agent',
    source: require('@/assets/avatars/female-call-center-agent.png'),
  },
  {
    id: 'female-medical-professional',
    label: 'Female Medical Professional',
    source: require('@/assets/avatars/female-medical-professional.png'),
  },
  {
    id: 'female-police-officer',
    label: 'Female Police Officer',
    source: require('@/assets/avatars/female-police-officer.png'),
  },
  {
    id: 'firefighter-service-professional',
    label: 'Firefighter Service Professional',
    source: require('@/assets/avatars/firefighter-service-professional.png'),
  },
  {
    id: 'geeky-male-student',
    label: 'Geeky Male Student',
    source: require('@/assets/avatars/geeky-male-student.png'),
  },
  {
    id: 'geeky-professional-office',
    label: 'Geeky Professional Office',
    source: require('@/assets/avatars/geeky-professional-office.png'),
  },
  {
    id: 'gentleman-bowler-hat',
    label: 'Gentleman Bowler Hat',
    source: require('@/assets/avatars/gentleman-bowler-hat.png'),
  },
  {
    id: 'gentleman-dapper-bow-tie',
    label: 'Gentleman Dapper Bow Tie',
    source: require('@/assets/avatars/gentleman-dapper-bow-tie.png'),
  },
  { id: 'hipster-man', label: 'Hipster Man', source: require('@/assets/avatars/hipster-man.png') },
  {
    id: 'male-call-center-agent',
    label: 'Male Call Center Agent',
    source: require('@/assets/avatars/male-call-center-agent.png'),
  },
  {
    id: 'male-doctor-professional',
    label: 'Male Doctor Professional',
    source: require('@/assets/avatars/male-doctor-professional.png'),
  },
  {
    id: 'nautical-sailor-professional',
    label: 'Nautical Sailor Professional',
    source: require('@/assets/avatars/nautical-sailor-professional.png'),
  },
  {
    id: 'professional-airline-pilot',
    label: 'Professional Airline Pilot',
    source: require('@/assets/avatars/professional-airline-pilot.png'),
  },
  {
    id: 'professional-chef-cook',
    label: 'Professional Chef Cook',
    source: require('@/assets/avatars/professional-chef-cook.png'),
  },
  {
    id: 'racing-driver-professional',
    label: 'Racing Driver Professional',
    source: require('@/assets/avatars/racing-driver-professional.png'),
  },
  {
    id: 'rasta-hat-character',
    label: 'Rasta Hat Character',
    source: require('@/assets/avatars/rasta-hat-character.png'),
  },
  {
    id: 'religious-christian-priest',
    label: 'Religious Christian Priest',
    source: require('@/assets/avatars/religious-christian-priest.png'),
  },
  {
    id: 'scuba-diver-adventure',
    label: 'Scuba Diver Adventure',
    source: require('@/assets/avatars/scuba-diver-adventure.png'),
  },
  {
    id: 'star-hat-character',
    label: 'Star Hat Character',
    source: require('@/assets/avatars/star-hat-character.png'),
  },
  {
    id: 'stealth-ninja-character',
    label: 'Stealth Ninja Character',
    source: require('@/assets/avatars/stealth-ninja-character.png'),
  },
  {
    id: 'tall-red-hat',
    label: 'Tall Red Hat',
    source: require('@/assets/avatars/tall-red-hat.png'),
  },
  {
    id: 'tired-office-worker',
    label: 'Tired Office Worker',
    source: require('@/assets/avatars/tired-office-worker.png'),
  },
  {
    id: 'tourist-photographer-hobby',
    label: 'Tourist Photographer Hobby',
    source: require('@/assets/avatars/tourist-photographer-hobby.png'),
  },
  {
    id: 'traditional-cultural-man',
    label: 'Traditional Cultural Man',
    source: require('@/assets/avatars/traditional-cultural-man.png'),
  },
  {
    id: 'traditional-indian-male',
    label: 'Traditional Indian Male',
    source: require('@/assets/avatars/traditional-indian-male.png'),
  },
];

/** The chosen avatar, or null for an id the app no longer ships. */
export function findAvatar(id: string | null | undefined): Avatar | null {
  if (!id) return null;
  return AVATARS.find((avatar) => avatar.id === id) ?? null;
}

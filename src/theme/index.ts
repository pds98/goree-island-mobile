/**
 * Jetons de design repris des maquettes validées (style afro-contemporain).
 *
 * Deux couleurs structurent l'app :
 *   - BLEU OCÉAN   → parcours 1, la traversée en chaloupe
 *   - TERRACOTTA   → parcours 2, la visite de l'île
 * L'ocre et le bougainvillier servent d'accents (étiquettes, pack Premium).
 */

export const couleurs = {
  sable: '#FFF4E2',        // fond principal
  sableFonce: '#F2E3CB',   // fonds secondaires, segments
  sableCarte: '#FFFBF3',
  bordure: '#EBD9BF',
  bordureForte: '#CDB89A',
  encre: '#1A1410',        // texte principal, écrans sombres
  encreDouce: '#3D3128',
  gris: '#5B4A3C',         // texte secondaire (contraste AA sur sable)
  blanc: '#FFFFFF',

  ocean: '#17408B',        // PARCOURS CHALOUPE
  oceanClair: '#DCE6F7',
  oceanFonce: '#0F2E66',

  terracotta: '#C4401F',   // PARCOURS ÎLE
  terracottaClair: '#FBE1D6',
  terracottaFonce: '#9C3116',

  ocre: '#F4B41A',
  ocreClair: '#FDEFC8',
  bougainvillier: '#B8186A',
  vert: '#1B7F4B',
  vertClair: '#DDF1E4',
  rouge: '#C62828',
} as const;

/** Familles chargées dans le _layout racine via @expo-google-fonts. */
export const polices = {
  titre: 'BricolageGrotesque_800ExtraBold',
  titreMoyen: 'BricolageGrotesque_600SemiBold',
  texte: 'Outfit_400Regular',
  texteMoyen: 'Outfit_500Medium',
  texteGras: 'Outfit_700Bold',
} as const;

export const espace = { xs: 4, s: 8, m: 12, l: 16, xl: 20, xxl: 28 } as const;
export const rayon = { s: 10, m: 14, l: 18, xl: 22 } as const;

/** Taille minimale d'une zone tactile (accessibilité). */
export const TAILLE_TACTILE = 48;

/** Icônes au trait (SVG), reprises des maquettes — jamais d'emoji. */
import type { ColorValue } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

type P = { couleur: ColorValue; taille?: number };

export const IconeBateau = ({ couleur, taille = 24 }: P) => (
  <Svg width={taille} height={taille} viewBox="0 0 24 24" fill="none" stroke={couleur}
    strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M3 15l2 4h14l2-4z" /><Path d="M6 15V9h12v6" /><Path d="M9 9V6h6v3" />
  </Svg>
);

export const IconeLieu = ({ couleur, taille = 24 }: P) => (
  <Svg width={taille} height={taille} viewBox="0 0 24 24" fill="none" stroke={couleur} strokeWidth={1.8}>
    <Path d="M12 21s-7-6-7-11a7 7 0 0114 0c0 5-7 11-7 11z" /><Circle cx={12} cy={10} r={2.5} />
  </Svg>
);

export const IconeAccueil = ({ couleur, taille = 24 }: P) => (
  <Svg width={taille} height={taille} viewBox="0 0 24 24" fill="none" stroke={couleur} strokeWidth={1.8}>
    <Path d="M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z" />
  </Svg>
);

export const IconeBillet = ({ couleur, taille = 24 }: P) => (
  <Svg width={taille} height={taille} viewBox="0 0 24 24" fill="none" stroke={couleur} strokeWidth={1.8}>
    <Path d="M3 8a2 2 0 002-2h14a2 2 0 002 2v2a2 2 0 000 4v2a2 2 0 00-2 2H5a2 2 0 00-2-2v-2a2 2 0 000-4z" />
  </Svg>
);

export const IconeCasque = ({ couleur, taille = 24 }: P) => (
  <Svg width={taille} height={taille} viewBox="0 0 24 24" fill="none" stroke={couleur} strokeWidth={2}>
    <Path d="M4 14v-2a8 8 0 0116 0v2" /><Rect x={3} y={14} width={4} height={6} rx={1.5} />
    <Rect x={17} y={14} width={4} height={6} rx={1.5} />
  </Svg>
);

export const IconeCircuit = ({ couleur, taille = 24 }: P) => (
  <Svg width={taille} height={taille} viewBox="0 0 24 24" fill="none" stroke={couleur} strokeWidth={2}
    strokeLinecap="round">
    <Circle cx={6} cy={19} r={2} /><Circle cx={18} cy={5} r={2} />
    <Path d="M8 19h8a3 3 0 000-6H8a3 3 0 010-6h8" />
  </Svg>
);

export const IconeGuide = ({ couleur, taille = 24 }: P) => (
  <Svg width={taille} height={taille} viewBox="0 0 24 24" fill="none" stroke={couleur} strokeWidth={2}>
    <Circle cx={9} cy={8} r={3.5} /><Path d="M3 20c0-3 3-5 6-5s6 2 6 5" />
    <Path d="M16 4a3.5 3.5 0 010 7M18 15c2 .5 3 2.3 3 5" />
  </Svg>
);

export const IconeResto = ({ couleur, taille = 24 }: P) => (
  <Svg width={taille} height={taille} viewBox="0 0 24 24" fill="none" stroke={couleur} strokeWidth={2}
    strokeLinecap="round">
    <Path d="M4 11h16M6 11a6 6 0 0012 0M12 5v2M3 19h18" />
  </Svg>
);

export const IconeHotel = ({ couleur, taille = 24 }: P) => (
  <Svg width={taille} height={taille} viewBox="0 0 24 24" fill="none" stroke={couleur} strokeWidth={2}>
    <Path d="M3 20V9l9-5 9 5v11" /><Path d="M9 20v-6h6v6" />
  </Svg>
);

export const IconeCouches = ({ couleur, taille = 24 }: P) => (
  <Svg width={taille} height={taille} viewBox="0 0 24 24" fill="none" stroke={couleur} strokeWidth={2}>
    <Path d="M12 3l8 4-8 4-8-4z" /><Path d="M4 12l8 4 8-4M4 17l8 4 8-4" />
  </Svg>
);

export const IconeCoche = ({ couleur, taille = 20 }: P) => (
  <Svg width={taille} height={taille} viewBox="0 0 24 24" fill="none" stroke={couleur} strokeWidth={2.4}
    strokeLinecap="round"><Path d="M5 12l5 5 9-10" /></Svg>
);

export const IconeCloche = ({ couleur, taille = 22 }: P) => (
  <Svg width={taille} height={taille} viewBox="0 0 24 24" fill="none" stroke={couleur} strokeWidth={1.9}
    strokeLinecap="round">
    <Path d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9" /><Path d="M10 21a2 2 0 004 0" />
  </Svg>
);

/**
 * Spots photo de Gorée — les plus belles vues, avec le meilleur moment.
 *
 * Les coordonnées sont APPROXIMATIVES (à affiner sur place) : elles servent
 * uniquement à proposer le nom du lieu sur le cadre quand le visiteur est à
 * moins de RAYON_M d'un spot. La position n'est jamais envoyée au serveur.
 *
 * `memoire: true` = lieu de mémoire : les cadres décoratifs sont désactivés
 * et seul le cadre « Sobre » reste proposé, avec un rappel de respect.
 */
import type { Cles } from '@/i18n';

export type Spot = {
  id: string;
  nom: string;              // nom propre, identique dans toutes les langues
  conseil: Cles;            // meilleur moment / astuce de cadrage
  lat: number;
  lon: number;
  memoire?: boolean;
};

export const SPOTS: Spot[] = [
  { id: 'jetee', nom: 'Jetée de Gorée', conseil: 'spotJetee', lat: 14.6694, lon: -17.3971 },
  { id: 'castel', nom: 'Le Castel', conseil: 'spotCastel', lat: 14.6630, lon: -17.3991 },
  { id: 'ruelles', nom: 'Ruelles colorées', conseil: 'spotRuelles', lat: 14.6680, lon: -17.3982 },
  { id: 'plage', nom: 'Plage de Gorée', conseil: 'spotPlage', lat: 14.6688, lon: -17.3966 },
  { id: 'estrees', nom: "Fort d'Estrées", conseil: 'spotEstrees', lat: 14.6716, lon: -17.3979 },
  { id: 'esclaves', nom: 'Maison des Esclaves', conseil: 'spotEsclaves', lat: 14.6672, lon: -17.3988, memoire: true },
];

export const LIEU_PAR_DEFAUT = 'Gorée · Sénégal';
const RAYON_M = 120;

/** Spot le plus proche (à moins de RAYON_M), sinon undefined. */
export function spotProche(lat: number, lon: number): Spot | undefined {
  let meilleur: { s: Spot; d: number } | undefined;
  for (const s of SPOTS) {
    // Distance équirectangulaire : largement assez précise sur 1 km².
    const x = (s.lon - lon) * Math.cos(((s.lat + lat) / 2) * Math.PI / 180);
    const d = Math.hypot(x, s.lat - lat) * 111_320;
    if (d <= RAYON_M && (!meilleur || d < meilleur.d)) meilleur = { s, d };
  }
  return meilleur?.s;
}

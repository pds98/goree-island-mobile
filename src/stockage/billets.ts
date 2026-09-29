/**
 * Les billets achetés sont gardés SUR LE TÉLÉPHONE : le QR s'affiche même
 * sans réseau (embarcadère, traversée). Le jeton est signé côté serveur et
 * ne contient aucune donnée personnelle.
 *
 * Pourquoi AsyncStorage et pas SecureStore ? SecureStore ne fonctionne pas
 * sur le web et certaines versions d'iOS refusent les valeurs > 2 Ko ; une
 * liste de billets dépasse vite cette taille.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Billet } from '@/api/types';

const CLE = 'goree.billets.v1';

export interface BilletStocke {
  billet: Billet;
  telephone: string;      // preuve de possession exigée par l'API (mode invité)
  titulaire: string;
  enregistreLe: string;
}

export async function lireBillets(): Promise<BilletStocke[]> {
  try {
    const brut = await AsyncStorage.getItem(CLE);
    return brut ? (JSON.parse(brut) as BilletStocke[]) : [];
  } catch {
    return [];
  }
}

export async function enregistrerBillets(nouveaux: BilletStocke[]): Promise<void> {
  const existants = await lireBillets();
  const parNumero = new Map(existants.map((b) => [b.billet.numero, b]));
  for (const b of nouveaux) parNumero.set(b.billet.numero, b);
  await AsyncStorage.setItem(CLE, JSON.stringify([...parNumero.values()]));
}

export async function trouverBillet(numero: string): Promise<BilletStocke | undefined> {
  return (await lireBillets()).find((b) => b.billet.numero === numero);
}

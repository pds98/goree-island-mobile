/**
 * File d'attente des avis rédigés SANS RÉSEAU (traversée, embarcadère) :
 * l'avis est gardé sur le téléphone puis envoyé automatiquement au retour
 * de la connexion (à l'ouverture de l'écran Avis ou de l'app).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { envoyerRetour, ErreurApiClient } from '@/api/client';
import type { NouveauRetour } from '@/api/types';

const CLE = 'goree.retours.attente.v1';

async function lire(): Promise<NouveauRetour[]> {
  try {
    const brut = await AsyncStorage.getItem(CLE);
    return brut ? (JSON.parse(brut) as NouveauRetour[]) : [];
  } catch {
    return [];
  }
}

export async function mettreEnAttente(retour: NouveauRetour): Promise<void> {
  await AsyncStorage.setItem(CLE, JSON.stringify([...(await lire()).slice(-9), retour]));
}

/** Envoie ce qui attendait ; garde seulement ce qui a échoué faute de réseau. */
export async function envoyerEnAttente(): Promise<number> {
  const attente = await lire();
  if (!attente.length) return 0;
  const restants: NouveauRetour[] = [];
  let envoyes = 0;
  for (const retour of attente) {
    try {
      await envoyerRetour(retour);
      envoyes += 1;
    } catch (e) {
      // Pas de réseau : on réessaiera. Refus du serveur (validation, quota) : abandon.
      if (e instanceof ErreurApiClient && e.statut === 0) restants.push(retour);
    }
  }
  await AsyncStorage.setItem(CLE, JSON.stringify(restants));
  return envoyes;
}

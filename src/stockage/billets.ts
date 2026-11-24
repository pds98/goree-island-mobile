/**
 * Les billets achetés sont gardés SUR LE TÉLÉPHONE : le QR s'affiche même
 * sans réseau (embarcadère, traversée). Le jeton est signé côté serveur et
 * ne contient aucune donnée personnelle.
 *
 * Pourquoi AsyncStorage et pas SecureStore ? SecureStore ne fonctionne pas
 * sur le web et certaines versions d'iOS refusent les valeurs > 2 Ko ; une
 * liste de billets dépasse vite cette taille.
 *
 * En plus du billet officiel, le téléphone garde des informations PERSO :
 *   - `nom`  : nom choisi par le visiteur (« Visite avec maman ») ;
 *   - `vuLe` : date de première consultation → pastille « nouveaux billets ».
 * Supprimer un billet le retire de CE téléphone seulement : il reste valable
 * côté serveur (on peut le retrouver avec son numéro et le téléphone d'achat).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

import type { Billet } from '@/api/types';

const CLE = 'goree.billets.v1';

export interface BilletStocke {
  billet: Billet;
  telephone: string;      // preuve de possession exigée par l'API (mode invité)
  titulaire: string;
  enregistreLe: string;
  nom?: string;           // nom personnalisé (facultatif)
  vuLe?: string;          // absent → billet « nouveau » (pastille de l'onglet)
}

// --- Abonnements -----------------------------------------------------------------
// `nouveaux` : un billet jamais vu sur ce téléphone vient d'être ajouté (achat).
// `changement` : toute modification (ajout, renommage, suppression, consultation).
const abonnesNouveaux = new Set<() => void>();
const abonnesChangement = new Set<() => void>();

/** S'abonner aux NOUVEAUX billets (achat) ; renvoie la fonction de désabonnement. */
export function surNouveauxBillets(rappel: () => void): () => void {
  abonnesNouveaux.add(rappel);
  return () => { abonnesNouveaux.delete(rappel); };
}

/** S'abonner à toute modification de la liste ; renvoie la fonction de désabonnement. */
export function surChangementBillets(rappel: () => void): () => void {
  abonnesChangement.add(rappel);
  return () => { abonnesChangement.delete(rappel); };
}

// --- Lecture / écriture ------------------------------------------------------------

export async function lireBillets(): Promise<BilletStocke[]> {
  try {
    const brut = await AsyncStorage.getItem(CLE);
    return brut ? (JSON.parse(brut) as BilletStocke[]) : [];
  } catch {
    return [];
  }
}

async function ecrire(liste: BilletStocke[]): Promise<void> {
  await AsyncStorage.setItem(CLE, JSON.stringify(liste));
  abonnesChangement.forEach((rappel) => rappel());
}

/**
 * Ajoute ou met à jour des billets. Les informations perso déjà connues
 * (nom, consultation) sont CONSERVÉES quand le billet est rafraîchi depuis l'API.
 */
export async function enregistrerBillets(nouveaux: BilletStocke[]): Promise<void> {
  const existants = await lireBillets();
  const parNumero = new Map(existants.map((b) => [b.billet.numero, b]));
  let ajout = false;
  for (const b of nouveaux) {
    const ancien = parNumero.get(b.billet.numero);
    if (!ancien) ajout = true;
    parNumero.set(b.billet.numero, { ...b, nom: b.nom ?? ancien?.nom, vuLe: b.vuLe ?? ancien?.vuLe });
  }
  await ecrire([...parNumero.values()]);
  if (ajout) abonnesNouveaux.forEach((rappel) => rappel());
}

export async function trouverBillet(numero: string): Promise<BilletStocke | undefined> {
  return (await lireBillets()).find((b) => b.billet.numero === numero);
}

/** Donne un nom personnel à un billet (chaîne vide → nom effacé). */
export async function renommerBillet(numero: string, nom: string): Promise<void> {
  const propre = nom.trim().slice(0, 40);
  await ecrire((await lireBillets()).map((b) => (b.billet.numero === numero
    ? { ...b, nom: propre || undefined } : b)));
}

/** Retire un billet de ce téléphone ; renvoie la copie retirée (pour « Annuler »). */
export async function supprimerBillet(numero: string): Promise<BilletStocke | undefined> {
  const liste = await lireBillets();
  const retire = liste.find((b) => b.billet.numero === numero);
  await ecrire(liste.filter((b) => b.billet.numero !== numero));
  return retire;
}

/** Remet un billet retiré (bouton « Annuler »), sans le compter comme nouveau. */
export async function restaurerBillet(b: BilletStocke): Promise<void> {
  const liste = await lireBillets();
  if (!liste.some((x) => x.billet.numero === b.billet.numero)) await ecrire([...liste, b]);
}

/** Marque tous les billets comme consultés (ouverture de l'onglet Billets). */
export async function marquerBilletsVus(): Promise<void> {
  const liste = await lireBillets();
  if (liste.every((b) => b.vuLe)) return;
  const maintenant = new Date().toISOString();
  await ecrire(liste.map((b) => (b.vuLe ? b : { ...b, vuLe: maintenant })));
}

/** Nombre de billets pas encore consultés, tenu à jour (pastille de l'onglet). */
export function useBilletsNonVus(): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    let actif = true;
    const compter = () => {
      void lireBillets().then((l) => { if (actif) setN(l.filter((b) => !b.vuLe).length); });
    };
    compter();
    const desabonner = surChangementBillets(compter);
    return () => { actif = false; desabonner(); };
  }, []);
  return n;
}

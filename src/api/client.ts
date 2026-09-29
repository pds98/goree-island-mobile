/**
 * Client HTTP de l'API Gorée Island.
 *
 * L'adresse de l'API vient de EXPO_PUBLIC_API_URL (fichier .env). Sur un
 * téléphone, « localhost » désigne le téléphone lui-même : il faut mettre
 * l'adresse IP du Mac sur le réseau Wi-Fi, ex. http://192.168.1.20:8000
 */
import { Platform } from 'react-native';

import type {
  Circuit, Commande, MoyenPaiement, NomPack, Partenaire, ReponseAudio, Rotation, Trajet,
  Verification, Billet,
} from './types';

export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000').replace(/\/$/, '');

/** Erreur levée pour toute réponse non 2xx ; `code` = code métier de l'API. */
export class ErreurApiClient extends Error {
  constructor(public code: string, message: string, public statut: number) {
    super(message);
  }
}

async function requete<T>(chemin: string, init: RequestInit = {}): Promise<T> {
  let reponse: Response;
  try {
    reponse = await fetch(`${API_URL}/api/v3${chemin}`, init);
  } catch {
    throw new ErreurApiClient('RESEAU', 'Connexion impossible. Réessaie.', 0);
  }
  const corps = await reponse.json().catch(() => ({}));
  if (!reponse.ok) {
    // FastAPI renvoie {code, message} pour nos erreurs métier, {detail} pour la validation.
    const message = corps.message ?? (Array.isArray(corps.detail) ? corps.detail[0]?.msg : corps.detail)
      ?? `Erreur ${reponse.status}`;
    throw new ErreurApiClient(corps.code ?? 'ERREUR', message, reponse.status);
  }
  return corps as T;
}

const json = (corps: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(corps),
});

/**
 * Heure et date « de Dakar » d'un horodatage ISO, quel que soit le fuseau
 * dans lequel le serveur l'a écrit (ex. "2026-09-29T05:00:00-04:00" → "09:00").
 * Dakar est à UTC+0 toute l'année, sans heure d'été.
 */
export const heureDakar = (iso: string) => new Date(iso).toISOString().slice(11, 16);
export const dateDakar = (iso: string) => new Date(iso).toISOString().slice(0, 10);

/** Date du jour au format AAAA-MM-JJ (Dakar = UTC+0 toute l'année). */
export function aujourdHui(decalageJours = 0): string {
  const d = new Date(Date.now() + decalageJours * 86_400_000);
  return d.toISOString().slice(0, 10);
}

// --- Parcours 1 : chaloupe ------------------------------------------------------

export const listerRotations = () => requete<Rotation[]>('/rotations');

export const acheterChaloupe = (a: {
  nom: string; telephone: string; date_visite: string; trajet: Trajet;
  passagers: number; rotation_id?: string | null; moyen_paiement: MoyenPaiement;
}) => requete<Commande>('/chaloupe/commandes', json(a));

// --- Parcours 2 : entrée du site -------------------------------------------------

/**
 * Envoie la photo de la CNI et le selfie (multipart). En mode démo, le
 * numéro de CNI est saisi à la main à la place de l'OCR.
 */
export async function verifierIdentite(p: {
  uriCni: string; uriSelfie: string; numeroCni: string; nom: string;
}): Promise<Verification> {
  const form = new FormData();
  await ajouterFichier(form, 'image_cni', p.uriCni, 'cni.jpg');
  await ajouterFichier(form, 'selfie', p.uriSelfie, 'selfie.jpg');
  form.append('numero_cni', p.numeroCni);
  form.append('nom', p.nom);
  return requete<Verification>('/identite/verifications', { method: 'POST', body: form });
}

async function ajouterFichier(form: FormData, champ: string, uri: string, nom: string) {
  if (Platform.OS === 'web') {
    // Sur le web, la caméra renvoie une data-URI : on la convertit en Blob.
    const blob = await (await fetch(uri)).blob();
    form.append(champ, blob, nom);
  } else {
    // Sur iOS/Android, React Native accepte cet objet {uri, name, type}.
    form.append(champ, { uri, name: nom, type: 'image/jpeg' } as unknown as Blob);
  }
}

export const acheterEntreeSite = (a: {
  nom: string; telephone: string; date_visite: string; verification_id?: string | null;
  adultes_supp: number; enfants: number; pack: NomPack; moyen_paiement: MoyenPaiement;
}) => requete<Commande>('/site/commandes', json(a));

// --- Mon billet -------------------------------------------------------------------

export const lireBillet = (numero: string, telephone: string) =>
  requete<Billet>(`/billets/${encodeURIComponent(numero)}?telephone=${encodeURIComponent(telephone)}`);

export const reporterBillet = (numero: string, telephone: string, nouvelle_date: string) =>
  requete<Billet>(`/billets/${encodeURIComponent(numero)}/report`, json({ telephone, nouvelle_date }));

export const annoncerRetour = (numero: string, telephone: string, rotation_id: string) =>
  requete<{ rotation: string; retours_annonces: number }>(
    `/billets/${encodeURIComponent(numero)}/retour`, json({ telephone, rotation_id }));

// --- Sur l'île -------------------------------------------------------------------------

export const listerCircuits = () => requete<Circuit[]>('/circuits');

export const positionAudio = (p: {
  numero: string; telephone: string; lat: number; lon: number; langue: string;
}) => requete<ReponseAudio>('/audio/position', json(p));

export const listerPartenaires = (type?: Partenaire['type']) =>
  requete<Partenaire[]>(`/partenaires${type ? `?type=${type}` : ''}`);

export const reserver = (r: {
  numero: string; telephone: string; partenaire_id: string; description: string;
  montant: number; moyen_paiement: MoyenPaiement;
}) => requete<{ reservation_id: string; statut: string; montant: number }>('/reservations', json(r));

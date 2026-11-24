/**
 * API du compte (facultatif) : jeton de session envoyé en « Authorization: Bearer ».
 * Le jeton est rangé dans le trousseau sécurisé du téléphone (SecureStore) ;
 * sur la version web (pas de trousseau), dans le stockage local du navigateur.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { API_URL, ErreurApiClient } from '@/api/client';
import type { Billet } from '@/api/types';

const CLE_JETON = 'goree.compte.jeton';

export type Profil = 'VISITEUR' | 'PARTENAIRE';
export type TypePartenaireCandidature = 'GUIDE' | 'RESTAURANT' | 'HOTEL';
export type StatutCandidature = 'EN_ATTENTE' | 'COMPLEMENT' | 'APPROUVEE' | 'REFUSEE';

export interface DocumentCandidature { id: string; nom: string; type: string }

export interface Candidature {
  id: string;
  type: TypePartenaireCandidature;
  nom_activite: string;
  responsable: string;
  telephone: string;
  email: string;
  description: string;
  langues: string;
  tarif: string;
  details: Record<string, string>;
  documents: DocumentCandidature[];
  statut: StatutCandidature;
  motif: string;
  cree_le: string;
  maj_le: string;
}

export interface Compte {
  id: string;
  profil: Profil;
  email: string | null;
  nom: string;
  telephone: string | null;
  langue: string;
  apple: boolean;
  candidature?: Candidature | null;
}

export interface Session { jeton: string; compte: Compte }

// --- Jeton ------------------------------------------------------------------------

export async function lireJeton(): Promise<string | null> {
  try {
    return Platform.OS === 'web' ? await AsyncStorage.getItem(CLE_JETON) : await SecureStore.getItemAsync(CLE_JETON);
  } catch {
    return null;
  }
}

export async function ecrireJeton(jeton: string | null): Promise<void> {
  if (Platform.OS === 'web') {
    if (jeton) await AsyncStorage.setItem(CLE_JETON, jeton); else await AsyncStorage.removeItem(CLE_JETON);
  } else if (jeton) {
    await SecureStore.setItemAsync(CLE_JETON, jeton);
  } else {
    await SecureStore.deleteItemAsync(CLE_JETON);
  }
}

// --- Requêtes -------------------------------------------------------------------------

async function appel<T>(chemin: string, options: { methode?: string; corps?: unknown; jeton?: string | null;
  formulaire?: FormData } = {}): Promise<T> {
  const entetes: Record<string, string> = {};
  if (options.jeton) entetes.Authorization = `Bearer ${options.jeton}`;
  if (options.corps !== undefined) entetes['Content-Type'] = 'application/json';
  let reponse: Response;
  try {
    reponse = await fetch(`${API_URL}/api/v3/compte${chemin}`, {
      method: options.methode ?? (options.corps !== undefined || options.formulaire ? 'POST' : 'GET'),
      headers: entetes,
      body: options.formulaire ?? (options.corps !== undefined ? JSON.stringify(options.corps) : undefined),
    });
  } catch {
    throw new ErreurApiClient('RESEAU', 'Connexion impossible. Réessaie.', 0);
  }
  if (reponse.status === 204) return undefined as T;
  const corps = await reponse.json().catch(() => ({}));
  if (!reponse.ok) {
    const message = corps.message ?? (Array.isArray(corps.detail) ? corps.detail[0]?.msg : corps.detail) ?? `Erreur ${reponse.status}`;
    throw new ErreurApiClient(corps.code ?? 'ERREUR', message, reponse.status);
  }
  return corps as T;
}

export const inscrire = (c: { email: string; mot_de_passe: string; nom: string; telephone?: string; profil: Profil; langue: string }) =>
  appel<Session>('/inscription', { corps: c });
export const connecter = (email: string, mot_de_passe: string) =>
  appel<Session>('/connexion', { corps: { email, mot_de_passe } });
export const connecterApple = (c: { jeton_identite: string; nom?: string; profil: Profil; langue: string }) =>
  appel<Session>('/apple', { corps: c });
export const lireMoi = (jeton: string) => appel<Compte>('/moi', { jeton });
export const modifierProfil = (jeton: string, c: Partial<Pick<Compte, 'nom' | 'telephone' | 'langue' | 'profil'>>) =>
  appel<Compte>('/moi', { jeton, methode: 'PATCH', corps: c });
export const deconnecter = (jeton: string) => appel<void>('/deconnexion', { jeton, methode: 'POST' });
export const supprimerCompte = (jeton: string) => appel<void>('', { jeton, methode: 'DELETE' });

export const rattacherBillets = (jeton: string, billets: { numero: string; telephone: string; nom?: string }[]) =>
  appel<{ rattaches: number }>('/billets', { jeton, corps: { billets } });
export const billetsDuCompte = (jeton: string) =>
  appel<{ billet: Billet; telephone: string; titulaire: string; nom: string | null }[]>('/billets', { jeton });

export async function envoyerDocument(jeton: string, fichier: { uri: string; name: string; mimeType?: string; file?: File }) {
  const formulaire = new FormData();
  if (Platform.OS === 'web' && fichier.file) formulaire.append('fichier', fichier.file, fichier.name);
  else formulaire.append('fichier', { uri: fichier.uri, name: fichier.name, type: fichier.mimeType ?? 'application/octet-stream' } as unknown as Blob);
  // Téléversement par XMLHttpRequest sur téléphone (expo/fetch refuse les parties « { uri } »).
  if (Platform.OS === 'web') return appel<DocumentCandidature>('/candidature/documents', { jeton, formulaire });
  return new Promise<DocumentCandidature>((resoudre, rejeter) => {
    const requete = new XMLHttpRequest();
    requete.open('POST', `${API_URL}/api/v3/compte/candidature/documents`);
    requete.setRequestHeader('Authorization', `Bearer ${jeton}`);
    requete.timeout = 60_000;
    requete.onload = () => {
      let corps: { message?: string; code?: string } & Partial<DocumentCandidature> = {};
      try { corps = JSON.parse(requete.responseText); } catch { /* réponse vide */ }
      if (requete.status >= 200 && requete.status < 300) resoudre(corps as DocumentCandidature);
      else rejeter(new ErreurApiClient(corps.code ?? 'ERREUR', corps.message ?? `Erreur ${requete.status}`, requete.status));
    };
    requete.onerror = requete.ontimeout = () => rejeter(new ErreurApiClient('RESEAU', 'Connexion impossible. Réessaie.', 0));
    requete.send(formulaire);
  });
}

export const deposerCandidature = (jeton: string, c: Omit<Candidature, 'id' | 'statut' | 'motif' | 'cree_le' | 'maj_le'>) =>
  appel<Candidature>('/candidature', { jeton, corps: c });

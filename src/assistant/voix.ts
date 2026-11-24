/**
 * ASSISTANT TÉRANGA — dialogue avec le backend (IA + voix naturelle).
 *
 *   POST {API_URL}/api/v3/assistant/voix   multipart : audio (.m4a) + langue
 *   POST {API_URL}/api/v3/assistant/texte  JSON      : { texte, langue }
 *   → { transcription, langue, reponse, intention, audio_url }
 *
 * Côté serveur : ElevenLabs Scribe transcrit (wolof compris) → Claude comprend
 * et répond DANS LA LANGUE DU VISITEUR → ElevenLabs génère une voix naturelle.
 * Les clés d'API restent sur le serveur, jamais dans l'app.
 *
 * Renvoie `null` si le serveur est injoignable ou non configuré (503) : l'app
 * retombe alors sur son analyse locale et la voix du téléphone.
 */
import { Platform } from 'react-native';

import { API_URL } from '@/api/client';
import type { Langue } from '@/i18n';
import type { Intention } from './commandes';

export type ReponseAssistant = {
  transcription: string;
  langue: Langue;                    // langue détectée de la phrase du visiteur
  reponse: string;                   // texte de la réponse (déjà dans cette langue)
  intention: Intention | null;       // action à exécuter (jamais un paiement)
  audio_url: string | null;          // voix naturelle (mp3) ; null → voix du téléphone
};

async function appeler(chemin: string, init: RequestInit, delaiMs: number): Promise<ReponseAssistant | null> {
  const url = `${API_URL}/api/v3/assistant${chemin}`;
  const controleur = new AbortController();
  const minuteur = setTimeout(() => controleur.abort(), delaiMs);   // réseau faible à l'embarcadère
  try {
    const reponse = await fetch(url, { ...init, signal: controleur.signal });
    if (!reponse.ok) {
      // DIAGNOSTIC : visible dans le Terminal d'Expo (code HTTP + début du message du serveur).
      const corps = await reponse.text().catch(() => '');
      console.warn(`[Assistant] ${chemin} → HTTP ${reponse.status} : ${corps.slice(0, 300)}`);
      return null;
    }
    return (await reponse.json()) as ReponseAssistant;
  } catch (erreur) {
    const raison = controleur.signal.aborted ? `délai dépassé (${delaiMs / 1000} s)` : `erreur réseau : ${String(erreur)}`;
    console.warn(`[Assistant] ${chemin} → ${raison} — URL : ${url}`);
    return null;                     // pas de serveur, pas de réseau, ou délai dépassé
  } finally {
    clearTimeout(minuteur);
  }
}

/**
 * Téléverse un fichier du téléphone avec XMLHttpRequest.
 * Depuis Expo SDK 58, le `fetch` global (expo/fetch) refuse les parties de
 * formulaire « { uri, name, type } » (« Unsupported FormDataPart
 * implementation »). XMLHttpRequest passe par le réseau natif de React Native,
 * qui sait lire le fichier à partir de son chemin.
 */
function televerser(chemin: string, formulaire: FormData, delaiMs: number): Promise<ReponseAssistant | null> {
  const url = `${API_URL}/api/v3/assistant${chemin}`;
  return new Promise((resoudre) => {
    const requete = new XMLHttpRequest();
    requete.open('POST', url);
    requete.timeout = delaiMs;                       // réseau faible à l'embarcadère
    requete.responseType = 'text';
    requete.onload = () => {
      if (requete.status < 200 || requete.status >= 300) {
        console.warn(`[Assistant] ${chemin} → HTTP ${requete.status} : ${String(requete.responseText).slice(0, 300)}`);
        resoudre(null);
        return;
      }
      try {
        resoudre(JSON.parse(requete.responseText) as ReponseAssistant);
      } catch {
        console.warn(`[Assistant] ${chemin} → réponse illisible`);
        resoudre(null);
      }
    };
    requete.ontimeout = () => {
      console.warn(`[Assistant] ${chemin} → délai dépassé (${delaiMs / 1000} s) — URL : ${url}`);
      resoudre(null);
    };
    requete.onerror = () => {
      console.warn(`[Assistant] ${chemin} → erreur réseau (XHR) — URL : ${url}`);
      resoudre(null);
    };
    requete.send(formulaire);                        // Content-Type multipart fixé automatiquement
  });
}

/** Envoie l'enregistrement du micro. */
export async function demanderVoix(uri: string, langue: Langue): Promise<ReponseAssistant | null> {
  const formulaire = new FormData();
  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob();           // sur le web, l'URI est un blob local
    formulaire.append('audio', blob, 'demande.webm');
    formulaire.append('langue', langue);
    return appeler('/voix', { method: 'POST', body: formulaire }, 45_000);
  }
  formulaire.append('audio', { uri, name: 'demande.m4a', type: 'audio/m4a' } as unknown as Blob);
  formulaire.append('langue', langue);
  return televerser('/voix', formulaire, 45_000);           // transcription + IA + voix
}

/** Envoie une demande tapée au clavier (même intelligence, même voix). */
export function demanderTexte(texte: string, langue: Langue): Promise<ReponseAssistant | null> {
  return appeler('/texte', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ texte, langue }),
  }, 35_000);
}

/**
 * Voix naturelle d'une phrase fixe de l'app (accueil, confirmations) :
 * POST /api/v3/assistant/dire → URL du mp3 ElevenLabs, ou null (pas de
 * serveur, pas de clé, quota atteint, texte trop long) → voix du téléphone.
 * Délai court : on ne fait pas attendre le visiteur pour une simple phrase.
 */
export async function demanderAudio(texte: string, langue: Langue): Promise<string | null> {
  if (!texte.trim() || texte.length > 400) return null;      // narrations longues : voix du téléphone
  const controleur = new AbortController();
  const minuteur = setTimeout(() => controleur.abort(), 8_000);
  try {
    const reponse = await fetch(`${API_URL}/api/v3/assistant/dire`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texte, langue }), signal: controleur.signal,
    });
    if (!reponse.ok) {
      console.warn(`[Assistant] /dire → HTTP ${reponse.status}`);
      return null;
    }
    return ((await reponse.json()) as { audio_url: string | null }).audio_url;
  } catch (erreur) {
    console.warn(`[Assistant] /dire → ${controleur.signal.aborted ? 'délai dépassé' : String(erreur)}`);
    return null;
  } finally {
    clearTimeout(minuteur);
  }
}

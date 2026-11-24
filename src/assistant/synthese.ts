/**
 * Voix de l'app : choisit automatiquement la MEILLEURE voix installée.
 *
 * Par défaut, la synthèse vocale prend la voix « standard » du téléphone,
 * souvent robotique. Les téléphones proposent pourtant des voix bien plus
 * naturelles :
 *   - iPhone : Réglages › Accessibilité › Contenu énoncé › Voix › (langue)
 *     → télécharger une voix « Améliorée » ou « Premium » ;
 *   - Android : Paramètres › Synthèse vocale › moteur Google › installer
 *     les voix haute qualité.
 * Ce module les détecte et les utilise en priorité, langue par langue, et
 * écarte les voix « fantaisie » (Bells, Zarvox…) et les voix Eloquence
 * très mécaniques (Eddy, Flo, Reed…).
 *
 * Étape suivante (production) : voix neuronales générées côté serveur
 * (route /assistant/voix), pour une voix identique sur tous les téléphones
 * — et une vraie voix wolof.
 */
import * as Speech from 'expo-speech';

import { CODE_VOIX, type Langue } from '@/i18n';

/** Voix les plus naturelles connues, par langue (ordre de préférence). */
const PREFEREES: Record<string, string[]> = {
  fr: ['premium', 'enhanced', 'amelie', 'amélie', 'audrey', 'thomas', 'aurelie', 'marie', 'daniel'],
  en: ['premium', 'enhanced', 'ava', 'zoe', 'serena', 'daniel', 'evan', 'samantha', 'karen'],
  es: ['premium', 'enhanced', 'monica', 'mónica', 'paulina', 'marisol', 'jorge', 'diego'],
  ar: ['premium', 'enhanced', 'majed', 'laila', 'maged', 'tarik'],
};

/** Voix à éviter : fantaisie et synthèse « Eloquence » très mécanique. */
const A_EVITER = ['albert', 'bad news', 'bahh', 'bells', 'boing', 'bubbles', 'cellos', 'wobble', 'zarvox',
  'whisper', 'jester', 'organ', 'superstar', 'trinoids', 'good news', 'hysterical', 'deranged', 'junior',
  'ralph', 'fred', 'kathy', 'princess', 'grandma', 'grandpa', 'eddy', 'flo', 'reed', 'rocko', 'sandy', 'shelley'];

let voixDisponibles: Speech.Voice[] | null = null;
const choixParLangue = new Map<string, string | undefined>();

async function chargerVoix(): Promise<Speech.Voice[]> {
  if (!voixDisponibles) {
    try { voixDisponibles = await Speech.getAvailableVoicesAsync(); } catch { voixDisponibles = []; }
  }
  return voixDisponibles;
}

/** Note une voix : qualité améliorée, nom connu pour être naturel, bon pays. */
function score(v: Speech.Voice, code: string): number {
  const nom = `${v.name} ${v.identifier}`.toLowerCase();
  if (A_EVITER.some((m) => nom.includes(m))) return -1;
  let s = 0;
  if (v.quality === Speech.VoiceQuality.Enhanced) s += 100;
  if (nom.includes('premium')) s += 60;
  if (nom.includes('siri') || nom.includes('neural') || nom.includes('network')) s += 40;
  const pref = PREFEREES[code.slice(0, 2)] ?? [];
  const rang = pref.findIndex((p) => nom.includes(p));
  if (rang >= 0) s += 30 - rang;
  if (v.language === code) s += 10;                 // fr-FR plutôt que fr-CA pour le français
  return s;
}

/** Identifiant de la meilleure voix pour une langue (mis en cache). */
export async function meilleureVoix(langue: Langue): Promise<string | undefined> {
  const code = CODE_VOIX[langue];
  if (choixParLangue.has(code)) return choixParLangue.get(code);
  const candidates = (await chargerVoix()).filter((v) => v.language?.toLowerCase().startsWith(code.slice(0, 2)));
  const meilleure = candidates.map((v) => ({ v, s: score(v, code) })).filter((x) => x.s >= 0)
    .sort((a, b) => b.s - a.s)[0]?.v;
  choixParLangue.set(code, meilleure?.identifier);
  return meilleure?.identifier;
}

/**
 * Lit un texte avec la voix la plus naturelle disponible.
 * Débit légèrement ralenti (0,92) : plus posé, plus agréable pour un guide.
 */
export async function parlerNaturel(texte: string, langue: Langue, options: Speech.SpeechOptions = {}) {
  Speech.stop();
  const voice = await meilleureVoix(langue);
  Speech.speak(texte, { language: CODE_VOIX[langue], voice, rate: 0.92, pitch: 1.0, ...options });
}

/**
 * ASSISTANT TÉRANGA — compréhension des demandes.
 *
 * Une demande (texte tapé, ou transcription de la voix) est traduite en une
 * INTENTION structurée que l'app sait exécuter. Le backend renverra plus tard
 * exactement le même format (champ `intention`), calculé par une IA à partir
 * de l'audio — wolof compris. En attendant, ce fichier fait une analyse
 * locale par mots-clés en français, anglais, espagnol, arabe et wolof : elle
 * couvre les demandes courantes et sert de repli hors connexion.
 *
 * Règle de sécurité : AUCUNE intention ne déclenche un paiement. Au mieux,
 * l'assistant PRÉREMPLIT le formulaire ; le visiteur valide toujours d'un toucher.
 */
import type { IdLieu } from '@/demo/donnees';
import type { Langue } from '@/i18n';

export type Ecran = 'accueil' | 'chaloupe' | 'ile' | 'billets' | 'circuits' | 'audio' | 'packs' | 'visite3d'
  | 'guides' | 'restaurants' | 'hotels';

export type Intention =
  | { type: 'acheter_chaloupe'; passagers?: number; trajet?: 'ALLER_SIMPLE' | 'ALLER_RETOUR'; date?: string }
  | { type: 'acheter_entree'; nationalite?: 'NATIONAL' | 'INTERNATIONAL'; enfants?: number; adultes?: number; date?: string }
  | { type: 'prochain_depart' }
  | { type: 'langue'; langue: Langue }
  | { type: 'raconter'; lieu: IdLieu }
  | { type: 'naviguer'; ecran: Ecran }
  | { type: 'inconnu' };

// --- Outils -----------------------------------------------------------------------

/** Minuscules, sans accents ni ponctuation : « Après-demain ! » → « apres demain ». */
export function normaliser(texte: string): string {
  return texte.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[أإآ]/g, 'ا').replace(/[’'`´\-_,.;:!?¿¡«»"()]/g, ' ').replace(/\s+/g, ' ').trim();
}

const contient = (t: string, mots: string[]) => mots.some((m) => t.includes(m));

/** Nombres écrits en toutes lettres, dans les 5 langues (après normalisation). */
const NOMBRES: Record<string, number> = {
  un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10,
  one: 1, two: 2, three: 3, four: 4, five: 5, seven: 7, eight: 8, nine: 9, ten: 10,
  uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
  benn: 1, naar: 2, nett: 3, neent: 4, juroom: 5,
  'واحد': 1, 'اثنين': 2, 'اثنان': 2, 'ثلاثة': 3, 'اربعة': 4, 'خمسة': 5,
};

/** Premier nombre trouvé (chiffres ou lettres), éventuellement juste avant un mot-clé. */
function nombre(t: string, avant?: string[]): number | undefined {
  const mots = t.split(' ');
  for (let i = 0; i < mots.length; i++) {
    const n = /^\d+$/.test(mots[i]) ? Number(mots[i]) : NOMBRES[mots[i]];
    if (n === undefined) continue;
    if (!avant || avant.some((a) => (mots[i + 1] ?? '').startsWith(a))) return n;
  }
  return undefined;
}

/** Date AAAA-MM-JJ (UTC = heure de Dakar) dans `n` jours. */
function dansJours(n: number): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Jours de la semaine (0 = dimanche) dans les 5 langues. */
const JOURS: [string[], number][] = [
  [['dimanche', 'sunday', 'domingo', 'الاحد', 'dibeer'], 0],
  [['lundi', 'monday', 'lunes', 'الاثنين', 'altine'], 1],
  [['mardi', 'tuesday', 'martes', 'الثلاثاء', 'talaata'], 2],
  [['mercredi', 'wednesday', 'miercoles', 'الاربعاء', 'alarba'], 3],
  [['jeudi', 'thursday', 'jueves', 'الخميس', 'alxames'], 4],
  [['vendredi', 'friday', 'viernes', 'الجمعة', 'ajjuma'], 5],
  [['samedi', 'saturday', 'sabado', 'السبت', 'gaawu'], 6],
];

/** Repère une date : aujourd'hui, demain, après-demain, ou un jour de la semaine. */
function date(t: string): string | undefined {
  if (contient(t, ['apres demain', 'day after tomorrow', 'pasado manana', 'بعد غد'])) return dansJours(2);
  if (contient(t, ['aujourd hui', 'today', 'hoy', 'tey', 'اليوم', 'ce soir', 'tonight'])) return dansJours(0);
  if (contient(t, ['demain', 'tomorrow', 'manana', 'suba', 'غدا', 'غد'])) return dansJours(1);
  const aujourdhui = new Date().getUTCDay();
  for (const [mots, jour] of JOURS) {
    if (contient(t, mots)) return dansJours((jour - aujourdhui + 7) % 7);
  }
  return undefined;
}

// --- Vocabulaire par intention ------------------------------------------------------

const LANGUES_MOTS: [string[], Langue][] = [
  [['anglais', 'english', 'ingles', 'انجليز'], 'en'],
  [['francais', 'french', 'frances', 'فرنس'], 'fr'],
  [['espagnol', 'spanish', 'espanol', 'اسبان'], 'es'],
  [['arabe', 'arabic', 'عرب'], 'ar'],
  [['wolof', 'ولوف'], 'wo'],
];
const DEMANDE_LANGUE = ['langue', 'language', 'idioma', 'لغة', 'lakk', 'mets', 'passe', 'change', 'parle',
  'switch', 'put', 'cambia', 'habla'];

const LIEUX_MOTS: [string[], IdLieu][] = [
  [['maison des esclaves', 'house of slaves', 'slave house', 'casa de los esclavos', 'بيت العبيد', 'ker jaam'], 'maison'],
  [['castel'], 'castel'],
  [['fort', 'musee', 'museum', 'museo', 'متحف', 'حصن'], 'fort'],
  [['eglise', 'church', 'iglesia', 'كنيسة'], 'eglise'],
  [['mosquee', 'mosque', 'mezquita', 'مسجد', 'jumaa', 'jakka'], 'mosquee'],
  [['artiste', 'artist', 'artista', 'فنان'], 'artistes'],
];

const MOTS_DEPART = ['prochain depart', 'next departure', 'next ferry', 'next boat', 'proxima salida',
  'proximo barco', 'الرحلة القادمة', 'horaire', 'schedule', 'horario', 'a quelle heure', 'what time',
  'quand part', 'when does', 'mooy dem', 'ban waxtu'];
const MOTS_ENTREE = ['entree', 'entrance', 'entrada', 'دخول', 'visiter l ile', 'visit the island',
  'visitar la isla', 'billet du site', 'site'];
const MOTS_CHALOUPE = ['chaloupe', 'ferry', 'bateau', 'boat', 'lancha', 'barco', 'قارب', 'gaal', 'traversee',
  'crossing', 'travesia', 'billet', 'ticket', 'boleto', 'billete', 'biye', 'تذكرة', 'تذاكر', 'تذكرت'];

/** Le « duel » arabe : « تذكرتين / تذكرتان » = deux billets, sans chiffre. */
const DUEL_ARABE = ['تذكرتين', 'تذكرتان', 'شخصين'];

const NAVIGATION: [string[], Ecran][] = [
  [['mes billets', 'my tickets', 'mis billetes', 'تذاكري', 'sama biye'], 'billets'],
  [['3d', 'visite virtuelle', 'virtual tour', 'visita virtual', 'ثلاثية', 'drone'], 'visite3d'],
  [['guide'], 'guides'],
  [['restaurant', 'manger', 'eat', 'food', 'comer', 'restaurante', 'مطعم', 'lekk', 'thieb'], 'restaurants'],
  [['hotel', 'dormir', 'sleep', 'فندق', 'nelaw', 'chambre', 'room'], 'hotels'],
  [['audio'], 'audio'],
  [['circuit', 'tour', 'recorrido', 'جولة'], 'circuits'],
  [['pack', 'premium'], 'packs'],
  [['accueil', 'home', 'inicio', 'الرئيسية'], 'accueil'],
];

const MOTS_RACONTER = ['raconte', 'histoire', 'parle moi', 'tell me', 'story', 'history', 'cuentame',
  'historia', 'احك', 'قصة', 'tarikh', 'wax ma', 'ecouter', 'listen', 'escuchar', 'explique'];

// --- Analyse ------------------------------------------------------------------------

/** Transforme une phrase en intention. Ordre = priorité (du plus précis au plus vague). */
export function comprendre(phrase: string): Intention {
  const t = normaliser(phrase);
  if (!t) return { type: 'inconnu' };
  const mots = t.split(' ').length;

  // 1. Changer de langue (« mets l'app en anglais », « english »)
  for (const [motsLangue, langue] of LANGUES_MOTS) {
    if (contient(t, motsLangue) && (contient(t, DEMANDE_LANGUE) || mots <= 3)) return { type: 'langue', langue };
  }

  // 2. Visite 3D et mes billets : formulations très typées
  if (contient(t, ['3d', 'visite virtuelle', 'virtual tour', 'visita virtual', 'ثلاثية'])) return { type: 'naviguer', ecran: 'visite3d' };
  if (contient(t, NAVIGATION[0][0])) return { type: 'naviguer', ecran: 'billets' };

  // 3. Raconter un lieu (« raconte-moi la Maison des Esclaves »)
  for (const [motsLieu, lieu] of LIEUX_MOTS) {
    if (contient(t, motsLieu) && (contient(t, MOTS_RACONTER) || mots <= 5)) return { type: 'raconter', lieu };
  }

  // 4. Prochain départ de chaloupe
  if (contient(t, MOTS_DEPART)) return { type: 'prochain_depart' };

  // 5. Billet d'entrée du site
  if (contient(t, MOTS_ENTREE)) {
    return {
      type: 'acheter_entree',
      nationalite: contient(t, ['national', 'senegalais', 'senegalese', 'cni', 'سنغالي']) ? 'NATIONAL'
        : contient(t, ['international', 'etranger', 'tourist', 'foreigner', 'extranjero', 'دولي']) ? 'INTERNATIONAL'
          : undefined,
      enfants: nombre(t, ['enfant', 'child', 'kid', 'nino', 'nina', 'طفل', 'xale']),
      adultes: nombre(t, ['adulte', 'adult', 'adulto', 'بالغ']),
      date: date(t),
    };
  }

  // 6. Billet de chaloupe (le cas par défaut dès qu'on parle de billet)
  if (contient(t, MOTS_CHALOUPE)) {
    return {
      type: 'acheter_chaloupe',
      passagers: nombre(t) ?? (contient(t, DUEL_ARABE) ? 2 : undefined),
      trajet: contient(t, ['aller simple', 'one way', 'solo ida', 'ذهاب فقط', 'seulement l aller', 'just one way'])
        ? 'ALLER_SIMPLE' : 'ALLER_RETOUR',
      date: date(t),
    };
  }

  // 7. Navigation générale
  for (const [motsEcran, ecran] of NAVIGATION) {
    if (contient(t, motsEcran)) return { type: 'naviguer', ecran };
  }

  return { type: 'inconnu' };
}

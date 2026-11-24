/**
 * Traductions : français · English · Wolof · Español · العربية.
 *
 * - Le FRANÇAIS est la référence : il contient toutes les clés.
 * - Toute clé absente d'une langue retombe sur le français : on n'affiche
 *   jamais une clé brute.
 * - La langue choisie est MÉMORISÉE sur le téléphone (AsyncStorage). Au
 *   premier lancement, on prend la langue du système si elle est gérée.
 * - L'ARABE s'écrit de droite à gauche : le fournisseur bascule toute la mise
 *   en page (`direction: 'rtl'`) sans redémarrer l'app.
 *
 * ⚠️ Wolof, espagnol et arabe : premiers jets à faire relire par des locuteurs
 * natifs avant publication (le wolof en priorité).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode,
} from 'react';
import { View } from 'react-native';

import { ar } from './ar';
import { en } from './en';
import { es } from './es';
import { fr, type Cles, type Dictionnaire } from './fr';

export type { Cles } from './fr';
export type Langue = 'fr' | 'en' | 'wo' | 'es' | 'ar';

/** Langues proposées dans le sélecteur, avec leur nom dans leur propre langue. */
export const LANGUES: { code: Langue; nom: string; drapeau: string; rtl?: boolean; brouillon?: boolean }[] = [
  { code: 'fr', nom: 'Français', drapeau: '🇫🇷' },
  { code: 'en', nom: 'English', drapeau: '🇬🇧' },
  { code: 'wo', nom: 'Wolof', drapeau: '🇸🇳', brouillon: true },
  { code: 'es', nom: 'Español', drapeau: '🇪🇸', brouillon: true },
  { code: 'ar', nom: 'العربية', drapeau: '🇸🇦', rtl: true, brouillon: true },
];

/** Code BCP-47 pour la synthèse vocale (le wolof n'existe pas : repli sur le français). */
export const CODE_VOIX: Record<Langue, string> = {
  fr: 'fr-FR', en: 'en-GB', wo: 'fr-FR', es: 'es-ES', ar: 'ar-SA',
};

// WOLOF — premier jet, À FAIRE RELIRE par un locuteur natif.
const wo: Dictionnaire = {
  bienvenue: 'Dalal ak jàmm',
  accroche: 'Goree mungi lay xaar.',
  queFaire: 'Lan nga bëgg def ?',
  chaloupeTitre: 'Gaal gi (chaloupe)',
  ileTitre: 'Seetaan dun bi',
  mesBillets: 'Sama biye yi',
  payer: 'Fey',
  valider: 'Dëggal',
  valide: 'Baax na',
  utilise: 'Jëfandikoo nañu ko',
  lieuMemoire: 'Bérab bu màggat la : noppil sa telefon, jërëjëf.',
  choisirLangue: 'Tànnal làkk wi',
};

const DICTIONNAIRES: Record<Langue, Dictionnaire> = { fr, en, wo, es, ar };

// --- Fournisseur ----------------------------------------------------------------

type Variables = Record<string, string | number>;
type ContexteI18n = {
  langue: Langue;
  setLangue: (l: Langue) => void;
  /** Traduit une clé ; `{x}` est remplacé par `variables.x`. */
  t: (c: Cles, variables?: Variables) => string;
  /** Vrai pour l'arabe : la mise en page est en miroir. */
  rtl: boolean;
  /** Panneau de choix de la langue (dessiné par <PanneauLangue />, sans Modal native). */
  selecteurOuvert: boolean;
  setSelecteurOuvert: (o: boolean) => void;
};
const Contexte = createContext<ContexteI18n | null>(null);
const CLE_STOCKAGE = 'goree.langue';

function langueSysteme(): Langue {
  const code = getLocales()[0]?.languageCode;
  return (LANGUES.find((l) => l.code === code)?.code) ?? 'fr';
}

export function FournisseurI18n({ children }: { children: ReactNode }) {
  const [langue, setLangueEtat] = useState<Langue>(langueSysteme);
  const [selecteurOuvert, setSelecteurOuvert] = useState(false);

  // Recharge la langue mémorisée au démarrage.
  useEffect(() => {
    AsyncStorage.getItem(CLE_STOCKAGE).then((l) => {
      if (l && l in DICTIONNAIRES) setLangueEtat(l as Langue);
    }).catch(() => undefined);
  }, []);

  const setLangue = useCallback((l: Langue) => {
    setLangueEtat(l);
    AsyncStorage.setItem(CLE_STOCKAGE, l).catch(() => undefined);
  }, []);

  const valeur = useMemo<ContexteI18n>(() => ({
    langue,
    setLangue,
    selecteurOuvert,
    setSelecteurOuvert,
    rtl: !!LANGUES.find((l) => l.code === langue)?.rtl,
    t: (c, variables) => {
      let texte = DICTIONNAIRES[langue][c] ?? fr[c];
      if (variables) for (const [k, v] of Object.entries(variables)) texte = texte.replace(`{${k}}`, String(v));
      return texte;
    },
  }), [langue, setLangue, selecteurOuvert]);

  return (
    <Contexte.Provider value={valeur}>
      {/* `direction` met toute la mise en page en miroir pour l'arabe. */}
      <View style={{ flex: 1, direction: valeur.rtl ? 'rtl' : 'ltr' }}>{children}</View>
    </Contexte.Provider>
  );
}

export function useT() {
  const ctx = useContext(Contexte);
  if (!ctx) throw new Error('useT doit être utilisé sous <FournisseurI18n>');
  return ctx;
}

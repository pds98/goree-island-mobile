/**
 * Traductions FR / EN / Wolof.
 *
 * ⚠️ Les textes wolof sont un premier jet : à faire relire par un locuteur
 * natif avant publication. Toute clé absente d'une langue retombe sur le
 * français, pour ne jamais afficher une clé brute.
 */
import { getLocales } from 'expo-localization';
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export type Langue = 'fr' | 'en' | 'wo';

const fr = {
  bienvenue: 'Dalal ak jàmm',
  accroche: "L'île t'attend.",
  queFaire: 'Que veux-tu faire ?',
  chaloupeTitre: 'Traversée chaloupe',
  chaloupeSous: 'Dakar ⇄ Gorée · même tarif pour tous',
  ileTitre: "Visiter l'île",
  ileSous: 'Entrée du site · circuits · guides · restos',
  nationalOuInternational: 'National ou international',
  mesBillets: 'Mes billets',
  prochainDepart: 'Prochain départ',
  aLHeure: "À l'heure",
  retard: 'Retard',
  complet: 'Complet',
  // Chaloupe
  tarifUnique: 'Tarif unique',
  allerRetour: 'Aller-retour',
  allerSimple: 'Aller simple',
  departsDakar: 'Départs de Dakar',
  passagers: 'Passagers',
  nomPrenom: 'Nom et prénom',
  telephone: 'Téléphone (billet + alertes retard)',
  total: 'Total',
  payer: 'Payer',
  aucuneIdentite: "Aucune pièce d'identité demandée.",
  // Île
  entreeSite: 'Entrée du site',
  national: 'National',
  nationalSous: 'CNI + selfie · tarif réduit',
  international: 'International',
  internationalSous: 'Nom, téléphone · standard',
  enfants: 'Enfants accompagnants',
  adultes: 'Adultes accompagnants',
  pack: 'Pack',
  surPlace: 'Sur place',
  circuits: 'Circuits & tours',
  audioGuide: 'Audio-guide',
  guides: 'Guides',
  restaurants: 'Restaurants',
  hotels: 'Hôtels',
  packs: 'Packs',
  acheterEntree: "Acheter l'entrée",
  verifierIdentite: 'Vérifier mon identité',
  identiteVerifiee: 'Identité vérifiée',
  // Identité
  cestBienToi: "C'est bien toi ?",
  identiteExplication:
    'Le tarif national est personnel : 1 billet par CNI et par jour. Environ 30 secondes.',
  photoCni: 'Photographie ta CNI',
  selfieVivant: 'Selfie',
  numeroCni: 'Numéro de CNI (mode démo)',
  prendrePhoto: 'Prendre la photo',
  recommencer: 'Recommencer',
  valider: 'Valider',
  confidentialite:
    'Données chiffrées, selfie supprimé après vérification. La chaloupe, elle, ne demande aucune pièce.',
  autoriserCamera: 'Autoriser la caméra',
  // Billets
  valide: 'Valide',
  utilise: 'Utilisé',
  aucunBillet: 'Aucun billet pour le moment.',
  horsLigne: 'Disponible hors ligne',
  scannerEmbarcadere: "À scanner à l'embarcadère · aucune pièce demandée",
  scannerSite: "À scanner à l'arrivée sur l'île · présente ta CNI",
  reporter: 'Reporter à demain',
  annoncerRetour: 'Annoncer mon retour',
  // Audio
  lieuMemoire: 'Lieu de mémoire : téléphone en silencieux, merci pour ton recueillement.',
  simulerPosition: 'Mode démo : me placer à une étape',
  aucuneEtape: 'Aucune étape à proximité.',
  // Marketplace
  reserver: 'Réserver',
  sequestre: "Paiement bloqué jusqu'à la prestation, remboursé si elle n'a pas lieu.",
  licenceVerifiee: 'Licence vérifiée',
  premiumRequis: 'Réservé au pack Premium Téranga.',
  erreurReseau: 'Connexion impossible. Réessaie.',
};

type Cles = keyof typeof fr;

const en: Partial<Record<Cles, string>> = {
  bienvenue: 'Dalal ak jàmm — Welcome',
  accroche: 'The island awaits.',
  queFaire: 'What would you like to do?',
  chaloupeTitre: 'Ferry crossing',
  chaloupeSous: 'Dakar ⇄ Gorée · same fare for all',
  ileTitre: 'Visit the island',
  ileSous: 'Site entry · tours · guides · food',
  nationalOuInternational: 'Senegalese or international',
  mesBillets: 'My tickets',
  prochainDepart: 'Next departure',
  aLHeure: 'On time',
  retard: 'Delay',
  complet: 'Full',
  tarifUnique: 'Single fare',
  allerRetour: 'Return',
  allerSimple: 'One way',
  departsDakar: 'Departures from Dakar',
  passagers: 'Passengers',
  nomPrenom: 'Full name',
  telephone: 'Phone (ticket + delay alerts)',
  payer: 'Pay',
  aucuneIdentite: 'No ID required.',
  entreeSite: 'Site entry',
  nationalSous: 'ID card + selfie · reduced fare',
  internationalSous: 'Name, phone · standard fare',
  enfants: 'Accompanying children',
  adultes: 'Accompanying adults',
  surPlace: 'On the island',
  circuits: 'Tours',
  audioGuide: 'Audio guide',
  hotels: 'Hotels',
  acheterEntree: 'Buy entry',
  verifierIdentite: 'Verify my ID',
  identiteVerifiee: 'ID verified',
  cestBienToi: 'Is that you?',
  identiteExplication: 'The national fare is personal: 1 ticket per ID card per day.',
  photoCni: 'Photograph your ID card',
  numeroCni: 'ID card number (demo mode)',
  prendrePhoto: 'Take photo',
  recommencer: 'Retake',
  valider: 'Confirm',
  confidentialite: 'Encrypted data, selfie deleted after verification.',
  autoriserCamera: 'Allow camera',
  valide: 'Valid',
  utilise: 'Used',
  aucunBillet: 'No tickets yet.',
  horsLigne: 'Available offline',
  scannerEmbarcadere: 'Scan at the pier · no ID needed',
  scannerSite: 'Scan on arrival · show your ID card',
  reporter: 'Move to tomorrow',
  annoncerRetour: 'Announce my return',
  lieuMemoire: 'Place of remembrance: please silence your phone.',
  simulerPosition: 'Demo mode: place me at a stop',
  aucuneEtape: 'No stop nearby.',
  reserver: 'Book',
  sequestre: 'Payment held until the service is delivered, refunded otherwise.',
  licenceVerifiee: 'Licence verified',
  premiumRequis: 'Premium Téranga pack only.',
  erreurReseau: 'Connection failed. Please retry.',
};

// Premier jet — À FAIRE RELIRE par un locuteur wolof.
const wo: Partial<Record<Cles, string>> = {
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
};

const DICTIONNAIRES: Record<Langue, Partial<Record<Cles, string>>> = { fr, en, wo };

type ContexteI18n = { langue: Langue; setLangue: (l: Langue) => void; t: (c: Cles) => string };
const Contexte = createContext<ContexteI18n | null>(null);

function langueSysteme(): Langue {
  const code = getLocales()[0]?.languageCode;
  return code === 'en' ? 'en' : code === 'wo' ? 'wo' : 'fr';
}

export function FournisseurI18n({ children }: { children: ReactNode }) {
  const [langue, setLangue] = useState<Langue>(langueSysteme);
  const valeur = useMemo<ContexteI18n>(
    () => ({ langue, setLangue, t: (c) => DICTIONNAIRES[langue][c] ?? fr[c] }),
    [langue],
  );
  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>;
}

export function useT() {
  const ctx = useContext(Contexte);
  if (!ctx) throw new Error('useT doit être utilisé sous <FournisseurI18n>');
  return ctx;
}

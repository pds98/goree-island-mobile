/**
 * Types du contrat JSON de l'API Gorée Island v3 — miroir de
 * `app/schemas.py` côté backend. À garder synchronisé.
 */

export type Trajet = 'ALLER_SIMPLE' | 'ALLER_RETOUR';
export type MoyenPaiement = 'WAVE' | 'ORANGE_MONEY' | 'CARTE';
export type NomPack = 'DECOUVERTE' | 'ESSENTIEL' | 'PREMIUM';
export type Famille = 'CHALOUPE' | 'ENTREE_SITE';
export type PointControle = 'EMBARCADERE_DAKAR' | 'EMBARCADERE_GOREE' | 'ENTREE_SITE';
export type StatutCoupon = 'EN_ATTENTE' | 'VALIDE' | 'UTILISE' | 'ANNULE';

export interface Coupon {
  libelle: string;
  point_controle: PointControle;
  statut: StatutCoupon;
  jeton: string; // QR signé Ed25519, sans donnée personnelle
}

export interface Billet {
  numero: string;
  famille: Famille;
  date_visite: string; // AAAA-MM-JJ
  prix: number;
  statut: string;
  passagers: number | null;
  nationalite: 'NATIONAL' | 'INTERNATIONAL' | null;
  enfants: number | null;
  adultes_supp: number | null;
  pack: NomPack | null;
  trajet?: Trajet | null;
  rotation_aller_id?: string | null;   // départ choisi à l'achat (facultatif)
  coupons: Coupon[];
}

export interface Commande {
  commande_id: string;
  statut: 'EN_ATTENTE_PAIEMENT' | 'PAYEE' | 'ECHOUEE' | 'EXPIREE';
  montant: number;
  url_paiement: string | null;
  billets: Billet[];
}

export type Port = 'Dakar' | 'Gorée';

export interface Rotation {
  id: string;
  nom: string;
  depart: Port;
  arrivee: Port;
  heure_prevue: string;
  retard_minutes: number;
  heure_depart_reelle: string;     // prévue + retard
  heure_arrivee_estimee: string;   // départ réel + durée de traversée
  duree_min: number;
  capacite: number;
}

export type StatutTraversee = 'A_QUAI' | 'EN_MER' | 'ARRIVEE';

/** Suivi en direct d'une chaloupe (GET /rotations/{id}/suivi). */
export interface SuiviChaloupe extends Rotation {
  statut: StatutTraversee;
  progression: number;             // 0 → 1
  position: { lat: number; lon: number };
  source: 'GPS' | 'ESTIMATION';
  minutes_restantes: number;
  ports: Record<Port, { lat: number; lon: number }>;
}

export interface Verification {
  verification_id: string;
  nom_carte: string;
  cni_4_derniers: string;
  expire_le: string;
}

export interface Circuit {
  id: string;
  nom: string;
  theme: string;
  duree_min: number;
  ton_memoriel: boolean;
  etapes: { nom: string; lat: number; lon: number }[];
}

export interface ReponseAudio {
  circuit?: string;
  etape: string | null;
  distance_m?: number;
  piste?: string;
  rappel_memoriel?: boolean;
}

export interface Partenaire {
  id: string;
  type: 'GUIDE' | 'RESTAURANT' | 'HOTEL';
  nom: string;
  langues: string | null;
  licence_verifiee: boolean;
  // --- Champs optionnels (affichage enrichi ; fournis par les données de démo,
  //     à ajouter au schéma backend quand il les exposera) ---
  demo?: boolean;          // partenaire fictif de démonstration
  description?: string;
  note?: number;           // moyenne des avis vérifiés, sur 5
  avis?: number;           // nombre d'avis vérifiés
  tarif?: string;          // libellé de prix (« 15 000 FCFA · 2 h »)
}

/** Erreur métier renvoyée par l'API : `code` stable, `message` lisible. */
export interface ErreurApi {
  code: string;
  message: string;
}

// --- Avis et suggestions des visiteurs -------------------------------------------

export type TypeRetour = 'AVIS' | 'SUGGESTION' | 'PROBLEME';
export type ThemeRetour = 'achat' | 'chaloupe' | 'visite' | 'application' | 'assistant';

export interface NouveauRetour {
  note: number;                                    // 1 → 5
  type: TypeRetour;
  notes_themes: Partial<Record<ThemeRetour, number>>;
  etiquettes: string[];
  commentaire: string;
  prenom?: string;
  langue: string;
  billet_numero?: string;
  contact?: string;
  consentement_contact: boolean;
}

export interface RetourPublic {
  id: string;
  note: number;
  type: TypeRetour;
  commentaire: string;
  prenom: string | null;
  langue: string;
  etiquettes: string[];
  cree_le: string;
}

export interface ResumeRetours {
  moyenne: number | null;
  total: number;
  repartition: Record<'1' | '2' | '3' | '4' | '5', number>;
  themes: Partial<Record<ThemeRetour, number>>;
  derniers: RetourPublic[];
}

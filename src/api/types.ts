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
  coupons: Coupon[];
}

export interface Commande {
  commande_id: string;
  statut: 'EN_ATTENTE_PAIEMENT' | 'PAYEE' | 'ECHOUEE' | 'EXPIREE';
  montant: number;
  url_paiement: string | null;
  billets: Billet[];
}

export interface Rotation {
  id: string;
  nom: string;
  depart: 'Dakar' | 'Gorée';
  heure_prevue: string;
  retard_minutes: number;
  capacite: number;
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
}

/** Erreur métier renvoyée par l'API : `code` stable, `message` lisible. */
export interface ErreurApi {
  code: string;
  message: string;
}

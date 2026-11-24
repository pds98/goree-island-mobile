/**
 * Compte connecté, partagé dans toute l'app.
 *
 * À la connexion, les billets sont SYNCHRONISÉS dans les deux sens :
 *   - billets du téléphone → rattachés au compte ;
 *   - billets du compte (achetés sur un autre appareil) → ajoutés au téléphone.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { enregistrerBillets, lireBillets } from '@/stockage/billets';
import * as api from './api';

type Valeur = {
  compte: api.Compte | null;
  jeton: string | null;
  pret: boolean;
  ouvrir: (session: api.Session) => Promise<void>;
  rafraichir: () => Promise<void>;
  synchroniser: () => Promise<number>;
  fermer: () => Promise<void>;
  supprimer: () => Promise<void>;
};

const Contexte = createContext<Valeur | null>(null);

export function FournisseurCompte({ children }: { children: ReactNode }) {
  const [compte, setCompte] = useState<api.Compte | null>(null);
  const [jeton, setJeton] = useState<string | null>(null);
  const [pret, setPret] = useState(false);

  const synchroniserAvec = useCallback(async (j: string) => {
    const locaux = await lireBillets();
    if (locaux.length) {
      await api.rattacherBillets(j, locaux.map((b) => ({ numero: b.billet.numero, telephone: b.telephone, nom: b.nom })));
    }
    const distants = await api.billetsDuCompte(j);
    const connus = new Set(locaux.map((b) => b.billet.numero));
    const nouveaux = distants.filter((d) => !connus.has(d.billet.numero));
    await enregistrerBillets(distants.map((d) => ({ billet: d.billet, telephone: d.telephone, titulaire: d.titulaire,
      nom: d.nom ?? undefined, enregistreLe: new Date().toISOString() })));
    return nouveaux.length;
  }, []);

  // Reprise de la session au lancement.
  useEffect(() => {
    void (async () => {
      const j = await api.lireJeton();
      if (j) {
        try {
          setCompte(await api.lireMoi(j));
          setJeton(j);
        } catch (e) {
          if ((e as { statut?: number }).statut === 401) await api.ecrireJeton(null);   // session expirée
        }
      }
      setPret(true);
    })();
  }, []);

  const valeur = useMemo<Valeur>(() => ({
    compte, jeton, pret,
    ouvrir: async (session) => {
      await api.ecrireJeton(session.jeton);
      setJeton(session.jeton);
      setCompte(session.compte);
      await synchroniserAvec(session.jeton).catch(() => 0);
      setCompte(await api.lireMoi(session.jeton).catch(() => session.compte));
    },
    rafraichir: async () => { if (jeton) setCompte(await api.lireMoi(jeton)); },
    synchroniser: async () => (jeton ? synchroniserAvec(jeton) : 0),
    fermer: async () => {
      if (jeton) await api.deconnecter(jeton).catch(() => undefined);
      await api.ecrireJeton(null);
      setJeton(null);
      setCompte(null);
    },
    supprimer: async () => {
      if (jeton) await api.supprimerCompte(jeton);
      await api.ecrireJeton(null);
      setJeton(null);
      setCompte(null);
    },
  }), [compte, jeton, pret, synchroniserAvec]);

  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>;
}

export function useCompte(): Valeur {
  const v = useContext(Contexte);
  if (!v) throw new Error('useCompte doit être utilisé dans <FournisseurCompte>');
  return v;
}

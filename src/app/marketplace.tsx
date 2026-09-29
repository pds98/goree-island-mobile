/**
 * Marketplace Téranga (pack Premium) : guides à licence vérifiée,
 * restaurants (pré-commande), hôtels. Paiement en SÉQUESTRE : bloqué
 * jusqu'à la prestation, remboursé si elle n'a pas lieu.
 */
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { ErreurApiClient, listerPartenaires, reserver } from '@/api/client';
import type { Partenaire } from '@/api/types';
import {
  Bandeau, Bouton, Carte, Champ, Ecran, EnTete, Etiquette, Segment, Texte, Titre,
} from '@/composants/ui';
import { useT } from '@/i18n';
import { lireBillets, type BilletStocke } from '@/stockage/billets';
import { couleurs } from '@/theme';

type Type = Partenaire['type'];

export default function Marketplace() {
  const { t } = useT();
  const [type, setType] = useState<Type>('GUIDE');
  const [billet, setBillet] = useState<BilletStocke | null>(null);
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [montant, setMontant] = useState('');
  const [retour, setRetour] = useState<{ ton: 'info' | 'erreur'; texte: string } | null>(null);
  const partenaires = useQuery({ queryKey: ['partenaires', type], queryFn: () => listerPartenaires(type) });

  useFocusEffect(useCallback(() => {
    lireBillets().then((bs) => setBillet(bs.find((b) => b.billet.famille === 'ENTREE_SITE'
      && b.billet.pack === 'PREMIUM') ?? null));
  }, []));

  async function confirmer(p: Partenaire) {
    if (!billet) return;
    try {
      const r = await reserver({ numero: billet.billet.numero, telephone: billet.telephone,
        partenaire_id: p.id, description, montant: Number(montant), moyen_paiement: 'WAVE' });
      setRetour({ ton: 'info', texte: `Réservé chez ${p.nom} : ${r.montant} FCFA bloqués jusqu'à la prestation.` });
      setOuvert(null); setDescription(''); setMontant('');
    } catch (e) { setRetour({ ton: 'erreur', texte: (e as ErreurApiClient).message }); }
  }

  return (
    <Ecran>
      <EnTete surtitre="PREMIUM TÉRANGA" titre="Ta journée à Gorée" couleur={couleurs.bougainvillier} />
      {!billet ? <Bandeau ton="alerte" texte={t('premiumRequis')} /> : null}
      <Segment<Type> valeur={type} onChange={(v) => { setType(v); setOuvert(null); }}
        couleur={couleurs.bougainvillier} options={[
          { valeur: 'GUIDE', libelle: t('guides') }, { valeur: 'RESTAURANT', libelle: t('restaurants') },
          { valeur: 'HOTEL', libelle: t('hotels') },
        ]} />
      {retour ? <Bandeau ton={retour.ton} texte={retour.texte} /> : null}
      {partenaires.data?.length === 0 ? <Texte>Aucun partenaire publié pour le moment.</Texte> : null}

      {partenaires.data?.map((p) => (
        <Carte key={p.id} style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: couleurs.ocre,
              alignItems: 'center', justifyContent: 'center' }}>
              <Titre taille={18}>{p.nom.split(' ').map((m) => m[0]).join('').slice(0, 2)}</Titre>
            </View>
            <View style={{ flex: 1 }}>
              <Texte gras style={{ color: couleurs.encre, fontSize: 16 }}>{p.nom}</Texte>
              {p.langues ? <Texte style={{ fontSize: 13 }}>{p.langues}</Texte> : null}
            </View>
            {p.licence_verifiee ? <Etiquette texte={t('licenceVerifiee')} fond={couleurs.ocean}
              couleur={couleurs.blanc} /> : null}
          </View>

          {ouvert === p.id ? (
            <View style={{ gap: 10 }}>
              <Champ libelle={p.type === 'RESTAURANT' ? 'Plats et heure (ex. 2 × thiéboudienne, 13 h)'
                : 'Prestation'} value={description} onChangeText={setDescription} />
              <Champ libelle="Montant (FCFA)" value={montant} keyboardType="number-pad"
                onChangeText={(v) => setMontant(v.replace(/\D/g, ''))} />
              <Texte style={{ fontSize: 12 }}>{t('sequestre')}</Texte>
              <Bouton titre="Confirmer et payer" variante="encre"
                desactive={!description || !Number(montant)} onPress={() => confirmer(p)} />
            </View>
          ) : (
            <Bouton titre={t('reserver')} desactive={!billet} onPress={() => setOuvert(p.id)}
              style={{ backgroundColor: couleurs.bougainvillier, borderColor: couleurs.bougainvillier }} />
          )}
        </Carte>
      ))}
    </Ecran>
  );
}

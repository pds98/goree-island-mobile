/**
 * Marketplace Téranga (pack Premium) : guides à licence vérifiée,
 * restaurants (pré-commande), hôtels. Paiement en SÉQUESTRE : bloqué
 * jusqu'à la prestation, remboursé si elle n'a pas lieu.
 *
 * Sans backend, la liste vient des données de démo (partenaires FICTIFS,
 * badge « Démo », réservation désactivée).
 */
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';

import { ErreurApiClient, listerPartenaires, reserver } from '@/api/client';
import type { Partenaire } from '@/api/types';
import { IconeGuide, IconeHotel, IconeResto } from '@/composants/icones';
import {
  Bandeau, Bouton, Carte, Champ, Ecran, EnTete, Etiquette, Segment, Texte,
} from '@/composants/ui';
import { useT } from '@/i18n';
import { lireBillets, type BilletStocke } from '@/stockage/billets';
import { couleurs, polices } from '@/theme';

type Type = Partenaire['type'];

/** Couleur et icône par famille de partenaire. */
const STYLE_TYPE: Record<Type, { fond: string; Icone: typeof IconeGuide }> = {
  GUIDE: { fond: couleurs.bougainvillier, Icone: IconeGuide },
  RESTAURANT: { fond: couleurs.terracotta, Icone: IconeResto },
  HOTEL: { fond: couleurs.vert, Icone: IconeHotel },
};

/** Étoiles pleines (★) arrondies à la demi-étoile près, sans dépendance. */
function Note({ note, avis, libelle }: { note: number; avis?: number; libelle: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Text style={{ color: couleurs.ocre, fontSize: 14 }}>
        {'★'.repeat(Math.round(note))}{'☆'.repeat(5 - Math.round(note))}
      </Text>
      <Text style={{ fontFamily: polices.texteGras, fontSize: 13, color: couleurs.encre }}>
        {note.toFixed(1)}
      </Text>
      {avis ? <Text style={{ fontFamily: polices.texte, fontSize: 12, color: couleurs.gris }}>
        · {avis} {libelle}</Text> : null}
    </View>
  );
}

export default function Marketplace() {
  const { t } = useT();
  // Les tuiles « Guides / Restaurants / Hôtels » de l'onglet L'île passent ?type=…
  const p = useLocalSearchParams<{ type?: Type }>();
  const [type, setType] = useState<Type>(p.type ?? 'GUIDE');
  const [billet, setBillet] = useState<BilletStocke | null>(null);
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [montant, setMontant] = useState('');
  const [retour, setRetour] = useState<{ ton: 'info' | 'erreur'; texte: string } | null>(null);
  const partenaires = useQuery({ queryKey: ['partenaires', type], queryFn: () => listerPartenaires(type) });
  const enDemo = !!partenaires.data?.some((x) => x.demo);

  useFocusEffect(useCallback(() => {
    lireBillets().then((bs) => setBillet(bs.find((b) => b.billet.famille === 'ENTREE_SITE'
      && b.billet.pack === 'PREMIUM') ?? null));
  }, []));

  async function confirmer(x: Partenaire) {
    if (!billet) return;
    try {
      const r = await reserver({ numero: billet.billet.numero, telephone: billet.telephone,
        partenaire_id: x.id, description, montant: Number(montant), moyen_paiement: 'WAVE' });
      setRetour({ ton: 'info', texte: t('reserveChez', { nom: x.nom, montant: r.montant }) });
      setOuvert(null); setDescription(''); setMontant('');
    } catch (e) { setRetour({ ton: 'erreur', texte: (e as ErreurApiClient).message }); }
  }

  return (
    <Ecran>
      <EnTete surtitre="PREMIUM TÉRANGA" titre={t('taJournee')} couleur={couleurs.bougainvillier} />
      {!billet && !enDemo ? <Bandeau ton="alerte" texte={t('premiumRequis')} /> : null}
      {enDemo ? <Bandeau ton="info" texte={t('partenaireDemo')} /> : null}
      <Segment<Type> valeur={type} onChange={(v) => { setType(v); setOuvert(null); }}
        couleur={couleurs.bougainvillier} options={[
          { valeur: 'GUIDE', libelle: t('guides') }, { valeur: 'RESTAURANT', libelle: t('restaurants') },
          { valeur: 'HOTEL', libelle: t('hotels') },
        ]} />
      {retour ? <Bandeau ton={retour.ton} texte={retour.texte} /> : null}
      {partenaires.isError ? <Bandeau ton="erreur" texte={t('erreurReseau')} /> : null}
      {partenaires.data?.length === 0 ? <Texte>{t('aucunPartenaire')}</Texte> : null}

      {partenaires.data?.map((x) => {
        const { fond, Icone } = STYLE_TYPE[x.type];
        const initiales = x.nom.split(' ').map((m) => m[0]).join('').slice(0, 2).toUpperCase();
        return (
          <Carte key={x.id} style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              {/* Avatar : initiales pour un guide, icône pour un lieu */}
              <View style={{ width: 56, height: 56, borderRadius: x.type === 'GUIDE' ? 28 : 16,
                backgroundColor: fond, alignItems: 'center', justifyContent: 'center' }}>
                {x.type === 'GUIDE' ? (
                  <Text style={{ fontFamily: polices.titre, fontSize: 19, color: couleurs.blanc }}>{initiales}</Text>
                ) : <Icone couleur={couleurs.blanc} />}
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Texte gras style={{ color: couleurs.encre, fontSize: 16 }}>{x.nom}</Texte>
                {x.note ? <Note note={x.note} avis={x.avis} libelle={t('avisVerifies')} /> : null}
                {x.langues ? <Texte style={{ fontSize: 12 }}>{x.langues}</Texte> : null}
              </View>
              {x.demo ? <Etiquette texte={t('demo')} fond={couleurs.sableFonce} couleur={couleurs.gris} /> : null}
            </View>

            {x.description ? <Texte style={{ fontSize: 13 }}>{x.description}</Texte> : null}

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {x.tarif ? <Etiquette texte={x.tarif} fond={couleurs.ocreClair} couleur={couleurs.encre} /> : null}
              {x.licence_verifiee ? <Etiquette texte={t('licenceVerifiee')} fond={couleurs.ocean}
                couleur={couleurs.blanc} /> : null}
            </View>

            {ouvert === x.id ? (
              <View style={{ gap: 10 }}>
                <Champ libelle={x.type === 'RESTAURANT' ? t('platsHeure') : t('prestation')}
                  value={description} onChangeText={setDescription} />
                <Champ libelle={t('montantFcfa')} value={montant} keyboardType="number-pad"
                  onChangeText={(v) => setMontant(v.replace(/\D/g, ''))} />
                <Texte style={{ fontSize: 12 }}>{t('sequestre')}</Texte>
                <Bouton titre={t('confirmerPayer')} variante="encre"
                  desactive={!description || !Number(montant)} onPress={() => confirmer(x)} />
              </View>
            ) : (
              <Bouton titre={t('reserver')} desactive={!billet || !!x.demo} onPress={() => setOuvert(x.id)}
                style={{ backgroundColor: couleurs.bougainvillier, borderColor: couleurs.bougainvillier }} />
            )}
          </Carte>
        );
      })}
    </Ecran>
  );
}

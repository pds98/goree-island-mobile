/**
 * PARCOURS 1 — Achat d'une traversée.
 * Tarif unique, nom + téléphone, AUCUNE pièce d'identité.
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import {
  acheterChaloupe, aujourdHui, dateDakar, ErreurApiClient, heureDakar, listerRotations,
} from '@/api/client';
import type { MoyenPaiement, Trajet } from '@/api/types';
import {
  Bandeau, Bouton, Champ, Compteur, Ecran, Etiquette, formaterFcfa, Frise, Segment, Texte, Titre,
} from '@/composants/ui';
import { useT } from '@/i18n';
import { enregistrerBillets } from '@/stockage/billets';
import { couleurs, polices } from '@/theme';

// Miroir de app/tarifs.py — VALEURS PROVISOIRES. Le montant final est
// toujours celui calculé par le serveur (affiché après paiement).
const PRIX_PAR_PASSAGER: Record<Trajet, number> = { ALLER_SIMPLE: 750, ALLER_RETOUR: 1_500 };

export default function Chaloupe() {
  const { t } = useT();
  const [trajet, setTrajet] = useState<Trajet>('ALLER_RETOUR');
  const [jour, setJour] = useState(aujourdHui());
  const [rotationId, setRotationId] = useState<string | null>(null);
  const [passagers, setPassagers] = useState(1);
  const [nom, setNom] = useState('');
  const [telephone, setTelephone] = useState('+221 ');
  const [moyen, setMoyen] = useState<MoyenPaiement>('WAVE');

  const rotations = useQuery({ queryKey: ['rotations'], queryFn: listerRotations });
  const departs = (rotations.data ?? []).filter((r) => r.depart === 'Dakar'
    && dateDakar(r.heure_prevue) === jour);

  const achat = useMutation({
    mutationFn: () => acheterChaloupe({
      nom, telephone: telephone.replace(/\s/g, ''), date_visite: jour, trajet, passagers,
      rotation_id: rotationId, moyen_paiement: moyen,
    }),
    onSuccess: async (commande) => {
      await enregistrerBillets(commande.billets.map((billet) => ({
        billet, telephone: telephone.replace(/\s/g, ''), titulaire: nom,
        enregistreLe: new Date().toISOString(),
      })));
      router.push({ pathname: '/billet/[numero]', params: { numero: commande.billets[0].numero } });
    },
  });

  const formulaireValide = nom.trim().length >= 2 && telephone.replace(/\D/g, '').length >= 9;

  return (
    <Ecran style={{ padding: 0, gap: 0 }}>
      <Image source={require('@/assets/images/goree/goree-chaloupe.jpg')} contentFit="cover"
        style={{ height: 160 }} accessibilityLabel="Chaloupe traversant vers Gorée" />
      <View style={{ backgroundColor: couleurs.ocean, padding: 20, flexDirection: 'row',
        alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Titre taille={26} style={{ color: couleurs.blanc }}>{t('chaloupeTitre')}</Titre>
          <Texte style={{ color: couleurs.oceanClair, fontSize: 13 }}>Dakar ⇄ Gorée · ~20 min</Texte>
        </View>
        <Etiquette texte={t('tarifUnique')} incline />
      </View>
      <Frise />

      <View style={{ padding: 20, gap: 16 }}>
        <Segment<Trajet> valeur={trajet} onChange={setTrajet} options={[
          { valeur: 'ALLER_RETOUR', libelle: t('allerRetour') },
          { valeur: 'ALLER_SIMPLE', libelle: t('allerSimple') },
        ]} />

        <Segment valeur={jour} onChange={(j) => { setJour(j); setRotationId(null); }} options={[
          { valeur: aujourdHui(), libelle: "Aujourd'hui" },
          { valeur: aujourdHui(1), libelle: 'Demain' },
          { valeur: aujourdHui(2), libelle: 'Après-demain' },
        ]} />

        <View style={{ gap: 8 }}>
          <Texte gras>{t('departsDakar')}</Texte>
          {departs.length === 0 ? (
            <Texte style={{ fontSize: 13, color: couleurs.gris }}>
              Horaires non publiés pour ce jour : ton billet sera valable sur tout départ de la journée.
            </Texte>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {departs.map((r) => {
                const actif = r.id === rotationId;
                return (
                  <Pressable key={r.id} accessibilityRole="radio" accessibilityState={{ selected: actif }}
                    onPress={() => setRotationId(actif ? null : r.id)}
                    style={{ width: 84, minHeight: 72, borderRadius: 16, alignItems: 'center',
                      justifyContent: 'center', gap: 4, borderWidth: 1,
                      borderColor: actif ? couleurs.ocean : couleurs.bordure,
                      backgroundColor: actif ? couleurs.ocean : couleurs.blanc }}>
                    <Text style={{ fontFamily: polices.titre, fontSize: 19,
                      color: actif ? couleurs.blanc : couleurs.encre }}>{heureDakar(r.heure_prevue)}</Text>
                    <Text style={{ fontFamily: polices.texteGras, fontSize: 11,
                      color: actif ? couleurs.oceanClair : r.retard_minutes ? '#8A5A00' : couleurs.vert }}>
                      {r.retard_minutes ? `+${r.retard_minutes} min` : t('aLHeure')}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        <Compteur libelle={t('passagers')} valeur={passagers} min={1} max={10} onChange={setPassagers}
          sous={`${formaterFcfa(PRIX_PAR_PASSAGER[trajet])} / pers. · ${t('tarifUnique').toLowerCase()}`} />

        <Champ libelle={t('nomPrenom')} value={nom} onChangeText={setNom} autoComplete="name"
          textContentType="name" />
        <Champ libelle={t('telephone')} value={telephone} onChangeText={setTelephone}
          keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" />

        <Segment<MoyenPaiement> valeur={moyen} onChange={setMoyen} options={[
          { valeur: 'WAVE', libelle: 'Wave' },
          { valeur: 'ORANGE_MONEY', libelle: 'Orange Money' },
          { valeur: 'CARTE', libelle: 'Carte' },
        ]} />

        <Texte style={{ fontSize: 12, color: couleurs.gris }}>{t('aucuneIdentite')}</Texte>

        {achat.error ? <Bandeau ton="erreur" texte={(achat.error as ErreurApiClient).message} /> : null}

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View>
            <Texte style={{ fontSize: 12 }}>{t('total')}</Texte>
            <Titre taille={20}>{formaterFcfa(PRIX_PAR_PASSAGER[trajet] * passagers)}</Titre>
          </View>
          <Bouton titre={t('payer')} variante="ocean" style={{ flex: 1 }}
            chargement={achat.isPending} desactive={!formulaireValide} onPress={() => achat.mutate()} />
        </View>
      </View>
    </Ecran>
  );
}

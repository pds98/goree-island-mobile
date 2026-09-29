/**
 * PARCOURS 2 — Visiter l'île.
 * C'est ICI, et seulement ici, qu'on distingue national et international.
 * National : vérification CNI + selfie (écran /identite), enfants accompagnants.
 * International : nom + téléphone, adultes et enfants accompagnants.
 */
import { useMutation } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { acheterEntreeSite, aujourdHui, ErreurApiClient } from '@/api/client';
import type { MoyenPaiement, NomPack } from '@/api/types';
import {
  IconeCasque, IconeCircuit, IconeCoche, IconeCouches, IconeGuide, IconeHotel, IconeResto,
} from '@/composants/icones';
import {
  Bandeau, Bouton, Carte, Champ, Compteur, Ecran, formaterFcfa, Frise, Segment, Texte, Titre,
} from '@/composants/ui';
import { useT } from '@/i18n';
import { enregistrerBillets } from '@/stockage/billets';
import { couleurs } from '@/theme';

type Nat = 'NATIONAL' | 'INTERNATIONAL';

// Miroir de app/tarifs.py — VALEURS PROVISOIRES (le serveur fait foi).
const PRIX = { NATIONAL: { adulte: 500, enfant: 200 }, INTERNATIONAL: { adulte: 3_000, enfant: 1_500 } };
const PACKS: { niveau: NomPack; nom: string; prix: number; contenu: string }[] = [
  { niveau: 'DECOUVERTE', nom: 'Découverte', prix: 0, contenu: 'Histoire en bref, galerie' },
  { niveau: 'ESSENTIEL', nom: 'Essentiel', prix: 2_000, contenu: 'Audio-guide GPS 5 langues, circuits' },
  { niveau: 'PREMIUM', nom: 'Premium Téranga', prix: 5_000, contenu: 'Guides, restos, hôtels' },
];

export default function Ile() {
  const { t } = useT();
  // Retour de l'écran /identite avec le résultat de la vérification.
  const p = useLocalSearchParams<{ verification?: string; cni4?: string; nomCarte?: string; pack?: NomPack }>();

  const [nat, setNat] = useState<Nat>(p.verification ? 'NATIONAL' : 'INTERNATIONAL');
  const [enfants, setEnfants] = useState(0);
  const [adultes, setAdultes] = useState(0);
  const [pack, setPack] = useState<NomPack>(p.pack ?? 'DECOUVERTE');
  const [jour, setJour] = useState(aujourdHui());
  const [nom, setNom] = useState(p.nomCarte ?? '');
  const [telephone, setTelephone] = useState('+221 ');
  const [moyen, setMoyen] = useState<MoyenPaiement>('WAVE');

  // Les paramètres changent quand on revient de /identite ou de /packs :
  // on ajuste l'état pendant le rendu (motif recommandé par React, sans effet).
  const [derniersParams, setDerniersParams] = useState({ v: p.verification, pack: p.pack });
  if (p.verification !== derniersParams.v || p.pack !== derniersParams.pack) {
    setDerniersParams({ v: p.verification, pack: p.pack });
    if (p.verification) setNat('NATIONAL');
    if (p.nomCarte) setNom(p.nomCarte);
    if (p.pack) setPack(p.pack);
  }

  const verifie = nat === 'NATIONAL' && !!p.verification;
  const adultesEffectifs = nat === 'NATIONAL' ? 0 : adultes; // un adulte national a sa propre CNI
  const prixPack = PACKS.find((x) => x.niveau === pack)!.prix;
  const total = PRIX[nat].adulte * (1 + adultesEffectifs) + PRIX[nat].enfant * enfants + prixPack;

  const achat = useMutation({
    mutationFn: () => acheterEntreeSite({
      nom, telephone: telephone.replace(/\s/g, ''), date_visite: jour,
      verification_id: nat === 'NATIONAL' ? p.verification : null,
      adultes_supp: adultesEffectifs, enfants, pack, moyen_paiement: moyen,
    }),
    onSuccess: async (commande) => {
      await enregistrerBillets(commande.billets.map((billet) => ({
        billet, telephone: telephone.replace(/\s/g, ''), titulaire: nom,
        enregistreLe: new Date().toISOString(),
      })));
      router.setParams({ verification: undefined, cni4: undefined, nomCarte: undefined });
      router.push({ pathname: '/billet/[numero]', params: { numero: commande.billets[0].numero } });
    },
  });

  const pret = nom.trim().length >= 2 && telephone.replace(/\D/g, '').length >= 9
    && (nat === 'INTERNATIONAL' || verifie);

  return (
    <Ecran style={{ padding: 0, gap: 0 }}>
      <Image source={require('@/assets/images/goree/goree-rue.jpg')} contentFit="cover"
        style={{ height: 170 }} accessibilityLabel="Ruelle colorée de Gorée" />
      <View style={{ backgroundColor: couleurs.terracotta, padding: 20 }}>
        <Titre taille={28} style={{ color: couleurs.blanc }}>{t('ileTitre')}</Titre>
        <Texte style={{ color: couleurs.terracottaClair, fontSize: 13 }}>{t('ileSous')}</Texte>
      </View>
      <Frise />

      <View style={{ padding: 20, gap: 16 }}>
        <Carte style={{ borderWidth: 2, borderColor: couleurs.terracotta, gap: 14 }}>
          <Titre taille={19}>{t('entreeSite')}</Titre>

          <Segment<Nat> valeur={nat} onChange={setNat} couleur={couleurs.terracotta} options={[
            { valeur: 'NATIONAL', libelle: t('national'), sous: t('nationalSous') },
            { valeur: 'INTERNATIONAL', libelle: t('international'), sous: t('internationalSous') },
          ]} />

          <Segment valeur={jour} onChange={setJour} couleur={couleurs.terracotta} options={[
            { valeur: aujourdHui(), libelle: "Aujourd'hui" },
            { valeur: aujourdHui(1), libelle: 'Demain' },
            { valeur: aujourdHui(2), libelle: 'Après-demain' },
          ]} />

          {nat === 'NATIONAL' && (verifie ? (
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', padding: 12,
              borderRadius: 14, backgroundColor: couleurs.vertClair }}>
              <IconeCoche couleur={couleurs.vert} />
              <Texte gras style={{ color: '#1F4D33', flex: 1 }}>
                {t('identiteVerifiee')} · CNI ••••{p.cni4}
              </Texte>
            </View>
          ) : (
            <Bouton titre={t('verifierIdentite')} variante="encre" onPress={() => router.push('/identite')} />
          ))}

          {nat === 'INTERNATIONAL' ? (
            <Compteur libelle={t('adultes')} valeur={adultes} max={9} onChange={setAdultes}
              couleur={couleurs.terracotta} sous={`${formaterFcfa(PRIX.INTERNATIONAL.adulte)} / adulte`} />
          ) : null}
          <Compteur libelle={t('enfants')} valeur={enfants} max={6} onChange={setEnfants}
            couleur={couleurs.terracotta} sous={nat === 'NATIONAL'
              ? 'Le parent titulaire doit être présent au contrôle' : `${formaterFcfa(PRIX.INTERNATIONAL.enfant)} / enfant`} />

          <Texte gras>{t('pack')}</Texte>
          <View style={{ gap: 8 }}>
            {PACKS.map((x) => {
              const actif = x.niveau === pack;
              return (
                <Pressable key={x.niveau} accessibilityRole="radio" accessibilityState={{ selected: actif }}
                  onPress={() => setPack(x.niveau)}
                  style={{ padding: 12, borderRadius: 14, borderWidth: 2, flexDirection: 'row', gap: 10,
                    alignItems: 'center', borderColor: actif ? couleurs.terracotta : couleurs.bordure,
                    backgroundColor: actif ? couleurs.terracottaClair : couleurs.blanc }}>
                  <View style={{ flex: 1 }}>
                    <Texte gras style={{ color: couleurs.encre }}>{x.nom}</Texte>
                    <Texte style={{ fontSize: 12 }}>{x.contenu}</Texte>
                  </View>
                  <Texte gras>{x.prix ? formaterFcfa(x.prix) : 'Gratuit'}</Texte>
                </Pressable>
              );
            })}
          </View>

          <Champ libelle={t('nomPrenom')} value={nom} onChangeText={setNom} />
          <Champ libelle={t('telephone')} value={telephone} onChangeText={setTelephone}
            keyboardType="phone-pad" />
          <Segment<MoyenPaiement> valeur={moyen} onChange={setMoyen} couleur={couleurs.terracotta} options={[
            { valeur: 'WAVE', libelle: 'Wave' }, { valeur: 'ORANGE_MONEY', libelle: 'Orange Money' },
            { valeur: 'CARTE', libelle: 'Carte' },
          ]} />

          {achat.error ? <Bandeau ton="erreur" texte={(achat.error as ErreurApiClient).message} /> : null}
          <Bouton titre={`${t('acheterEntree')} · ${formaterFcfa(total)}`} chargement={achat.isPending}
            desactive={!pret} onPress={() => achat.mutate()} />
        </Carte>

        <Titre taille={19}>{t('surPlace')}</Titre>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <Tuile href="/circuits" fond={couleurs.ocre} texte={couleurs.encre} titre={t('circuits')}
            icone={<IconeCircuit couleur={couleurs.encre} />} />
          <Tuile href="/audio-guide" fond={couleurs.ocean} texte={couleurs.blanc} titre={t('audioGuide')}
            icone={<IconeCasque couleur={couleurs.blanc} />} />
          <Tuile href="/marketplace" fond={couleurs.bougainvillier} texte={couleurs.blanc} titre={t('guides')}
            icone={<IconeGuide couleur={couleurs.blanc} />} />
          <Tuile href="/marketplace" fond={couleurs.terracottaClair} texte={couleurs.encre}
            titre={t('restaurants')} icone={<IconeResto couleur={couleurs.terracotta} />} />
          <Tuile href="/marketplace" fond={couleurs.vert} texte={couleurs.blanc} titre={t('hotels')}
            icone={<IconeHotel couleur={couleurs.blanc} />} />
          <Tuile href="/packs" fond={couleurs.encre} texte={couleurs.blanc} titre={t('packs')}
            icone={<IconeCouches couleur={couleurs.ocre} />} />
        </View>
      </View>
    </Ecran>
  );
}

function Tuile({ href, fond, texte, titre, icone }: {
  href: '/circuits' | '/audio-guide' | '/marketplace' | '/packs'; fond: string; texte: string;
  titre: string; icone: ReactNode;
}) {
  return (
    <Link href={href} asChild>
      <Pressable accessibilityRole="link" style={{ width: '31%', height: 86, borderRadius: 18,
        backgroundColor: fond, padding: 12, justifyContent: 'space-between' }}>
        {icone}
        <Texte gras style={{ color: texte, fontSize: 14 }}>{titre}</Texte>
      </Pressable>
    </Link>
  );
}

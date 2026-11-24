/**
 * Choix du moyen de paiement — version COMPACTE.
 *
 * À l'écran : UNE seule ligne « Moyen de paiement · Wave › ».
 * Un toucher ouvre un panneau qui glisse du bas, rangé en deux groupes :
 *   - Mobile money          : Wave, Orange Money, Free Money, Wizall, Djamo
 *   - Cartes & portefeuilles : carte bancaire, Apple Pay (iPhone), Google Pay (Android), PayPal
 * Choisir un moyen referme le panneau aussitôt.
 *
 * Le DERNIER moyen utilisé est mémorisé sur le téléphone : à l'achat suivant,
 * il est déjà présélectionné (le visiteur n'ouvre même plus le panneau).
 *
 * AJOUTER UN MOYEN : une ligne dans `MOYENS`.
 * METTRE LE VRAI LOGO : `logo: require('@/assets/images/paiement/wave.png')`.
 *   Sans logo, une pastille aux couleurs de la marque (couleurs APPROXIMATIVES).
 * Seuls les moyens dont `api` est renseigné sont acceptés par le backend
 * (WAVE, ORANGE_MONEY, CARTE) ; les autres affichent « Bientôt ».
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import type { MoyenPaiement } from '@/api/types';
import { Titre } from '@/composants/ui';
import { useT } from '@/i18n';
import { couleurs, espace, polices, rayon } from '@/theme';

const CLE_DERNIER = 'goree.paiement.dernier';

type Groupe = 'mobile' | 'carte';
type DefinitionMoyen = {
  id: string;
  nom: string;
  /** Code envoyé à l'API. `null` = pas encore géré par le backend (« Bientôt »). */
  api: MoyenPaiement | null;
  groupe: Groupe;
  /** Visuel de repli tant qu'il n'y a pas de logo officiel. */
  sigle: string;
  fond: string;
  texte: string;
  logo?: number;
  /** Limite le moyen à certaines plateformes (Apple Pay → iOS, Google Pay → Android). */
  plateformes?: (typeof Platform.OS)[];
};

export const MOYENS: DefinitionMoyen[] = [
  // --- Mobile money ---
  { id: 'wave', nom: 'Wave', api: 'WAVE', groupe: 'mobile', sigle: 'W', fond: '#1DC8F2', texte: '#FFFFFF' },
  { id: 'orange', nom: 'Orange Money', api: 'ORANGE_MONEY', groupe: 'mobile', sigle: 'OM', fond: '#FF7900', texte: '#FFFFFF' },
  { id: 'free', nom: 'Free Money', api: null, groupe: 'mobile', sigle: 'F', fond: '#CD1E25', texte: '#FFFFFF' },
  { id: 'wizall', nom: 'Wizall', api: null, groupe: 'mobile', sigle: 'Wz', fond: '#1F3C88', texte: '#FFFFFF' },
  { id: 'djamo', nom: 'Djamo', api: null, groupe: 'mobile', sigle: 'D', fond: '#111111', texte: '#FFFFFF' },
  // --- Cartes & portefeuilles ---
  { id: 'carte', nom: 'Carte', api: 'CARTE', groupe: 'carte', sigle: '💳', fond: couleurs.encre, texte: '#FFFFFF' },
  { id: 'apple', nom: 'Apple Pay', api: null, groupe: 'carte', sigle: '', fond: '#000000', texte: '#FFFFFF',
    plateformes: ['ios', 'web'] },
  { id: 'google', nom: 'Google Pay', api: null, groupe: 'carte', sigle: 'G', fond: '#FFFFFF', texte: '#4285F4',
    plateformes: ['android', 'web'] },
  { id: 'paypal', nom: 'PayPal', api: null, groupe: 'carte', sigle: 'P', fond: '#003087', texte: '#FFFFFF' },
];

const visibles = MOYENS.filter((m) => !m.plateformes || m.plateformes.includes(Platform.OS));

/** Pastille de marque (logo officiel si fourni). */
function Pastille({ m, taille = 40 }: { m: DefinitionMoyen; taille?: number }) {
  if (m.logo) {
    return <Image source={m.logo} contentFit="contain" style={{ width: taille, height: taille }}
      accessibilityIgnoresInvertColors />;
  }
  return (
    <View style={{ width: taille, height: taille, borderRadius: taille * 0.28, alignItems: 'center',
      justifyContent: 'center', backgroundColor: m.fond,
      borderWidth: m.fond === '#FFFFFF' ? 1 : 0, borderColor: couleurs.bordure }}>
      <Text style={{ fontFamily: polices.titre, fontSize: m.sigle.length > 1 ? taille * 0.34 : taille * 0.45,
        color: m.texte }}>{m.sigle}</Text>
    </View>
  );
}

function Coche({ couleur }: { couleur: string }) {
  return (
    <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: couleur, alignItems: 'center',
      justifyContent: 'center' }}>
      <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
        <Path d="M5 12.5l4.5 4.5L19 7.5" stroke={couleurs.blanc} strokeWidth={3.5}
          strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  );
}

export function MoyensPaiement({ valeur, onChange, couleur = couleurs.ocean }: {
  valeur: MoyenPaiement;
  onChange: (m: MoyenPaiement) => void;
  /** Couleur du parcours (bleu chaloupe, terracotta île). */
  couleur?: string;
}) {
  const { t, rtl } = useT();
  const marges = useSafeAreaInsets();
  const [ouvert, setOuvert] = useState(false);
  const nomAffiche = (m: DefinitionMoyen) => (m.id === 'carte' ? t('carte') : m.nom);
  const choisi = MOYENS.find((m) => m.api === valeur) ?? MOYENS[0];

  // Présélection du dernier moyen utilisé (une fois, au montage).
  useEffect(() => {
    void AsyncStorage.getItem(CLE_DERNIER).then((v) => {
      if (v && MOYENS.some((m) => m.api === v)) onChange(v as MoyenPaiement);
    }).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function choisir(m: DefinitionMoyen) {
    if (!m.api) return;
    onChange(m.api);
    void AsyncStorage.setItem(CLE_DERNIER, m.api).catch(() => undefined);
    setOuvert(false);
  }

  return (
    <>
      {/* La ligne unique */}
      <Pressable accessibilityRole="button" accessibilityLabel={`${t('moyenPaiement')} : ${nomAffiche(choisi)}`}
        accessibilityHint={t('changerMoyen')} onPress={() => setOuvert(true)}
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64,
          paddingHorizontal: 14, paddingVertical: 10, borderRadius: rayon.l, borderWidth: 1.5,
          borderColor: couleurs.bordure, backgroundColor: couleurs.blanc, opacity: pressed ? 0.8 : 1 })}>
        <Pastille m={choisi} taille={38} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: polices.texte, fontSize: 12, color: couleurs.gris }}>{t('moyenPaiement')}</Text>
          <Text style={{ fontFamily: polices.texteGras, fontSize: 16, color: couleurs.encre }}>{nomAffiche(choisi)}</Text>
        </View>
        <Text style={{ fontFamily: polices.texteGras, fontSize: 14, color: couleur }}>{t('changer')}</Text>
      </Pressable>

      {/* Le panneau */}
      <Modal visible={ouvert} transparent animationType="slide" onRequestClose={() => setOuvert(false)}
        statusBarTranslucent>
        <View style={{ flex: 1, direction: rtl ? 'rtl' : 'ltr' }}>
          <Pressable style={{ flex: 1, backgroundColor: 'rgba(26,20,16,0.55)' }} onPress={() => setOuvert(false)}
            accessibilityRole="button" accessibilityLabel={t('fermer')} />
          <View accessibilityViewIsModal style={{ maxHeight: '82%', backgroundColor: couleurs.sable,
            borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: espace.m }}>
            <View style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3,
              backgroundColor: couleurs.bordureForte }} />
            <ScrollView contentContainerStyle={{ padding: espace.xl, paddingBottom: espace.xl + marges.bottom,
              gap: espace.l }}>
              <Titre taille={22}>{t('choisirMoyen')}</Titre>
              {(['mobile', 'carte'] as Groupe[]).map((g) => (
                <View key={g} style={{ gap: 8 }}>
                  <Text style={{ fontFamily: polices.texteGras, fontSize: 12, letterSpacing: 1.2,
                    color: couleurs.gris }}>{(g === 'mobile' ? t('groupeMobileMoney') : t('groupeCartes')).toUpperCase()}</Text>
                  <View accessibilityRole="radiogroup" style={{ backgroundColor: couleurs.blanc, borderRadius: rayon.l,
                    borderWidth: 1, borderColor: couleurs.bordure, overflow: 'hidden' }}>
                    {visibles.filter((m) => m.groupe === g).map((m, i) => {
                      const dispo = m.api !== null;
                      const actif = dispo && m.api === valeur;
                      return (
                        <Pressable key={m.id} disabled={!dispo} onPress={() => choisir(m)} accessibilityRole="radio"
                          accessibilityState={{ selected: actif, disabled: !dispo }}
                          accessibilityLabel={dispo ? nomAffiche(m) : `${nomAffiche(m)} · ${t('bientot')}`}
                          style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12,
                            minHeight: 60, paddingHorizontal: 14, borderTopWidth: i ? 1 : 0,
                            borderTopColor: couleurs.bordure,
                            backgroundColor: actif ? `${couleur}10` : pressed ? couleurs.sable : couleurs.blanc })}>
                          <View style={{ opacity: dispo ? 1 : 0.4 }}><Pastille m={m} taille={36} /></View>
                          <Text style={{ flex: 1, fontFamily: actif ? polices.texteGras : polices.texteMoyen,
                            fontSize: 15, color: dispo ? couleurs.encre : couleurs.gris }}>{nomAffiche(m)}</Text>
                          {actif ? <Coche couleur={couleur} /> : !dispo ? (
                            <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
                              backgroundColor: couleurs.sableFonce }}>
                              <Text style={{ fontFamily: polices.texteGras, fontSize: 10, color: couleurs.gris }}>
                                {t('bientot')}</Text>
                            </View>
                          ) : null}
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))}
              <Text style={{ fontFamily: polices.texte, fontSize: 12, color: couleurs.gris, textAlign: 'center' }}>
                {t('paiementJamaisStocke')}</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

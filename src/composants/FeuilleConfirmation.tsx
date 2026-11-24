/**
 * Feuille de confirmation qui glisse du bas de l'écran.
 *
 * Utilisée avant toute action importante :
 *   - PAIEMENT : récapitulatif (lignes + total + moyen de paiement) ;
 *   - SUPPRESSION : message d'avertissement, bouton rouge ;
 *   - SAISIE : un champ texte (ex. renommer un billet).
 *
 * C'est une <Modal> native : sur iPhone elle passe au-dessus de toute la
 * navigation et reçoit les touchers sans souci (contrairement à une couche
 * dessinée par-dessus la pile d'écrans).
 */
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Bouton, Texte, Titre } from '@/composants/ui';
import { useT } from '@/i18n';
import { couleurs, espace, polices, rayon } from '@/theme';

export type LigneRecap = { libelle: string; valeur: string };
type Ton = 'ocean' | 'terracotta' | 'danger' | 'encre';

const COULEUR_TON: Record<Ton, string> = {
  ocean: couleurs.ocean, terracotta: couleurs.terracotta, danger: couleurs.rouge, encre: couleurs.encre,
};

export function FeuilleConfirmation({
  visible, titre, message, lignes, total, enfants, libelleConfirmer, ton = 'encre', chargement = false,
  desactive = false, onConfirmer, onAnnuler, libelleAnnuler,
}: {
  visible: boolean;
  titre: string;
  message?: string;
  lignes?: LigneRecap[];
  total?: string;                  // montant déjà formaté
  enfants?: ReactNode;             // contenu libre (ex. champ de saisie)
  libelleConfirmer: string;
  libelleAnnuler?: string;
  ton?: Ton;
  chargement?: boolean;
  desactive?: boolean;
  onConfirmer: () => void;
  onAnnuler: () => void;
}) {
  const { t, rtl } = useT();
  const marges = useSafeAreaInsets();
  const couleur = COULEUR_TON[ton];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onAnnuler}
      statusBarTranslucent>
      <KeyboardAvoidingView style={{ flex: 1, direction: rtl ? 'rtl' : 'ltr' }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Fond assombri : toucher en dehors = annuler */}
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(26,20,16,0.55)' }} onPress={onAnnuler}
          accessibilityRole="button" accessibilityLabel={libelleAnnuler ?? t('annuler')} />

        <View accessibilityViewIsModal style={{ backgroundColor: couleurs.sable,
          borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: espace.xl,
          paddingTop: espace.m, paddingBottom: espace.xl + marges.bottom, gap: espace.l }}>
          <View style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3,
            backgroundColor: couleurs.bordureForte }} />
          {/* Liseré de couleur : bleu chaloupe, terracotta île, rouge suppression */}
          <View style={{ height: 4, width: 56, borderRadius: 2, backgroundColor: couleur }} />
          <Titre taille={22}>{titre}</Titre>
          {message ? <Texte>{message}</Texte> : null}

          {lignes?.length ? (
            <View style={{ backgroundColor: couleurs.blanc, borderRadius: rayon.l, borderWidth: 1,
              borderColor: couleurs.bordure, paddingHorizontal: espace.l }}>
              {lignes.map((l, i) => (
                <View key={l.libelle} style={{ flexDirection: 'row', justifyContent: 'space-between',
                  gap: espace.m, paddingVertical: 11, borderTopWidth: i ? 1 : 0, borderTopColor: couleurs.bordure }}>
                  <Texte style={{ color: couleurs.gris, fontSize: 14 }}>{l.libelle}</Texte>
                  <Texte gras style={{ color: couleurs.encre, fontSize: 14, flexShrink: 1, textAlign: 'right' }}>
                    {l.valeur}
                  </Texte>
                </View>
              ))}
            </View>
          ) : null}

          {enfants}

          {total ? (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Texte gras style={{ fontFamily: polices.texteGras }}>{t('total')}</Texte>
              <Titre taille={26} style={{ color: couleur }}>{total}</Titre>
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', gap: espace.m }}>
            <Bouton titre={libelleAnnuler ?? t('annuler')} variante="contour" onPress={onAnnuler}
              style={{ flex: 1 }} />
            <Bouton titre={libelleConfirmer} onPress={onConfirmer} chargement={chargement}
              desactive={desactive} style={{ flex: 1.6, backgroundColor: couleur, borderColor: couleur }} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

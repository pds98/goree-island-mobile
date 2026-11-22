/**
 * Choix du moyen de paiement, en GRILLE DE TUILES (3 par ligne).
 *
 * Pourquoi une grille plutôt que de longs boutons ? Elle reste lisible et
 * compacte quel que soit le nombre de moyens (9 aujourd'hui = 3 lignes).
 *
 * AJOUTER UN MOYEN : une ligne dans `MOYENS` ci-dessous.
 * METTRE LE VRAI LOGO : déposer l'image dans assets/images/paiement/ puis
 *   renseigner `logo: require('@/assets/images/paiement/wave.png')`.
 *   Sans logo, la tuile affiche un sigle aux couleurs de la marque
 *   (couleurs APPROXIMATIVES, à remplacer par les chartes officielles).
 *
 * Seuls les moyens dont `api` est renseigné sont acceptés par le backend
 * (WAVE, ORANGE_MONEY, CARTE). Les autres affichent « Bientôt » et ne sont
 * pas sélectionnables : il suffira d'ajouter leur code à `MoyenPaiement`
 * (api/types.ts) et côté serveur, puis de remplir `api` ici.
 */
import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import type { MoyenPaiement } from '@/api/types';
import { useT } from '@/i18n';
import { couleurs, polices } from '@/theme';

type DefinitionMoyen = {
  id: string;
  nom: string;
  /** Code envoyé à l'API. `null` = pas encore géré par le backend (« Bientôt »). */
  api: MoyenPaiement | null;
  /** Visuel de repli tant qu'il n'y a pas de logo officiel. */
  sigle: string;
  fond: string;
  texte: string;
  /** Résultat d'un `require('@/assets/images/paiement/xxx.png')`. */
  logo?: number;
};

export const MOYENS: DefinitionMoyen[] = [
  // --- Acceptés par le backend aujourd'hui ---
  { id: 'wave', nom: 'Wave', api: 'WAVE', sigle: 'W', fond: '#1DC8F2', texte: '#FFFFFF' },
  { id: 'orange', nom: 'Orange Money', api: 'ORANGE_MONEY', sigle: 'OM', fond: '#FF7900', texte: '#FFFFFF' },
  { id: 'carte', nom: 'Carte', api: 'CARTE', sigle: '💳', fond: couleurs.encre, texte: '#FFFFFF' },
  // --- À brancher côté backend ---
  { id: 'free', nom: 'Free Money', api: null, sigle: 'F', fond: '#CD1E25', texte: '#FFFFFF' },
  { id: 'wizall', nom: 'Wizall', api: null, sigle: 'Wz', fond: '#1F3C88', texte: '#FFFFFF' },
  { id: 'djamo', nom: 'Djamo', api: null, sigle: 'D', fond: '#111111', texte: '#FFFFFF' },
  { id: 'apple', nom: 'Apple Pay', api: null, sigle: '', fond: '#000000', texte: '#FFFFFF' },
  { id: 'google', nom: 'Google Pay', api: null, sigle: 'G', fond: '#FFFFFF', texte: '#4285F4' },
  { id: 'paypal', nom: 'PayPal', api: null, sigle: 'P', fond: '#003087', texte: '#FFFFFF' },
];

function Coche() {
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
      <Path d="M5 12.5l4.5 4.5L19 7.5" stroke={couleurs.blanc} strokeWidth={3.5}
        strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function MoyensPaiement({ valeur, onChange, couleur = couleurs.ocean }: {
  valeur: MoyenPaiement;
  onChange: (m: MoyenPaiement) => void;
  /** Couleur du parcours pour la tuile sélectionnée. */
  couleur?: string;
}) {
  const { t } = useT();
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontFamily: polices.texteGras, fontSize: 13, color: couleurs.encreDouce }}>
        {t('moyenPaiement')}
      </Text>
      <View accessibilityRole="radiogroup"
        style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 }}>
        {MOYENS.map((m) => {
          const disponible = m.api !== null;
          const choisi = disponible && m.api === valeur;
          // Seul « Carte » se traduit ; les noms de marques restent tels quels.
          const nomAffiche = (x: DefinitionMoyen) => (x.id === 'carte' ? t('carte') : x.nom);
          return (
            <Pressable key={m.id} disabled={!disponible} onPress={() => m.api && onChange(m.api)}
              accessibilityRole="radio"
              accessibilityState={{ selected: choisi, disabled: !disponible }}
              accessibilityLabel={disponible ? nomAffiche(m) : `${nomAffiche(m)} · ${t('bientot')}`}
              style={({ pressed }) => ({
                width: '31.5%', height: 96, borderRadius: 16, alignItems: 'center',
                justifyContent: 'center', gap: 6, padding: 6,
                borderWidth: choisi ? 2 : 1, borderColor: choisi ? couleur : couleurs.bordure,
                backgroundColor: choisi ? `${couleur}12` : couleurs.blanc,
                opacity: disponible ? (pressed ? 0.7 : 1) : 0.45,
              })}>
              {/* Logo officiel si fourni, sinon pastille aux couleurs de la marque */}
              {m.logo ? (
                <Image source={m.logo} contentFit="contain" style={{ width: 44, height: 44 }}
                  accessibilityIgnoresInvertColors />
              ) : (
                <View style={{ width: 44, height: 44, borderRadius: 12, alignItems: 'center',
                  justifyContent: 'center', backgroundColor: m.fond,
                  borderWidth: m.fond === '#FFFFFF' ? 1 : 0, borderColor: couleurs.bordure }}>
                  <Text style={{ fontFamily: polices.titre, fontSize: m.sigle.length > 1 ? 15 : 20,
                    color: m.texte }}>{m.sigle}</Text>
                </View>
              )}
              <Text numberOfLines={1} style={{ fontFamily: choisi ? polices.texteGras : polices.texteMoyen,
                fontSize: 12, color: couleurs.encre }}>{nomAffiche(m)}</Text>

              {choisi ? (
                <View style={{ position: 'absolute', top: 6, right: 6, width: 20, height: 20,
                  borderRadius: 10, backgroundColor: couleur, alignItems: 'center', justifyContent: 'center' }}>
                  <Coche />
                </View>
              ) : null}
              {!disponible ? (
                <View style={{ position: 'absolute', top: 6, right: 6, paddingHorizontal: 6,
                  paddingVertical: 2, borderRadius: 8, backgroundColor: couleurs.sableFonce }}>
                  <Text style={{ fontFamily: polices.texteGras, fontSize: 9, color: couleurs.gris }}>
                    {t('bientot')}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

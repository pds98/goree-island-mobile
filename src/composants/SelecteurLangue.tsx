/**
 * Choix de la langue : bouton 🌐 + panneau.
 *
 * POURQUOI PAS DE <Modal> ? Sur iPhone, la Modal native de React Native,
 * combinée à la navigation d'Expo Router (react-native-screens), peut
 * « avaler » les touchers : il fallait appuyer plusieurs fois. Le panneau
 * est donc dessiné DANS l'app, par-dessus tout le reste, par
 * <PanneauLangue /> placé une seule fois dans app/_layout.tsx, à l'intérieur
 * d'une <CouchePleinEcran> (FullWindowOverlay sur iOS) : sans elle, iOS
 * envoyait les touchers aux écrans natifs situés dessous.
 *
 * Chaque langue est écrite dans sa propre langue (« Español », « العربية »)
 * pour qu'un visiteur la reconnaisse même s'il ne lit pas la langue actuelle.
 *
 * Les lignes utilisent <ToucheFiable> : sur iPhone, iOS annulait parfois le
 * premier toucher (il fallait appuyer deux fois).
 */
import { useEffect } from 'react';
import { BackHandler, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { CouchePleinEcran } from '@/composants/CouchePleinEcran';
import { ToucheFiable } from '@/composants/ToucheFiable';
import { LANGUES, useT } from '@/i18n';
import { couleurs, polices, rayon, TAILLE_TACTILE } from '@/theme';

function IconeGlobe({ couleur }: { couleur: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={couleur} strokeWidth={2} />
      <Path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z"
        stroke={couleur} strokeWidth={2} />
    </Svg>
  );
}

/**
 * Le bouton 🌐 FR. Placé sur le fond de l'accueil, JAMAIS sur la vidéo
 * (sur iPhone, la vue vidéo native captait une partie de ses touchers).
 */
export function SelecteurLangue() {
  const { langue, t, setSelecteurOuvert } = useT();
  const actuelle = LANGUES.find((l) => l.code === langue)!;

  return (
    <ToucheFiable onPress={() => setSelecteurOuvert(true)} hitSlop={10}
      accessibilityRole="button" accessibilityLabel={`${t('choisirLangue')} : ${actuelle.nom}`}
      style={({ pressed }) => ({ minHeight: 44, borderRadius: 22, paddingHorizontal: 14, flexDirection: 'row',
        alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: couleurs.bordureForte,
        backgroundColor: pressed ? couleurs.sableFonce : couleurs.blanc })}>
      <IconeGlobe couleur={couleurs.encre} />
      <Text style={{ fontFamily: polices.texteGras, fontSize: 14, color: couleurs.encre }}>
        {actuelle.drapeau} {langue.toUpperCase()}
      </Text>
    </ToucheFiable>
  );
}

/**
 * Le panneau lui-même. Rendu UNE fois, au-dessus de toute l'app
 * (dernier enfant du layout racine → dessiné par-dessus la navigation).
 */
export function PanneauLangue() {
  const { langue, setLangue, t, selecteurOuvert, setSelecteurOuvert } = useT();
  const marges = useSafeAreaInsets();

  // Bouton « retour » Android : ferme le panneau au lieu de quitter l'écran.
  useEffect(() => {
    if (!selecteurOuvert) return;
    const abo = BackHandler.addEventListener('hardwareBackPress', () => {
      setSelecteurOuvert(false);
      return true;
    });
    return () => abo.remove();
  }, [selecteurOuvert, setSelecteurOuvert]);

  if (!selecteurOuvert) return null;

  return (
    <CouchePleinEcran>
      {/* Fond assombri : un toucher en dehors ferme le panneau */}
      <ToucheFiable style={{ flex: 1, backgroundColor: 'rgba(26,20,16,0.45)' }}
        onPress={() => setSelecteurOuvert(false)} accessibilityLabel={t('fermer')} />
      <View style={{ backgroundColor: couleurs.sable, borderTopLeftRadius: 24, borderTopRightRadius: 24,
        paddingHorizontal: 18, paddingTop: 12, paddingBottom: 18 + marges.bottom, gap: 8 }}>
        <View style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3,
          backgroundColor: couleurs.bordureForte, marginBottom: 6 }} />
        <Text style={{ fontFamily: polices.titre, fontSize: 20, color: couleurs.encre, marginBottom: 4 }}>
          {t('choisirLangue')}
        </Text>
        {LANGUES.map((l) => {
          const choisie = l.code === langue;
          return (
            <ToucheFiable key={l.code}
              onPress={() => { setSelecteurOuvert(false); setLangue(l.code); }}
              accessibilityRole="radio" accessibilityState={{ selected: choisie }}
              style={({ pressed }) => ({ minHeight: TAILLE_TACTILE + 12, borderRadius: rayon.m,
                justifyContent: 'center', borderWidth: choisie ? 2 : 1,
                borderColor: choisie || pressed ? couleurs.terracotta : couleurs.bordure,
                backgroundColor: choisie || pressed ? couleurs.terracottaClair : couleurs.blanc })}>
              {/* Contenu inerte : toute la ligne est cliquable */}
              <View pointerEvents="none" style={{ flexDirection: 'row', alignItems: 'center', gap: 12,
                paddingHorizontal: 14 }}>
              <Text style={{ fontSize: 24 }}>{l.drapeau}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: polices.texteGras, fontSize: 16, color: couleurs.encre }}>{l.nom}</Text>
                {l.brouillon ? (
                  <Text style={{ fontFamily: polices.texte, fontSize: 11, color: couleurs.gris }}>
                    {t('traductionBrouillon')}
                  </Text>
                ) : null}
              </View>
              {choisie ? <Text style={{ fontSize: 18, color: couleurs.terracotta }}>✓</Text> : null}
              </View>
            </ToucheFiable>
          );
        })}
      </View>
    </CouchePleinEcran>
  );
}

/**
 * Bouton 🌐 + panneau de choix de la langue.
 * Chaque langue est écrite dans sa propre langue (« Español », « العربية »)
 * pour qu'un visiteur la reconnaisse même s'il ne lit pas la langue actuelle.
 */
import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

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

export function SelecteurLangue() {
  const { langue, setLangue, t } = useT();
  const [ouvert, setOuvert] = useState(false);
  const actuelle = LANGUES.find((l) => l.code === langue)!;

  return (
    <>
      <Pressable onPress={() => setOuvert(true)} accessibilityRole="button"
        accessibilityLabel={`${t('choisirLangue')} : ${actuelle.nom}`}
        style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 22, flexDirection: 'row',
          alignItems: 'center', gap: 6, backgroundColor: couleurs.blanc }}>
        <IconeGlobe couleur={couleurs.encre} />
        <Text style={{ fontFamily: polices.texteGras, fontSize: 14, color: couleurs.encre }}>
          {langue.toUpperCase()}
        </Text>
      </Pressable>

      <Modal visible={ouvert} transparent animationType="slide" onRequestClose={() => setOuvert(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(26,20,16,0.45)' }}
          onPress={() => setOuvert(false)} accessibilityLabel={t('fermer')} />
        <SafeAreaView edges={['bottom']} style={{ backgroundColor: couleurs.sable,
          borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, gap: 8 }}>
          <View style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3,
            backgroundColor: couleurs.bordureForte, marginBottom: 6 }} />
          <Text style={{ fontFamily: polices.titre, fontSize: 20, color: couleurs.encre, marginBottom: 4 }}>
            {t('choisirLangue')}
          </Text>
          {LANGUES.map((l) => {
            const choisie = l.code === langue;
            return (
              <Pressable key={l.code} onPress={() => { setLangue(l.code); setOuvert(false); }}
                accessibilityRole="radio" accessibilityState={{ selected: choisie }}
                style={{ minHeight: TAILLE_TACTILE + 8, borderRadius: rayon.m, paddingHorizontal: 14,
                  flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: choisie ? 2 : 1,
                  borderColor: choisie ? couleurs.terracotta : couleurs.bordure,
                  backgroundColor: choisie ? couleurs.terracottaClair : couleurs.blanc }}>
                <Text style={{ fontSize: 24 }}>{l.drapeau}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: polices.texteGras, fontSize: 16, color: couleurs.encre }}>
                    {l.nom}
                  </Text>
                  {l.brouillon ? (
                    <Text style={{ fontFamily: polices.texte, fontSize: 11, color: couleurs.gris }}>
                      {t('traductionBrouillon')}
                    </Text>
                  ) : null}
                </View>
                {choisie ? <Text style={{ fontSize: 18, color: couleurs.terracotta }}>✓</Text> : null}
              </Pressable>
            );
          })}
        </SafeAreaView>
      </Modal>
    </>
  );
}

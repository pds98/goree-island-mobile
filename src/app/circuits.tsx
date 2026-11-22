/**
 * Circuits et tours : en tête, la VISITE 3D de l'île ; puis les circuits
 * (Mémoire, Castel, Culture) avec audio-guide ou guide certifié.
 */
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { listerCircuits } from '@/api/client';
import { Bandeau, Bouton, Carte, Ecran, EnTete, Etiquette, Texte, Titre } from '@/composants/ui';
import { useT } from '@/i18n';
import { couleurs, polices } from '@/theme';

const PHOTOS: Record<string, number> = {
  'Mémoire': require('@/assets/images/goree/goree-maison-esclaves.jpg'),
  Panorama: require('@/assets/images/goree/goree-castel.jpg'),
  Culture: require('@/assets/images/goree/goree-rue.jpg'),
};

export default function Circuits() {
  const { t } = useT();
  const circuits = useQuery({ queryKey: ['circuits'], queryFn: listerCircuits });

  return (
    <Ecran>
      <EnTete titre={t('circuits')} />

      {/* Carte vedette : visite 3D */}
      <Pressable onPress={() => router.push('/visite-3d')} accessibilityRole="button"
        accessibilityLabel={t('lancerVisite')}
        style={({ pressed }) => ({ borderRadius: 24, overflow: 'hidden', height: 210,
          transform: [{ scale: pressed ? 0.98 : 1 }] })}>
        <Image source={require('@/assets/images/goree/goree-hero.jpg')} contentFit="cover"
          style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(15,46,102,0.55)' }]} />
        <View style={{ flex: 1, padding: 18, justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Etiquette texte="3D" fond={couleurs.ocre} couleur={couleurs.encre} incline />
            <Etiquette texte={t('demo').toUpperCase()} fond={couleurs.blanc} couleur={couleurs.ocean} />
          </View>
          <View style={{ gap: 6 }}>
            <Titre taille={26} style={{ color: couleurs.blanc }}>{t('visite3dTitre')}</Titre>
            <Texte style={{ color: couleurs.oceanClair, fontSize: 14 }}>{t('visite3dSous')}</Texte>
            <View style={{ alignSelf: 'flex-start', marginTop: 6, paddingHorizontal: 16, paddingVertical: 10,
              borderRadius: 22, backgroundColor: couleurs.blanc }}>
              <Text style={{ fontFamily: polices.texteGras, color: couleurs.ocean }}>▶  {t('lancerVisite')}</Text>
            </View>
          </View>
        </View>
      </Pressable>

      {circuits.isError ? <Bandeau ton="erreur" texte={t('erreurReseau')} /> : null}
      {circuits.data?.map((c) => (
        <Carte key={c.id} style={{ padding: 0, overflow: 'hidden' }}>
          <Image source={PHOTOS[c.theme]} contentFit="cover" style={{ height: 150 }}
            accessibilityLabel={c.nom} />
          <View style={{ padding: 14, gap: 8 }}>
            <Etiquette texte={c.theme} fond={c.ton_memoriel ? couleurs.encre : couleurs.ocre}
              couleur={c.ton_memoriel ? couleurs.blanc : couleurs.encre} />
            <Titre taille={19}>{c.nom}</Titre>
            <Texte style={{ fontSize: 13 }}>
              {c.etapes.map((e) => e.nom).join(' · ')} · {c.duree_min} min
            </Texte>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Bouton titre={t('audioGuide')} variante="ocean" style={{ flex: 1 }}
                onPress={() => router.push({ pathname: '/audio-guide', params: { circuit: c.id } })} />
              <Bouton titre={t('avecGuide')} style={{ flex: 1 }}
                onPress={() => router.push({ pathname: '/marketplace', params: { type: 'GUIDE' } })} />
            </View>
          </View>
        </Carte>
      ))}
    </Ecran>
  );
}

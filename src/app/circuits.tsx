/** Circuits et tours : Mémoire, Castel, Artistes — puis audio-guide ou guide. */
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { View } from 'react-native';

import { listerCircuits } from '@/api/client';
import { Bandeau, Bouton, Carte, Ecran, EnTete, Etiquette, Texte, Titre } from '@/composants/ui';
import { useT } from '@/i18n';
import { couleurs } from '@/theme';

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
              <Bouton titre="Avec un guide" style={{ flex: 1 }} onPress={() => router.push('/marketplace')} />
            </View>
          </View>
        </Carte>
      ))}
    </Ecran>
  );
}

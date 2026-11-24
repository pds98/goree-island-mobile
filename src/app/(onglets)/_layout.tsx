/** Barre d'onglets : Accueil · Chaloupe (bleu) · L'île (terracotta) · Billets. */
import { Tabs } from 'expo-router/js-tabs';

import { IconeAccueil, IconeBateau, IconeBillet, IconeLieu } from '@/composants/icones';
import { useT } from '@/i18n';
import { useBilletsNonVus } from '@/stockage/billets';
import { couleurs, polices } from '@/theme';

export default function Onglets() {
  const { t } = useT();
  const nonVus = useBilletsNonVus();   // pastille : billets pas encore consultés
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: couleurs.encre,
      tabBarInactiveTintColor: couleurs.gris,
      tabBarStyle: { backgroundColor: couleurs.blanc, borderTopColor: couleurs.bordure, height: 68 },
      tabBarLabelStyle: { fontFamily: polices.texteMoyen, fontSize: 11, paddingBottom: 6 },
    }}>
      <Tabs.Screen name="index" options={{ title: t('ongletAccueil'),
        tabBarIcon: ({ color }) => <IconeAccueil couleur={color} /> }} />
      <Tabs.Screen name="chaloupe" options={{ title: t('ongletChaloupe'), tabBarActiveTintColor: couleurs.ocean,
        tabBarIcon: ({ color }) => <IconeBateau couleur={color} /> }} />
      <Tabs.Screen name="ile" options={{ title: t('ongletIle'), tabBarActiveTintColor: couleurs.terracotta,
        tabBarIcon: ({ color }) => <IconeLieu couleur={color} /> }} />
      <Tabs.Screen name="billets" options={{ title: t('mesBillets'),
        tabBarBadge: nonVus > 0 ? (nonVus > 99 ? '99+' : nonVus) : undefined,
        tabBarBadgeStyle: { backgroundColor: couleurs.rouge, color: couleurs.blanc, fontFamily: polices.texteGras, fontSize: 11 },
        tabBarIcon: ({ color }) => <IconeBillet couleur={color} /> }} />
    </Tabs>
  );
}

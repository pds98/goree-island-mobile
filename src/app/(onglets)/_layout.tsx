/** Barre d'onglets : Accueil · Chaloupe (bleu) · L'île (terracotta) · Billets. */
import { Tabs } from 'expo-router/js-tabs';

import { IconeAccueil, IconeBateau, IconeBillet, IconeLieu } from '@/composants/icones';
import { useT } from '@/i18n';
import { couleurs, polices } from '@/theme';

export default function Onglets() {
  const { t } = useT();
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: couleurs.encre,
      tabBarInactiveTintColor: couleurs.gris,
      tabBarStyle: { backgroundColor: couleurs.blanc, borderTopColor: couleurs.bordure, height: 68 },
      tabBarLabelStyle: { fontFamily: polices.texteMoyen, fontSize: 11, paddingBottom: 6 },
    }}>
      <Tabs.Screen name="index" options={{ title: 'Accueil',
        tabBarIcon: ({ color }) => <IconeAccueil couleur={color} /> }} />
      <Tabs.Screen name="chaloupe" options={{ title: 'Chaloupe', tabBarActiveTintColor: couleurs.ocean,
        tabBarIcon: ({ color }) => <IconeBateau couleur={color} /> }} />
      <Tabs.Screen name="ile" options={{ title: "L'île", tabBarActiveTintColor: couleurs.terracotta,
        tabBarIcon: ({ color }) => <IconeLieu couleur={color} /> }} />
      <Tabs.Screen name="billets" options={{ title: t('mesBillets'),
        tabBarIcon: ({ color }) => <IconeBillet couleur={color} /> }} />
    </Tabs>
  );
}

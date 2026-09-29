/**
 * Racine de l'app : polices, cache des requêtes, traductions, navigation.
 */
import { BricolageGrotesque_600SemiBold, BricolageGrotesque_800ExtraBold } from
  '@expo-google-fonts/bricolage-grotesque';
import { Outfit_400Regular, Outfit_500Medium, Outfit_700Bold, useFonts } from
  '@expo-google-fonts/outfit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { FournisseurI18n } from '@/i18n';
import { couleurs } from '@/theme';

SplashScreen.preventAutoHideAsync();

// Réseau instable à l'embarcadère : 2 nouvelles tentatives, cache 30 s.
const client = new QueryClient({
  defaultOptions: { queries: { retry: 2, staleTime: 30_000 } },
});

export default function Racine() {
  const [policesPretes] = useFonts({
    BricolageGrotesque_600SemiBold, BricolageGrotesque_800ExtraBold,
    Outfit_400Regular, Outfit_500Medium, Outfit_700Bold,
  });

  useEffect(() => {
    if (policesPretes) SplashScreen.hideAsync();
  }, [policesPretes]);

  if (!policesPretes) return null;

  return (
    <QueryClientProvider client={client}>
      <FournisseurI18n>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: couleurs.sable } }}>
          <Stack.Screen name="(onglets)" />
          <Stack.Screen name="identite" options={{ presentation: 'modal' }} />
        </Stack>
      </FournisseurI18n>
    </QueryClientProvider>
  );
}

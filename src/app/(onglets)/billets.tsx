/**
 * Mes billets — lus depuis le téléphone (fonctionne hors ligne), puis
 * rafraîchis depuis l'API quand le réseau est là (statut VALIDE → UTILISÉ).
 */
import { useFocusEffect, Link } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { lireBillet } from '@/api/client';
import type { Famille } from '@/api/types';
import { IconeBateau, IconeLieu } from '@/composants/icones';
import { Etiquette, formaterFcfa, Segment, Texte, Titre } from '@/composants/ui';
import { useT } from '@/i18n';
import { enregistrerBillets, lireBillets, type BilletStocke } from '@/stockage/billets';
import { couleurs } from '@/theme';

export default function Billets() {
  const { t } = useT();
  const [famille, setFamille] = useState<Famille>('CHALOUPE');
  const [billets, setBillets] = useState<BilletStocke[]>([]);
  const [rafraichissement, setRafraichissement] = useState(false);

  const charger = useCallback(async () => setBillets(await lireBillets()), []);
  useFocusEffect(useCallback(() => { charger(); }, [charger]));

  async function rafraichir() {
    setRafraichissement(true);
    const stockes = await lireBillets();
    const maj = await Promise.allSettled(stockes.map(async (s) => ({
      ...s, billet: await lireBillet(s.billet.numero, s.telephone) })));
    await enregistrerBillets(maj.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : [])));
    await charger();
    setRafraichissement(false);
  }

  const visibles = billets.filter((b) => b.billet.famille === famille)
    .sort((a, b) => b.billet.date_visite.localeCompare(a.billet.date_visite));
  const couleur = famille === 'CHALOUPE' ? couleurs.ocean : couleurs.terracotta;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: couleurs.sable }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}
        refreshControl={<RefreshControl refreshing={rafraichissement} onRefresh={rafraichir} />}>
        <Titre taille={26}>{t('mesBillets')}</Titre>
        <Segment<Famille> valeur={famille} onChange={setFamille} couleur={couleur} options={[
          { valeur: 'CHALOUPE', libelle: 'Chaloupe' }, { valeur: 'ENTREE_SITE', libelle: t('entreeSite') },
        ]} />
        <Texte style={{ fontSize: 12, color: couleurs.gris }}>{t('horsLigne')} · tire vers le bas pour actualiser</Texte>

        {visibles.length === 0 ? <Texte>{t('aucunBillet')}</Texte> : visibles.map(({ billet, titulaire }) => {
          const restants = billet.coupons.filter((c) => c.statut === 'VALIDE').length;
          return (
            <Link key={billet.numero} asChild
              href={{ pathname: '/billet/[numero]', params: { numero: billet.numero } }}>
              <Pressable accessibilityRole="link" style={{ backgroundColor: couleurs.blanc, borderRadius: 18,
                borderLeftWidth: 6, borderLeftColor: couleur, padding: 16, flexDirection: 'row', gap: 12,
                alignItems: 'center' }}>
                {billet.famille === 'CHALOUPE' ? <IconeBateau couleur={couleur} /> : <IconeLieu couleur={couleur} />}
                <View style={{ flex: 1, gap: 2 }}>
                  <Texte gras style={{ color: couleurs.encre }}>{billet.numero}</Texte>
                  <Texte style={{ fontSize: 13 }}>
                    {billet.date_visite} · {titulaire} · {formaterFcfa(billet.prix)}
                  </Texte>
                </View>
                <Etiquette fond={restants ? couleurs.vert : couleurs.bordure}
                  couleur={restants ? couleurs.blanc : couleurs.encreDouce}
                  texte={restants ? t('valide').toUpperCase() : t('utilise').toUpperCase()} />
              </Pressable>
            </Link>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

/** Accueil : photo de l'île, puis les DEUX parcours bien séparés. */
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { heureDakar, listerRotations } from '@/api/client';
import { IconeBateau, IconeBillet, IconeLieu } from '@/composants/icones';
import { Etiquette, Frise, Texte, Titre } from '@/composants/ui';
import { useT, type Langue } from '@/i18n';
import { couleurs, espace, polices, rayon } from '@/theme';

const LANGUES: Langue[] = ['fr', 'en', 'wo'];

export default function Accueil() {
  const { t, langue, setLangue } = useT();
  const rotations = useQuery({ queryKey: ['rotations'], queryFn: listerRotations });

  // Prochain départ de Dakar, en tenant compte du retard éventuel.
  const [maintenant] = useState(Date.now);
  const prochain = rotations.data
    ?.filter((r) => r.depart === 'Dakar')
    .find((r) => new Date(r.heure_prevue).getTime() + r.retard_minutes * 60_000 > maintenant);

  return (
    <View style={{ flex: 1, backgroundColor: couleurs.sable }}>
      <ScrollView bounces={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={{ height: 380 }}>
          <Image source={require('@/assets/images/goree/goree-hero.jpg')} contentFit="cover"
            contentPosition="top" style={StyleSheet.absoluteFill}
            accessibilityLabel="Gorée vue de la mer, maisons colorées" />
          <SafeAreaView edges={['top']} style={{ paddingHorizontal: espace.xl, gap: espace.l }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                <Titre taille={28}>Gorée</Titre>
                <Text style={{ fontFamily: polices.texteGras, fontSize: 11, letterSpacing: 3,
                  color: couleurs.terracotta }}>ISLAND</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Changer de langue"
                onPress={() => setLangue(LANGUES[(LANGUES.indexOf(langue) + 1) % LANGUES.length])}
                style={{ minHeight: 44, paddingHorizontal: 16, borderRadius: 22, justifyContent: 'center',
                  backgroundColor: couleurs.blanc }}>
                <Text style={{ fontFamily: polices.texteGras, fontSize: 14 }}>{langue.toUpperCase()}</Text>
              </Pressable>
            </View>
            <Etiquette texte={t('bienvenue').toUpperCase()} fond={couleurs.bougainvillier}
              couleur={couleurs.blanc} incline />
            <Titre taille={38}>{t('accroche')}</Titre>
          </SafeAreaView>
        </View>

        <View style={{ marginTop: -36, backgroundColor: couleurs.sable, borderTopLeftRadius: 28,
          borderTopRightRadius: 28, overflow: 'hidden' }}>
          <Frise />
          <View style={{ padding: espace.xl, gap: espace.m }}>
            <Titre taille={20}>{t('queFaire')}</Titre>

            <Link href="/chaloupe" asChild>
              <Pressable accessibilityRole="link" style={{ ...carte, backgroundColor: couleurs.ocean }}>
                <View style={{ ...pastille, backgroundColor: couleurs.ocre }}>
                  <IconeBateau couleur={couleurs.encre} taille={28} />
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Titre taille={20} style={{ color: couleurs.blanc }}>{t('chaloupeTitre')}</Titre>
                  <Texte style={{ color: couleurs.oceanClair, fontSize: 13 }}>{t('chaloupeSous')}</Texte>
                  {prochain ? (
                    <Etiquette fond={couleurs.blanc}
                      couleur={prochain.retard_minutes ? '#8A5A00' : couleurs.vert}
                      texte={`${t('prochainDepart')} ${heureDakar(prochain.heure_prevue)} · ${prochain.retard_minutes
                        ? `+${prochain.retard_minutes} min` : t('aLHeure')}`} />
                  ) : null}
                </View>
              </Pressable>
            </Link>

            <Link href="/ile" asChild>
              <Pressable accessibilityRole="link" style={{ ...carte, backgroundColor: couleurs.terracotta }}>
                <View style={{ ...pastille, backgroundColor: couleurs.sable }}>
                  <IconeLieu couleur={couleurs.terracotta} taille={28} />
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Titre taille={20} style={{ color: couleurs.blanc }}>{t('ileTitre')}</Titre>
                  <Texte style={{ color: couleurs.terracottaClair, fontSize: 13 }}>{t('ileSous')}</Texte>
                  <Etiquette fond={couleurs.blanc} couleur={couleurs.terracotta}
                    texte={t('nationalOuInternational')} />
                </View>
              </Pressable>
            </Link>

            <Link href="/billets" asChild>
              <Pressable accessibilityRole="link" style={{ minHeight: 52, borderRadius: rayon.m,
                borderWidth: 2, borderColor: couleurs.ocre, backgroundColor: couleurs.ocreClair,
                flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14 }}>
                <IconeBillet couleur={couleurs.encre} taille={20} />
                <Texte gras style={{ flex: 1, color: couleurs.encre }}>{t('mesBillets')}</Texte>
                <Texte style={{ fontSize: 13 }}>{t('horsLigne')}</Texte>
              </Pressable>
            </Link>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const carte = { borderRadius: 22, padding: 16, flexDirection: 'row' as const, gap: 14,
  alignItems: 'center' as const };
const pastille = { width: 52, height: 52, borderRadius: 16, alignItems: 'center' as const,
  justifyContent: 'center' as const };

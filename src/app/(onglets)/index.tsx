/** Accueil : photo de l'île, puis les DEUX parcours bien séparés. */
import { useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { heureDakar, listerRotations } from '@/api/client';
import { IconeBateau, IconeBillet, IconeLieu, IconePersonne } from '@/composants/icones';
import { Etiquette, Frise, Texte, Titre } from '@/composants/ui';
import { SelecteurLangue } from '@/composants/SelecteurLangue';
import { VideoAccueil } from '@/composants/VideoAccueil';
import { useCompte } from '@/compte/ContexteCompte';
import { useT } from '@/i18n';
import { couleurs, espace, polices, rayon } from '@/theme';

export default function Accueil() {
  const { t } = useT();
  const { compte } = useCompte();
  const rotations = useQuery({ queryKey: ['rotations'], queryFn: () => listerRotations() });

  // Prochain départ de Dakar, en tenant compte du retard éventuel.
  const [maintenant] = useState(Date.now);
  const prochain = rotations.data
    ?.filter((r) => r.depart === 'Dakar')
    .find((r) => new Date(r.heure_prevue).getTime() + r.retard_minutes * 60_000 > maintenant);

  return (
    <View style={{ flex: 1, backgroundColor: couleurs.sable }}>
      <ScrollView bounces={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={{ height: 380 }}>
          {/* Vagues en boucle (vidéo animée à partir de la photo), photo en repli */}
          <VideoAccueil video={require('@/assets/videos/goree-vagues-boucle.mp4')}
            photo={require('@/assets/images/goree/goree-hero.jpg')}
            description="Gorée vue de la mer, maisons colorées" />
          <SafeAreaView edges={['top']} style={{ paddingHorizontal: espace.xl, gap: espace.l, zIndex: 2,
            elevation: 2 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                <Titre taille={28}>Gorée</Titre>
                <Text style={{ fontFamily: polices.texteGras, fontSize: 11, letterSpacing: 3,
                  color: couleurs.terracotta }}>ISLAND</Text>
              </View>
              {/* Accès au compte (facultatif) : initiale si connecté, silhouette sinon */}
              <Link href="/compte" asChild>
                <Pressable accessibilityRole="button" accessibilityLabel={t('ouvrirMonCompte')} hitSlop={6}
                  style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
                    backgroundColor: compte ? couleurs.ocean : 'rgba(255,255,255,0.92)',
                    borderWidth: 1.5, borderColor: compte ? couleurs.blanc : couleurs.bordure }}>
                  {compte ? (
                    <Text style={{ fontFamily: polices.titre, fontSize: 18, color: couleurs.blanc }}>
                      {(compte.nom || compte.email || '?').trim().charAt(0).toUpperCase()}</Text>
                  ) : <IconePersonne couleur={couleurs.encre} taille={22} />}
                </Pressable>
              </Link>
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
            {/* Bouton de langue HORS de la vidéo : sur iPhone, la vue vidéo native
                captait une partie des touchers du bouton posé dessus. */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <Titre taille={20} style={{ flexShrink: 1 }}>{t('queFaire')}</Titre>
              <SelecteurLangue />
            </View>

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

            {/* Avis & suggestions */}
            <Link href="/avis" asChild>
              <Pressable accessibilityRole="link" style={{ minHeight: 60, borderRadius: rayon.m,
                backgroundColor: couleurs.blanc, borderWidth: 1, borderColor: couleurs.bordure,
                flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 10 }}>
                <Text style={{ fontSize: 22, color: couleurs.ocre }}>★</Text>
                <View style={{ flex: 1 }}>
                  <Texte gras style={{ color: couleurs.encre }}>{t('donneTonAvis')}</Texte>
                  <Texte style={{ fontSize: 12 }}>{t('donneTonAvisSous')}</Texte>
                </View>
                <Text style={{ fontSize: 18, color: couleurs.gris }}>›</Text>
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

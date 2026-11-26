/**
 * « À faire à Gorée » : carrousel d'activités + fiche détaillée.
 *
 * - Cartes compactes (titre, durée, meilleur moment) pour ne pas charger l'écran.
 * - Le LUNDI (heure de Dakar), les lieux fermés passent en fin de liste avec
 *   la mention « Fermé aujourd'hui », et un bandeau prévient le visiteur.
 * - La fiche propose UNE action utile : écouter l'audio-guide, réserver un
 *   guide, voir les restaurants, prendre une photo, ou vérifier la dernière chaloupe.
 */
import { router, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Bandeau, Bouton, Texte, Titre } from '@/composants/ui';
import { IconeAppareil, IconeCasque, IconeCircuit, IconeLieu, IconeResto } from '@/composants/icones';
import { ACTIVITES, type Activite, type ThemeActivite } from '@/demo/activites';
import { traduire } from '@/demo/donnees';
import { useT, type Cles } from '@/i18n';
import { couleurs, polices } from '@/theme';

const THEMES: Record<ThemeActivite, { fond: string; texte: string; libelle: Cles }> = {
  memoire: { fond: '#3A2E2A', texte: couleurs.blanc, libelle: 'themeMemoire' },
  culture: { fond: couleurs.ocean, texte: couleurs.blanc, libelle: 'themeCulture' },
  panorama: { fond: couleurs.ocre, texte: couleurs.encre, libelle: 'themePanorama' },
  plage: { fond: '#2E9BB5', texte: couleurs.blanc, libelle: 'themePlage' },
  gourmand: { fond: couleurs.terracotta, texte: couleurs.blanc, libelle: 'themeGourmand' },
  artisanat: { fond: couleurs.bougainvillier, texte: couleurs.blanc, libelle: 'themeArtisanat' },
  balade: { fond: couleurs.vert, texte: couleurs.blanc, libelle: 'themeBalade' },
};

/** Lundi à Dakar (UTC+0 toute l'année). */
const estLundiADakar = () => new Date().getUTCDay() === 1;

function Icone({ a, couleur }: { a: Activite; couleur: string }) {
  switch (a.action.type) {
    case 'audio': return <IconeCasque couleur={couleur} taille={22} />;
    case 'restaurants': return <IconeResto couleur={couleur} taille={22} />;
    case 'moments': return <IconeAppareil couleur={couleur} taille={22} />;
    case 'guide': return <IconeCircuit couleur={couleur} taille={22} />;
    default: return <IconeLieu couleur={couleur} taille={22} />;
  }
}

const duree = (min: number) => (min >= 60 ? `${Math.floor(min / 60)} h${min % 60 ? ` ${min % 60}` : ''}` : `${min} min`);

export function ActivitesIle() {
  const { t, langue } = useT();
  const marges = useSafeAreaInsets();
  const [fiche, setFiche] = useState<Activite | null>(null);
  const lundi = estLundiADakar();
  // Le lundi, ce qui est fermé passe en fin de liste.
  const liste = useMemo(() => (lundi
    ? [...ACTIVITES.filter((a) => !a.fermeLundi), ...ACTIVITES.filter((a) => a.fermeLundi)] : ACTIVITES), [lundi]);

  function agir(a: Activite) {
    const cible: Record<Activite['action']['type'], Href> = {
      audio: '/audio-guide', guide: '/marketplace?type=GUIDE', restaurants: '/marketplace?type=RESTAURANT',
      moments: '/moments', chaloupe: '/chaloupe',
    };
    setFiche(null);
    router.push(cible[a.action.type]);
  }
  const libelleAction: Record<Activite['action']['type'], Cles> = {
    audio: 'actionEcouter', guide: 'actionGuide', restaurants: 'actionRestaurants',
    moments: 'actionPhoto', chaloupe: 'actionDerniereChaloupe',
  };

  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <Titre taille={19}>{t('aFaireGoree')}</Titre>
        <Texte style={{ fontSize: 12, color: couleurs.gris }}>{t('nActivites', { n: String(ACTIVITES.length) })}</Texte>
      </View>
      {lundi ? <Bandeau ton="alerte" texte={t('lundiFermetures')} /> : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginHorizontal: -20 }}
        contentContainerStyle={{ gap: 10, paddingHorizontal: 20 }}>
        {liste.map((a) => {
          const th = THEMES[a.theme];
          const ferme = lundi && a.fermeLundi;
          return (
            <Pressable key={a.id} accessibilityRole="button" onPress={() => setFiche(a)}
              accessibilityLabel={`${traduire(a.titre, langue)}, ${duree(a.dureeMin)}${ferme ? `, ${t('fermeAujourdhui')}` : ''}`}
              style={({ pressed }) => ({ width: 168, borderRadius: 20, overflow: 'hidden', backgroundColor: couleurs.blanc,
                borderWidth: 1, borderColor: couleurs.bordure, opacity: ferme ? 0.55 : 1,
                transform: [{ scale: pressed ? 0.97 : 1 }] })}>
              <View style={{ height: 70, backgroundColor: th.fond, padding: 12, justifyContent: 'space-between' }}>
                <Icone a={a} couleur={th.texte} />
                <Text style={{ fontFamily: polices.texteGras, fontSize: 10, letterSpacing: 1, color: th.texte }}>
                  {t(th.libelle).toUpperCase()}</Text>
              </View>
              <View style={{ padding: 12, gap: 4 }}>
                <Text numberOfLines={2} style={{ fontFamily: polices.texteGras, fontSize: 15, color: couleurs.encre,
                  minHeight: 38 }}>{traduire(a.titre, langue)}</Text>
                <Text style={{ fontFamily: polices.texte, fontSize: 12, color: ferme ? couleurs.rouge : couleurs.gris }}>
                  {ferme ? t('fermeAujourdhui') : `${duree(a.dureeMin)} · ${traduire(a.moment, langue)}`}</Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Fiche détaillée */}
      <Modal visible={fiche !== null} transparent animationType="slide" onRequestClose={() => setFiche(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(26,20,16,0.5)' }} onPress={() => setFiche(null)}
          accessibilityRole="button" accessibilityLabel={t('fermer')} />
        {fiche ? (
          <View accessibilityViewIsModal style={{ backgroundColor: couleurs.sable, borderTopLeftRadius: 28,
            borderTopRightRadius: 28, padding: 22, paddingBottom: 22 + marges.bottom, gap: 12 }}>
            <View style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: couleurs.bordureForte }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
                backgroundColor: THEMES[fiche.theme].fond }}>
                <Icone a={fiche} couleur={THEMES[fiche.theme].texte} />
              </View>
              <View style={{ flex: 1 }}>
                <Titre taille={21}>{traduire(fiche.titre, langue)}</Titre>
                <Texte style={{ fontSize: 13, color: couleurs.gris }}>
                  {duree(fiche.dureeMin)} · {traduire(fiche.moment, langue)}</Texte>
              </View>
            </View>
            <Texte>{traduire(fiche.resume, langue)}</Texte>
            <View style={{ backgroundColor: couleurs.blanc, borderRadius: 14, padding: 12, borderWidth: 1,
              borderColor: couleurs.bordure }}>
              <Texte style={{ fontSize: 13 }}>{fiche.pratique ? traduire(fiche.pratique, langue) : t('horairesAVerifier')}</Texte>
            </View>
            <Bouton titre={t(libelleAction[fiche.action.type])} variante="ocean" onPress={() => agir(fiche)} />
            {fiche.action.type !== 'guide' ? (
              <Bouton titre={t('actionGuide')} variante="clair" onPress={() => {
                setFiche(null); router.push('/marketplace?type=GUIDE');
              }} />
            ) : null}
          </View>
        ) : null}
      </Modal>
    </View>
  );
}

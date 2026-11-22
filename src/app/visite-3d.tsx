/**
 * VISITE 3D DE GORÉE.
 *
 * - Intro : la caméra tourne au-dessus de l'île, le temps que l'utilisateur
 *   appuie sur « Lancer la visite 3D ».
 * - Visite : la caméra vole d'un lieu à l'autre (ORDRE_VISITE). Une fiche en
 *   bas présente le lieu ; « Écouter » lit la narration à voix haute dans la
 *   langue de l'app (même texte que l'audio-guide).
 * - Vue libre : dès que l'utilisateur fait glisser son doigt, il pilote la
 *   caméra (1 doigt = tourner, 2 doigts = zoomer). « Reprendre la visite »
 *   rend la main au parcours guidé.
 * - Toucher une balise flottante va directement à ce lieu.
 */
import { router } from 'expo-router';
import * as Speech from 'expo-speech';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, Text, View, type GestureResponderEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Bandeau } from '@/composants/ui';
import { Canvas } from '@/composants/visite3d/Canvas3D';
import { SceneGoree, type ControleCamera } from '@/composants/visite3d/SceneGoree';
import { LIEUX, ORDRE_VISITE, traduire, type IdLieu } from '@/demo/donnees';
import { CODE_VOIX, useT } from '@/i18n';
import { couleurs, polices } from '@/theme';

/** Distance entre deux doigts (pour le pincement). */
function ecartDoigts(e: GestureResponderEvent): number | null {
  const t = e.nativeEvent.touches;
  if (t.length < 2) return null;
  return Math.hypot(t[0].pageX - t[1].pageX, t[0].pageY - t[1].pageY);
}

export default function Visite3D() {
  const { t, langue } = useT();
  const [index, setIndex] = useState<number | null>(null);      // null = intro
  const [libre, setLibre] = useState(false);
  const [enLecture, setEnLecture] = useState(false);
  const controle = useRef<ControleCamera>({ mode: 'visite', theta: 0.6, phi: 0.6, rayon: 24 });

  const actif: IdLieu | null = index === null ? null : ORDRE_VISITE[index];
  const lieu = actif ? LIEUX[actif] : null;

  // --- Narration ------------------------------------------------------------------
  const arreter = useCallback(() => { Speech.stop(); setEnLecture(false); }, []);
  const lire = useCallback((id: IdLieu) => {
    Speech.stop();
    setEnLecture(true);
    Speech.speak(traduire(LIEUX[id].narration, langue), {
      language: CODE_VOIX[langue], rate: 0.95,
      onDone: () => setEnLecture(false), onStopped: () => setEnLecture(false), onError: () => setEnLecture(false),
    });
  }, [langue]);
  useEffect(() => () => { Speech.stop(); }, []);                 // on coupe en quittant

  // --- Navigation entre étapes ----------------------------------------------------
  const allerA = useCallback((i: number) => {
    arreter();
    controle.current.mode = 'visite';
    setLibre(false);
    setIndex((i + ORDRE_VISITE.length) % ORDRE_VISITE.length);
  }, [arreter]);
  const choisirLieu = useCallback((id: IdLieu) => allerA(ORDRE_VISITE.indexOf(id)), [allerA]);

  // --- Gestes : glisser = tourner, pincer = zoomer --------------------------------
  const geste = useRef({ ecart: 0 });
  const gestes = useMemo(() => PanResponder.create({
    // On ne prend la main qu'après un vrai glissement : un simple toucher
    // reste disponible pour les balises de la scène 3D.
    onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dx) + Math.abs(g.dy) > 6,
    onPanResponderGrant: (e) => {
      const c = controle.current;
      if (c.mode !== 'libre') {
        c.mode = 'libre';
        setLibre(true);
      }
      geste.current.ecart = ecartDoigts(e) ?? 0;
    },
    onPanResponderMove: (e, g) => {
      const c = controle.current;
      const ecart = ecartDoigts(e);
      if (ecart) {
        if (geste.current.ecart) c.rayon = Math.min(45, Math.max(8, c.rayon * (geste.current.ecart / ecart)));
        geste.current.ecart = ecart;
      } else {
        c.theta -= g.vx * 0.05;
        c.phi = Math.min(1.35, Math.max(0.15, c.phi + g.vy * 0.03));
      }
    },
    onPanResponderRelease: () => { geste.current.ecart = 0; },
  }), []);

  return (
    <View style={{ flex: 1, backgroundColor: '#F7C9A0' }}>
      {/* Scène 3D plein écran */}
      <View style={{ flex: 1 }} {...gestes.panHandlers}>
        <Canvas shadows dpr={[1, 2]} camera={{ position: [26, 14, 0], fov: 45, near: 0.1, far: 200 }}>
          <SceneGoree ordre={ORDRE_VISITE} actif={actif} onChoisir={choisirLieu} controle={controle} />
        </Canvas>
      </View>

      {/* Barre du haut */}
      <SafeAreaView edges={['top']} pointerEvents="box-none"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 }}>
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('fermer')}
            style={pastille}>
            <Text style={{ fontSize: 20, color: couleurs.encre }}>✕</Text>
          </Pressable>
          <View style={{ flex: 1, backgroundColor: 'rgba(255,251,243,0.92)', borderRadius: 18,
            paddingHorizontal: 14, paddingVertical: 8 }}>
            <Text style={{ fontFamily: polices.titre, fontSize: 16, color: couleurs.encre }}>{t('visite3dTitre')}</Text>
            <Text style={{ fontFamily: polices.texte, fontSize: 11, color: couleurs.gris }}>
              {index === null ? t('representationStylisee') : t('etapeSur', { i: index + 1, n: ORDRE_VISITE.length })}
            </Text>
          </View>
        </View>
        {/* Progression */}
        {index !== null ? (
          <View style={{ flexDirection: 'row', gap: 4, marginTop: 10 }}>
            {ORDRE_VISITE.map((id, i) => (
              <Pressable key={id} onPress={() => allerA(i)} style={{ flex: 1, height: 18, justifyContent: 'center' }}
                accessibilityLabel={traduire(LIEUX[id].nom, langue)}>
                <View style={{ height: 4, borderRadius: 2,
                  backgroundColor: i <= index ? couleurs.terracotta : 'rgba(255,255,255,0.7)' }} />
              </Pressable>
            ))}
          </View>
        ) : null}
      </SafeAreaView>

      {/* Bas d'écran : intro ou fiche du lieu */}
      <SafeAreaView edges={['bottom']} pointerEvents="box-none"
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, gap: 10 }}>
        {libre ? (
          <Pressable onPress={() => allerA(index ?? 0)} style={[boutonPlein, { alignSelf: 'center',
            backgroundColor: couleurs.encre, paddingHorizontal: 22 }]}>
            <Text style={{ fontFamily: polices.texteGras, color: couleurs.blanc }}>↺  {t('reprendreVisite')}</Text>
          </Pressable>
        ) : null}

        {index === null ? (
          <View style={carteBas}>
            <Text style={{ fontFamily: polices.titre, fontSize: 24, color: couleurs.encre }}>{t('visite3dTitre')}</Text>
            <Text style={{ fontFamily: polices.texte, fontSize: 14, color: couleurs.gris }}>{t('visite3dSous')}</Text>
            <Text style={{ fontFamily: polices.texte, fontSize: 12, color: couleurs.gris }}>{t('gesteAide')}</Text>
            <Pressable onPress={() => allerA(0)} style={[boutonPlein, { backgroundColor: couleurs.ocean }]}>
              <Text style={{ fontFamily: polices.texteGras, fontSize: 16, color: couleurs.blanc }}>▶  {t('lancerVisite')}</Text>
            </Pressable>
          </View>
        ) : lieu ? (
          <View style={carteBas}>
            <Text style={{ fontFamily: polices.titre, fontSize: 22, color: couleurs.encre }}>{traduire(lieu.nom, langue)}</Text>
            <Text style={{ fontFamily: polices.texte, fontSize: 14, color: couleurs.encreDouce, lineHeight: 20 }}>
              {traduire(lieu.resume, langue)}
            </Text>
            {lieu.memoriel ? <Bandeau ton="sombre" texte={t('lieuMemoire')} /> : null}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable onPress={() => allerA((index ?? 0) - 1)} accessibilityLabel={t('etapePrecedente')}
                style={[boutonPlein, { width: 52, backgroundColor: couleurs.sableFonce }]}>
                <Text style={{ fontSize: 18, color: couleurs.encre }}>‹</Text>
              </Pressable>
              <Pressable onPress={() => (enLecture ? arreter() : actif && lire(actif))}
                style={[boutonPlein, { flex: 1, backgroundColor: couleurs.terracotta }]}>
                <Text style={{ fontFamily: polices.texteGras, fontSize: 15, color: couleurs.blanc }}>
                  {enLecture ? `■  ${t('arreter')}` : `▶  ${t('ecouter')}`}
                </Text>
              </Pressable>
              <Pressable onPress={() => allerA((index ?? 0) + 1)} accessibilityLabel={t('etapeSuivante')}
                style={[boutonPlein, { flex: 1, backgroundColor: couleurs.ocean }]}>
                <Text style={{ fontFamily: polices.texteGras, fontSize: 15, color: couleurs.blanc }}>
                  {t('etapeSuivante')}  ›
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </SafeAreaView>
    </View>
  );
}

const pastille = { width: 44, height: 44, borderRadius: 22, alignItems: 'center' as const,
  justifyContent: 'center' as const, backgroundColor: 'rgba(255,251,243,0.92)' };
const boutonPlein = { minHeight: 50, borderRadius: 16, alignItems: 'center' as const,
  justifyContent: 'center' as const };
const carteBas = { backgroundColor: 'rgba(255,251,243,0.96)', borderRadius: 24, padding: 18, gap: 10,
  shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 16, shadowOffset: { width: 0, height: 6 },
  elevation: 6 };

/**
 * Cadres signature « Gorée Island » posés sur les photos.
 *
 * Tout est dessiné en vectoriel (texte, SVG, dégradés) : net à toutes les
 * tailles, léger, et modifiable en une ligne. Les tailles sont exprimées en
 * fraction de la LARGEUR de la composition, pour que l'aperçu en direct et
 * l'image exportée soient identiques.
 *
 *   minimal  — logo discret + lieu + date, sur un léger dégradé
 *   frise    — bordure sable + frise de triangles ocre / terracotta / bleu
 *   carte    — carte postale : marge blanche, « Greetings from GORÉE », timbre
 *   golden   — lumière chaude de fin de journée, logo minuscule
 *   sobre    — lieu de mémoire : aucune décoration, mention respectueuse
 */
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg';

import { Frise } from '@/composants/ui';
import { couleurs, polices } from '@/theme';

export type IdCadre = 'minimal' | 'frise' | 'carte' | 'golden' | 'sobre';
export type Format = 'story' | 'post' | 'carre';

/** Hauteur / largeur de chaque format. */
export const RATIOS: Record<Format, number> = { story: 16 / 9, post: 5 / 4, carre: 1 };

type Props = { largeur: number; format: Format; photo: ReactNode; lieu: string; date: string };

/** Logo « Gorée ISLAND » à l'échelle. */
function Logo({ l, couleur = couleurs.blanc, accent = couleurs.ocre, ombre = true }: {
  l: number; couleur?: string; accent?: string; ombre?: boolean;
}) {
  const o = ombre ? { textShadowColor: 'rgba(0,0,0,0.35)', textShadowRadius: l * 0.012, textShadowOffset: { width: 0, height: 1 } } : {};
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: l * 0.012 }}>
      <Text style={{ fontFamily: polices.titre, fontSize: l * 0.07, color: couleur, ...o }}>Gorée</Text>
      <Text style={{ fontFamily: polices.texteGras, fontSize: l * 0.026, letterSpacing: l * 0.008, color: accent, ...o }}>
        ISLAND</Text>
    </View>
  );
}

export function Composition({ cadre, ...p }: Props & { cadre: IdCadre }) {
  const hauteur = p.largeur * RATIOS[p.format];
  const l = p.largeur;
  const ligneInfo = `${p.lieu} · ${p.date}`;
  const plein = { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0 };

  if (cadre === 'frise') {
    const bord = l * 0.04;
    const bandeau = l * 0.17;
    return (
      <View style={{ width: l, height: hauteur, backgroundColor: couleurs.sable }}>
        <View style={{ height: l * 0.022, overflow: 'hidden' }}><Frise largeur={400} hauteur={l * 0.022} /></View>
        <View style={{ flex: 1, marginHorizontal: bord, marginTop: bord * 0.6, borderRadius: l * 0.025, overflow: 'hidden' }}>
          {p.photo}
        </View>
        <View style={{ height: bandeau, alignItems: 'center', justifyContent: 'center', gap: l * 0.006 }}>
          <Logo l={l} couleur={couleurs.encre} accent={couleurs.terracotta} ombre={false} />
          <Text style={{ fontFamily: polices.texteMoyen, fontSize: l * 0.028, color: couleurs.gris }}>{ligneInfo}</Text>
        </View>
        <View style={{ height: l * 0.022, overflow: 'hidden', transform: [{ rotate: '180deg' }] }}>
          <Frise largeur={400} hauteur={l * 0.022} />
        </View>
      </View>
    );
  }

  if (cadre === 'carte') {
    const marge = l * 0.05;
    const bas = l * 0.25;
    const timbre = l * 0.2;
    return (
      <View style={{ width: l, height: hauteur, backgroundColor: '#FFFDF8', padding: marge, paddingBottom: 0 }}>
        <View style={{ flex: 1, overflow: 'hidden', borderRadius: l * 0.01 }}>
          {p.photo}
          {/* Timbre « SÉNÉGAL » incliné */}
          <View style={{ position: 'absolute', top: l * 0.035, right: l * 0.035, transform: [{ rotate: '8deg' }] }}>
            <Svg width={timbre} height={timbre} viewBox="0 0 100 100">
              <Circle cx={50} cy={50} r={46} fill="none" stroke={couleurs.blanc} strokeWidth={3} strokeDasharray="4 4" />
              <Circle cx={50} cy={50} r={38} fill="none" stroke={couleurs.blanc} strokeWidth={1.5} />
              <SvgText x={50} y={47} fontSize={13} fontWeight="bold" fill={couleurs.blanc} textAnchor="middle">SÉNÉGAL</SvgText>
              <SvgText x={50} y={63} fontSize={10} fill={couleurs.blanc} textAnchor="middle">GORÉE · 221</SvgText>
            </Svg>
          </View>
        </View>
        <View style={{ height: bas, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ fontFamily: polices.texteMoyen, fontSize: l * 0.034, color: couleurs.gris }}>Greetings from</Text>
            <Text style={{ fontFamily: polices.titre, fontSize: l * 0.11, color: couleurs.terracotta,
              lineHeight: l * 0.12 }}>GORÉE</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: l * 0.006 }}>
            <Text style={{ fontFamily: polices.texteGras, fontSize: l * 0.026, color: couleurs.ocean }}>{p.lieu}</Text>
            <Text style={{ fontFamily: polices.texte, fontSize: l * 0.026, color: couleurs.gris }}>{p.date}</Text>
          </View>
        </View>
      </View>
    );
  }

  if (cadre === 'golden') {
    return (
      <View style={{ width: l, height: hauteur, overflow: 'hidden' }}>
        {p.photo}
        {/* Lumière chaude : orange en haut, bougainvillier très léger en bas */}
        <LinearGradient pointerEvents="none" colors={['rgba(255,170,70,0.30)', 'rgba(255,120,60,0.12)', 'rgba(184,24,106,0.18)']}
          start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={plein} />
        <View style={{ position: 'absolute', top: l * 0.05, right: l * 0.05, transform: [{ scale: 0.8 }] }}>
          <Logo l={l} />
        </View>
      </View>
    );
  }

  if (cadre === 'sobre') {
    return (
      <View style={{ width: l, height: hauteur, overflow: 'hidden' }}>
        {p.photo}
        <LinearGradient pointerEvents="none" colors={['transparent', 'rgba(0,0,0,0.5)']} style={{ position: 'absolute',
          left: 0, right: 0, bottom: 0, height: hauteur * 0.2 }} />
        <Text style={{ position: 'absolute', left: l * 0.05, bottom: l * 0.045, fontFamily: polices.texteMoyen,
          fontSize: l * 0.03, color: 'rgba(255,255,255,0.9)' }}>{`${p.lieu} · ${p.date}`}</Text>
      </View>
    );
  }

  // minimal (par défaut)
  return (
    <View style={{ width: l, height: hauteur, overflow: 'hidden' }}>
      {p.photo}
      <LinearGradient pointerEvents="none" colors={['transparent', 'rgba(0,0,0,0.45)']} style={{ position: 'absolute',
        left: 0, right: 0, bottom: 0, height: hauteur * 0.3 }} />
      <View style={{ position: 'absolute', left: l * 0.055, bottom: l * 0.05, gap: l * 0.004 }}>
        <Logo l={l} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: l * 0.015 }}>
          <Svg width={l * 0.03} height={l * 0.03} viewBox="0 0 24 24" fill="none" stroke={couleurs.blanc} strokeWidth={2.2}>
            <Path d="M12 21s-7-6-7-11a7 7 0 0114 0c0 5-7 11-7 11z" />
          </Svg>
          <Text style={{ fontFamily: polices.texteMoyen, fontSize: l * 0.03, color: couleurs.blanc }}>{ligneInfo}</Text>
        </View>
      </View>
    </View>
  );
}

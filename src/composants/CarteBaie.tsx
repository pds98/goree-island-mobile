/**
 * Carte illustrée de la baie de Dakar, dessinée aux couleurs de l'app.
 *
 * Pas de fond de carte externe (aucune clé, aucun coût, fonctionne avec un
 * réseau faible) : la côte de Dakar, l'île de Gorée et le trajet de la
 * chaloupe sont dessinés en SVG. La chaloupe est placée sur la courbe du
 * trajet selon la `progression` (0 = quai de départ, 1 = quai d'arrivée),
 * orientée dans le sens de la marche, avec un halo qui « respire ».
 */
import { useEffect, useMemo, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';

import type { Port, StatutTraversee } from '@/api/types';
import { couleurs, polices } from '@/theme';

const CercleAnime = Animated.createAnimatedComponent(Circle);

// Repère du dessin (viewBox 360 × 230).
const PORT_XY: Record<Port, { x: number; y: number }> = { Dakar: { x: 78, y: 82 }, 'Gorée': { x: 276, y: 156 } };
const CONTROLE = { x: 196, y: 60 };           // point de contrôle de la courbe (trajet en arc)

type Point = { x: number; y: number };

/** Point et direction (degrés) sur la courbe de Bézier quadratique, à l'instant t ∈ [0, 1]. */
function surCourbe(a: Point, c: Point, b: Point, t: number): Point & { angle: number } {
  const u = 1 - t;
  const x = u * u * a.x + 2 * u * t * c.x + t * t * b.x;
  const y = u * u * a.y + 2 * u * t * c.y + t * t * b.y;
  const dx = 2 * u * (c.x - a.x) + 2 * t * (b.x - c.x);
  const dy = 2 * u * (c.y - a.y) + 2 * t * (b.y - c.y);
  return { x, y, angle: (Math.atan2(dy, dx) * 180) / Math.PI };
}

/** Longueur approchée de la courbe (pour dessiner la partie déjà parcourue). */
function longueur(a: Point, c: Point, b: Point): number {
  let total = 0;
  let prec = a;
  for (let i = 1; i <= 40; i++) {
    const p = surCourbe(a, c, b, i / 40);
    total += Math.hypot(p.x - prec.x, p.y - prec.y);
    prec = p;
  }
  return total;
}

export function CarteBaie({ depart, progression, statut, gps }: {
  depart: Port; progression: number; statut: StatutTraversee; gps: boolean;
}) {
  const a = PORT_XY[depart];
  const b = PORT_XY[depart === 'Dakar' ? 'Gorée' : 'Dakar'];
  const p = Math.max(0, Math.min(1, progression));
  const bateau = surCourbe(a, CONTROLE, b, p);
  const total = useMemo(() => longueur(a, CONTROLE, b), [a, b]);
  const trajet = `M${a.x} ${a.y} Q${CONTROLE.x} ${CONTROLE.y} ${b.x} ${b.y}`;

  // Halo qui respire autour de la chaloupe (plus vif en mer).
  const [souffle] = useState(() => new Animated.Value(0));   // créé une seule fois
  useEffect(() => {
    const boucle = Animated.loop(Animated.timing(souffle, { toValue: 1, duration: 1800,
      easing: Easing.out(Easing.quad), useNativeDriver: false }));
    boucle.start();
    return () => boucle.stop();
  }, [souffle]);
  const rayonHalo = souffle.interpolate({ inputRange: [0, 1], outputRange: [9, 24] });
  const opaciteHalo = souffle.interpolate({ inputRange: [0, 1], outputRange: [statut === 'EN_MER' ? 0.45 : 0.25, 0] });

  // Le dessin du bateau pointe vers la droite : on le tourne dans le sens de la marche.
  const angle = statut === 'ARRIVEE' || statut === 'A_QUAI' ? (b.x > a.x ? 0 : 180) : bateau.angle;
  const miroir = Math.abs(angle) > 90;           // évite un bateau à l'envers

  return (
    <View accessibilityRole="image" accessibilityLabel={`Chaloupe ${depart} → ${depart === 'Dakar' ? 'Gorée' : 'Dakar'} : ${Math.round(p * 100)} %`}
      style={{ borderRadius: 24, overflow: 'hidden', backgroundColor: couleurs.oceanFonce }}>
      <View style={{ aspectRatio: 360 / 230 }}>
      <Svg width="100%" height="100%" viewBox="0 0 360 230">
        <Defs>
          <LinearGradient id="mer" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#1D4E9E" />
            <Stop offset="1" stopColor="#0F2E66" />
          </LinearGradient>
          <LinearGradient id="sable" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#F6E3BF" />
            <Stop offset="1" stopColor="#E9CF9F" />
          </LinearGradient>
        </Defs>

        {/* Mer + vaguelettes */}
        <Rect x="0" y="0" width="360" height="230" fill="url(#mer)" />
        {[[30, 150], [120, 190], [210, 205], [300, 70], [250, 30], [150, 120], [320, 205], [60, 205]].map(([x, y], i) => (
          <Path key={i} d={`M${x} ${y} q6 -5 12 0 t12 0`} stroke="#9DB8E8" strokeWidth={1.3} fill="none"
            strokeLinecap="round" opacity={0.45} />
        ))}

        {/* Côte de Dakar (presqu'île, en haut à gauche) */}
        <Path d="M0 0 H150 C138 22 118 30 104 46 C92 60 96 74 84 92 C70 112 40 118 22 140 C12 152 6 162 0 166 Z"
          fill="url(#sable)" />
        <Path d="M0 0 H150 C138 22 118 30 104 46 C92 60 96 74 84 92 C70 112 40 118 22 140 C12 152 6 162 0 166"
          stroke="#FFFFFF" strokeOpacity={0.55} strokeWidth={2} fill="none" />
        {/* Immeubles stylisés du Plateau */}
        {[[22, 40, 14, 26, couleurs.terracotta], [40, 30, 12, 36, couleurs.ocre], [56, 44, 16, 22, '#E07A4F'],
          [76, 22, 10, 30, couleurs.bougainvillier], [92, 30, 12, 18, couleurs.terracottaFonce]].map(([x, y, w, h, c], i) => (
          <Rect key={i} x={x as number} y={y as number} width={w as number} height={h as number} rx={2} fill={c as string} opacity={0.9} />
        ))}

        {/* Île de Gorée (en bas à droite) avec ses maisons colorées */}
        <Path d="M262 148 C268 132 292 126 306 134 C320 142 326 160 316 172 C304 186 276 186 266 174 C258 166 258 156 262 148 Z"
          fill="url(#sable)" stroke="#FFFFFF" strokeOpacity={0.6} strokeWidth={2} />
        {[[280, 142, couleurs.terracotta], [290, 140, couleurs.ocre], [300, 146, '#E07A4F'],
          [284, 156, couleurs.bougainvillier], [296, 158, couleurs.ocean], [306, 160, couleurs.terracottaFonce]].map(([x, y, c], i) => (
          <G key={i}>
            <Rect x={x as number} y={y as number} width={8} height={7} fill={c as string} />
            <Path d={`M${(x as number) - 1} ${y} l5 -4 l5 4 Z`} fill="#8C2F14" />
          </G>
        ))}
        {/* Fort d'Estrées (pointe nord) */}
        <Circle cx={304} cy={134} r={4} fill="#B8A07A" />

        {/* Quais */}
        {(['Dakar', 'Gorée'] as Port[]).map((port) => (
          <G key={port}>
            <Circle cx={PORT_XY[port].x} cy={PORT_XY[port].y} r={7} fill={couleurs.blanc} />
            <Circle cx={PORT_XY[port].x} cy={PORT_XY[port].y} r={3.5} fill={couleurs.ocean} />
          </G>
        ))}
        <SvgText x={PORT_XY.Dakar.x - 60} y={PORT_XY.Dakar.y + 30} fill={couleurs.blanc} fontSize={13}
          fontFamily={polices.titre} letterSpacing={2}>DAKAR</SvgText>
        <SvgText x={PORT_XY['Gorée'].x - 14} y={PORT_XY['Gorée'].y + 46} fill={couleurs.blanc} fontSize={13}
          fontFamily={polices.titre} letterSpacing={2}>GORÉE</SvgText>

        {/* Trajet : pointillé complet + partie parcourue en ocre */}
        <Path d={trajet} stroke="#FFFFFF" strokeOpacity={0.55} strokeWidth={2} strokeDasharray="5 6" fill="none" />
        <Path d={trajet} stroke={couleurs.ocre} strokeWidth={3.5} strokeLinecap="round" fill="none"
          strokeDasharray={`${total * p} ${total}`} />

        {/* Rose des vents */}
        <G transform="translate(330 28)">
          <Circle r={14} fill="none" stroke="#FFFFFF" strokeOpacity={0.4} />
          <Path d="M0 -12 L3 0 L0 12 L-3 0 Z" fill={couleurs.ocre} />
          <SvgText y={-16} textAnchor="middle" fill={couleurs.blanc} fontSize={8} fontFamily={polices.texteGras}>N</SvgText>
        </G>

        {/* Chaloupe */}
        <CercleAnime cx={bateau.x} cy={bateau.y} r={rayonHalo} fill={gps ? couleurs.vert : couleurs.ocre}
          opacity={opaciteHalo} />
        <G transform={`translate(${bateau.x} ${bateau.y}) rotate(${miroir ? angle + 180 : angle}) scale(${miroir ? -1 : 1} 1)`}>
          <Path d="M-14 -2 H10 L15 3 L10 7 H-11 Z" fill={couleurs.blanc} stroke={couleurs.encre} strokeWidth={1} />
          <Rect x={-7} y={-8} width={11} height={6} rx={1.5} fill={couleurs.ocre} stroke={couleurs.encre} strokeWidth={1} />
          <Rect x={-5} y={-6.5} width={2.5} height={2.5} fill={couleurs.ocean} />
          <Rect x={-1} y={-6.5} width={2.5} height={2.5} fill={couleurs.ocean} />
          <Path d="M-12 7 q4 3 8 0 t8 0 t8 0" stroke="#FFFFFF" strokeWidth={1.2} fill="none" opacity={0.8} />
        </G>
      </Svg>
      </View>
    </View>
  );
}

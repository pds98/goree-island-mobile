/**
 * Composants de base de l'app, fidèles aux maquettes : gros boutons (≥ 48 px
 * de haut), cartes aux coins arrondis, frise géométrique, étiquettes.
 */
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
  type TextInputProps, type TextStyle, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { couleurs, espace, polices, rayon, TAILLE_TACTILE } from '@/theme';

// --- Mise en page ------------------------------------------------------------------

export function Ecran({ children, fond = couleurs.sable, defilable = true, style }: {
  children: ReactNode; fond?: string; defilable?: boolean; style?: ViewStyle;
}) {
  const contenu = <View style={[{ padding: espace.xl, gap: espace.l }, style]}>{children}</View>;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: fond }} edges={['top']}>
      {defilable ? <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>{contenu}</ScrollView>
        : contenu}
    </SafeAreaView>
  );
}

/** En-tête d'écran secondaire : bouton retour + surtitre + titre. */
export function EnTete({ surtitre, titre, couleur = couleurs.terracotta, clair = false }: {
  surtitre?: string; titre: string; couleur?: string; clair?: boolean;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: espace.m }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Retour" onPress={() => router.back()}
        style={[styles.rond, { backgroundColor: couleurs.blanc }]}>
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={couleurs.encre}
          strokeWidth={2} strokeLinecap="round"><Path d="M15 6l-6 6 6 6" /></Svg>
      </Pressable>
      <View style={{ flex: 1 }}>
        {surtitre ? <Texte style={[styles.surtitre, { color: couleur }]}>{surtitre}</Texte> : null}
        <Titre taille={24} style={clair ? { color: couleurs.blanc } : undefined}>{titre}</Titre>
      </View>
    </View>
  );
}

// --- Texte ---------------------------------------------------------------------------

export function Titre({ children, taille = 28, style }: {
  children: ReactNode; taille?: number; style?: TextStyle;
}) {
  return (
    <Text accessibilityRole="header"
      style={[{ fontFamily: polices.titre, fontSize: taille, color: couleurs.encre,
        lineHeight: taille * 1.1 }, style]}>
      {children}
    </Text>
  );
}

export function Texte({ children, style, gras = false }: {
  children: ReactNode; style?: TextStyle | TextStyle[]; gras?: boolean;
}) {
  return (
    <Text style={[{ fontFamily: gras ? polices.texteGras : polices.texte, fontSize: 15,
      color: couleurs.encreDouce, lineHeight: 21 }, style]}>
      {children}
    </Text>
  );
}

// --- Actions -------------------------------------------------------------------------

type Variante = 'ocean' | 'terracotta' | 'encre' | 'contour' | 'clair';

const VARIANTES: Record<Variante, { fond: string; texte: string; bordure?: string }> = {
  ocean: { fond: couleurs.ocean, texte: couleurs.blanc },
  terracotta: { fond: couleurs.terracotta, texte: couleurs.blanc },
  encre: { fond: couleurs.encre, texte: couleurs.blanc },
  contour: { fond: couleurs.blanc, texte: couleurs.encre, bordure: couleurs.bordureForte },
  clair: { fond: couleurs.sable, texte: couleurs.encre },
};

export function Bouton({ titre, onPress, variante = 'terracotta', chargement = false,
  desactive = false, style }: {
  titre: string; onPress: () => void; variante?: Variante; chargement?: boolean;
  desactive?: boolean; style?: ViewStyle;
}) {
  const v = VARIANTES[variante];
  const inactif = desactive || chargement;
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: inactif, busy: chargement }}
      onPress={onPress} disabled={inactif}
      style={({ pressed }) => [styles.bouton, {
        backgroundColor: v.fond, borderColor: v.bordure ?? v.fond,
        opacity: inactif ? 0.55 : pressed ? 0.85 : 1,
      }, style]}>
      {chargement ? <ActivityIndicator color={v.texte} />
        : <Text style={{ fontFamily: polices.texteGras, fontSize: 16, color: v.texte }}>{titre}</Text>}
    </Pressable>
  );
}

/** Contrôle segmenté (ex. Aller-retour / Aller simple, National / International). */
export function Segment<T extends string>({ options, valeur, onChange, couleur = couleurs.ocean }: {
  options: { valeur: T; libelle: string; sous?: string }[]; valeur: T;
  onChange: (v: T) => void; couleur?: string;
}) {
  return (
    <View style={styles.segment}>
      {options.map((o) => {
        const actif = o.valeur === valeur;
        return (
          <Pressable key={o.valeur} accessibilityRole="radio" accessibilityState={{ selected: actif }}
            onPress={() => onChange(o.valeur)}
            style={[styles.segmentOption, actif && { backgroundColor: couleur }]}>
            <Text style={{ fontFamily: actif ? polices.texteGras : polices.texteMoyen, fontSize: 14,
              color: actif ? couleurs.blanc : couleurs.encreDouce }}>{o.libelle}</Text>
            {o.sous ? <Text style={{ fontFamily: polices.texte, fontSize: 11, textAlign: 'center',
              color: actif ? couleurs.blanc : couleurs.gris }}>{o.sous}</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

/** Compteur − n + (passagers, enfants…). */
export function Compteur({ libelle, sous, valeur, min = 0, max, onChange, couleur = couleurs.ocean }: {
  libelle: string; sous?: string; valeur: number; min?: number; max: number;
  onChange: (n: number) => void; couleur?: string;
}) {
  return (
    <Carte style={{ flexDirection: 'row', alignItems: 'center', gap: espace.m, paddingVertical: espace.s }}>
      <View style={{ flex: 1 }}>
        <Texte gras>{libelle}</Texte>
        {sous ? <Texte style={{ fontSize: 12, color: couleurs.gris }}>{sous}</Texte> : null}
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={`Retirer : ${libelle}`}
        disabled={valeur <= min} onPress={() => onChange(valeur - 1)}
        style={[styles.rond, { borderWidth: 1, borderColor: couleurs.bordureForte, opacity: valeur <= min ? 0.4 : 1 }]}>
        <Text style={styles.signe}>−</Text>
      </Pressable>
      <Text style={{ fontFamily: polices.texteGras, fontSize: 17, minWidth: 22, textAlign: 'center' }}>{valeur}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`Ajouter : ${libelle}`}
        disabled={valeur >= max} onPress={() => onChange(valeur + 1)}
        style={[styles.rond, { backgroundColor: couleur, opacity: valeur >= max ? 0.4 : 1 }]}>
        <Text style={[styles.signe, { color: couleurs.blanc }]}>+</Text>
      </Pressable>
    </Carte>
  );
}

export function Champ({ libelle, ...props }: TextInputProps & { libelle: string }) {
  return (
    <View style={{ gap: 4 }}>
      <Texte gras style={{ fontSize: 13 }}>{libelle}</Texte>
      <TextInput accessibilityLabel={libelle} placeholderTextColor={couleurs.gris}
        style={styles.champ} {...props} />
    </View>
  );
}

// --- Surfaces ------------------------------------------------------------------------

export function Carte({ children, style, fond = couleurs.blanc }: {
  children: ReactNode; style?: ViewStyle; fond?: string;
}) {
  return <View style={[styles.carte, { backgroundColor: fond }, style]}>{children}</View>;
}

export function Etiquette({ texte, fond = couleurs.ocre, couleur = couleurs.encre, incline = false }: {
  texte: string; fond?: string; couleur?: string; incline?: boolean;
}) {
  return (
    <View style={{ alignSelf: 'flex-start', backgroundColor: fond, borderRadius: 8,
      paddingHorizontal: 10, paddingVertical: 4, transform: incline ? [{ rotate: '-2deg' }] : [] }}>
      <Text style={{ fontFamily: polices.texteGras, fontSize: 12, letterSpacing: 1, color: couleur }}>
        {texte}
      </Text>
    </View>
  );
}

/** Bandeau d'information (retard, confidentialité, erreur). */
export function Bandeau({ texte, ton = 'info' }: { texte: string; ton?: 'info' | 'alerte' | 'erreur' | 'sombre' }) {
  const t = { info: [couleurs.sableFonce, couleurs.encreDouce], alerte: [couleurs.ocre, couleurs.encre],
    erreur: ['#FDE2E1', '#8A1C1C'], sombre: [couleurs.encre, couleurs.sable] }[ton];
  return (
    <View accessibilityRole={ton === 'erreur' ? 'alert' : undefined}
      style={{ backgroundColor: t[0], borderRadius: rayon.m, padding: espace.m }}>
      <Text style={{ fontFamily: polices.texteMoyen, fontSize: 13, lineHeight: 19, color: t[1] }}>{texte}</Text>
    </View>
  );
}

/** Frise géométrique (triangles ocre / terracotta / bleu) de l'identité visuelle. */
export function Frise({ largeur = 400, hauteur = 10 }: { largeur?: number; hauteur?: number }) {
  const couleursFrise = [couleurs.ocre, couleurs.terracotta, couleurs.ocean];
  const pas = hauteur * 1.2;
  const triangles = Array.from({ length: Math.ceil(largeur / pas) }, (_, i) => {
    const x = i * pas;
    return <Path key={i} d={`M${x} ${hauteur}L${x + pas / 2} 0L${x + pas} ${hauteur}Z`}
      fill={couleursFrise[i % 3]} />;
  });
  return (
    <Svg width="100%" height={hauteur} viewBox={`0 0 ${largeur} ${hauteur}`} preserveAspectRatio="none"
      accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {triangles}
    </Svg>
  );
}

export function formaterFcfa(montant: number): string {
  return `${montant.toLocaleString('fr-FR').replace(/ | /g, ' ')} FCFA`;
}

const styles = StyleSheet.create({
  rond: { width: TAILLE_TACTILE, height: TAILLE_TACTILE, borderRadius: TAILLE_TACTILE / 2,
    alignItems: 'center', justifyContent: 'center', backgroundColor: couleurs.blanc },
  signe: { fontFamily: polices.texteGras, fontSize: 22, color: couleurs.encre, marginTop: -2 },
  surtitre: { fontFamily: polices.texteGras, fontSize: 12, letterSpacing: 1.2 },
  bouton: { minHeight: 54, borderRadius: rayon.l, borderWidth: 1.5, alignItems: 'center',
    justifyContent: 'center', paddingHorizontal: espace.l },
  segment: { flexDirection: 'row', gap: 4, padding: 4, backgroundColor: couleurs.sableFonce,
    borderRadius: rayon.m },
  segmentOption: { flex: 1, minHeight: 44, borderRadius: rayon.s, alignItems: 'center',
    justifyContent: 'center', paddingHorizontal: 6, paddingVertical: 6 },
  champ: { minHeight: TAILLE_TACTILE, borderRadius: rayon.m, borderWidth: 1,
    borderColor: couleurs.bordureForte, backgroundColor: couleurs.blanc, paddingHorizontal: 14,
    fontFamily: polices.texteMoyen, fontSize: 15, color: couleurs.encre },
  carte: { borderRadius: rayon.l, borderWidth: 1, borderColor: couleurs.bordure, padding: espace.l },
});

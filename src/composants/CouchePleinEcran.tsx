/**
 * Couche affichée AU-DESSUS de toute l'app, qui reçoit vraiment les touchers.
 *
 * POURQUOI ? Sur iPhone, Expo Router utilise des écrans NATIFS
 * (react-native-screens). Une vue dessinée par-dessus depuis la racine de
 * l'app reste visible, mais iOS envoie les touchers aux écrans natifs
 * situés dessous : le panneau des langues ne réagissait pas.
 * `FullWindowOverlay` (iOS uniquement) place la couche dans une fenêtre
 * au-dessus de tout, touchers compris. Sur Android et le web, une simple
 * vue en position absolue suffit.
 */
import type { ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { FullWindowOverlay } from 'react-native-screens';

export function CouchePleinEcran({ children }: { children: ReactNode }) {
  const contenu = (
    <View style={[StyleSheet.absoluteFill, { zIndex: 1000, elevation: 1000 }]} pointerEvents="box-none">
      {children}
    </View>
  );
  return Platform.OS === 'ios' ? <FullWindowOverlay>{contenu}</FullWindowOverlay> : contenu;
}

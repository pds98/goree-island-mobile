/**
 * Pressable « fiable » pour les couches plein écran sur iPhone.
 *
 * PROBLÈME : sous les écrans natifs d'Expo Router (react-native-screens), iOS
 * annule parfois le premier toucher (ses gestes système le « volent ») : on
 * voit `onPressIn` puis `onPressOut`, mais jamais `onPress` → il fallait
 * appuyer deux fois.
 *
 * SOLUTION : en plus du `onPress` classique, on suit le doigt directement
 * (`onTouchStart` / `onTouchEnd`, qui ne dépendent pas de ce mécanisme
 * d'annulation). Si le doigt se relève près de là où il s'est posé, et
 * rapidement, c'est un appui : on déclenche l'action. Un verrou évite le
 * double déclenchement quand les deux chemins arrivent.
 */
import { useRef } from 'react';
import { Pressable, type GestureResponderEvent, type PressableProps } from 'react-native';

const DEPLACEMENT_MAX = 12;   // px : au-delà, c'est un glissement, pas un appui
const DUREE_MAX = 900;        // ms : au-delà, ce n'est plus un simple appui
const VERROU = 450;           // ms : fenêtre anti double-déclenchement

export function ToucheFiable({ onPress, disabled, onTouchStart, onTouchEnd, ...props }: PressableProps) {
  const debut = useRef<{ x: number; y: number; t: number } | null>(null);
  const dernierDeclenchement = useRef(0);

  const declencher = (e: GestureResponderEvent) => {
    const maintenant = Date.now();
    if (disabled || maintenant - dernierDeclenchement.current < VERROU) return;
    dernierDeclenchement.current = maintenant;
    onPress?.(e);
  };

  return (
    <Pressable
      {...props}
      disabled={disabled}
      onPress={declencher}
      onTouchStart={(e) => {
        debut.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY, t: Date.now() };
        onTouchStart?.(e);
      }}
      onTouchEnd={(e) => {
        onTouchEnd?.(e);
        const d = debut.current;
        debut.current = null;
        if (!d) return;
        const bouge = Math.hypot(e.nativeEvent.pageX - d.x, e.nativeEvent.pageY - d.y);
        if (bouge <= DEPLACEMENT_MAX && Date.now() - d.t <= DUREE_MAX) declencher(e);
      }}
    />
  );
}

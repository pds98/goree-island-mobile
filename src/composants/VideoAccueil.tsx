/**
 * Fond animé de l'accueil : la photo de Gorée, puis la vidéo des vagues en
 * boucle par-dessus dès qu'elle est prête (fondu de 600 ms).
 *
 * - Muette, en boucle, sans contrôles : c'est un décor, pas un lecteur.
 * - La PHOTO reste toujours dessous : rien ne « clignote » pendant le
 *   chargement, et c'est elle qu'on voit si la vidéo échoue.
 * - Si l'utilisateur a activé « Réduire les animations » (accessibilité),
 *   on n'affiche que la photo.
 */
import { useEvent } from 'expo';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView, type VideoSource } from 'expo-video';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

export function VideoAccueil({ video, photo, description }: {
  video: VideoSource; photo: number; description: string;
}) {
  const [reduireAnimations, setReduireAnimations] = useState(false);
  const opacite = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduireAnimations).catch(() => undefined);
    const abo = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduireAnimations);
    return () => abo.remove();
  }, []);

  const lecteur = useVideoPlayer(video, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  const { status } = useEvent(lecteur, 'statusChange', { status: lecteur.status });

  useEffect(() => {
    if (status === 'readyToPlay' && !reduireAnimations) {
      Animated.timing(opacite, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    }
    if (reduireAnimations) lecteur.pause(); else lecteur.play();
  }, [status, reduireAnimations, opacite, lecteur]);

  return (
    <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]} accessible accessibilityRole="image" accessibilityLabel={description}>
      <Image source={photo} contentFit="cover" contentPosition="top" style={StyleSheet.absoluteFill} />
      {!reduireAnimations && status !== 'error' ? (
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: opacite }]} pointerEvents="none">
          <VideoView player={lecteur} style={{ width: '100%', height: '100%' }} contentFit="cover"
            nativeControls={false} allowsPictureInPicture={false} />
        </Animated.View>
      ) : null}
      {/* Voile clair en haut : garde le logo et le titre lisibles quel que
          soit le cadrage de la vidéo (écrans larges, tablettes). */}
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none" preserveAspectRatio="none" viewBox="0 0 1 1">
        <Defs>
          <LinearGradient id="voile" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFF4E2" stopOpacity={0.85} />
            <Stop offset="0.45" stopColor="#FFF4E2" stopOpacity={0.35} />
            <Stop offset="0.7" stopColor="#FFF4E2" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="1" height="1" fill="url(#voile)" />
      </Svg>
    </View>
  );
}

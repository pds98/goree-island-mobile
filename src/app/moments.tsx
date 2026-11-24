/**
 * GORÉE MOMENTS — l'appareil photo de l'app.
 *
 *   1. VISER   : aperçu en direct avec le cadre choisi (glisser les pastilles
 *                sous l'objectif), format Story 9:16 · Post 4:5 · Carré.
 *   2. SHOOTER : déclencheur + retour haptique.
 *   3. PARTAGER: l'image cadrée est enregistrée dans la galerie et le menu de
 *                partage du téléphone s'ouvre (WhatsApp, Instagram, Facebook,
 *                TikTok, Snap…). La légende proposée est copiée d'avance :
 *                il suffit de la coller.
 *
 * Lieu : nom du spot le plus proche (GPS facultatif, jamais envoyé au serveur),
 * modifiable d'un toucher. À la Maison des Esclaves (lieu de mémoire), seuls les
 * cadres sobres sont proposés, avec un rappel de respect.
 */
import * as Clipboard from 'expo-clipboard';
import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { Asset, requestPermissionsAsync } from 'expo-media-library';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useEffect, useRef, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';
import Svg, { Path } from 'react-native-svg';

import { Bouton, Texte, Titre } from '@/composants/ui';
import { useT, type Cles } from '@/i18n';
import { Composition, RATIOS, type Format, type IdCadre } from '@/moments/Cadres';
import { LIEU_PAR_DEFAUT, SPOTS, spotProche, type Spot } from '@/moments/spots';
import { couleurs, polices } from '@/theme';

const CADRES: { id: IdCadre; libelle: Cles }[] = [
  { id: 'minimal', libelle: 'cadreMinimal' }, { id: 'frise', libelle: 'cadreFrise' },
  { id: 'carte', libelle: 'cadreCarte' }, { id: 'golden', libelle: 'cadreGolden' },
];
const CADRES_MEMOIRE: { id: IdCadre; libelle: Cles }[] = [{ id: 'sobre', libelle: 'cadreSobre' }];
const FORMATS: { id: Format; libelle: string }[] = [
  { id: 'story', libelle: '9:16' }, { id: 'post', libelle: '4:5' }, { id: 'carre', libelle: '1:1' },
];
const LEGENDES: Cles[] = ['legende1', 'legende2', 'legende3'];

export default function Moments() {
  const { t, langue } = useT();
  const marges = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [permission, demanderPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const composition = useRef<React.ComponentRef<typeof View>>(null);

  const [cote, setCote] = useState<CameraType>('back');
  const [format, setFormat] = useState<Format>('story');
  const [cadre, setCadre] = useState<IdCadre>('minimal');
  const [spot, setSpot] = useState<Spot | undefined>();
  const [choixLieu, setChoixLieu] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [imagePrete, setImagePrete] = useState(false);
  const [action, setAction] = useState<'enregistrer' | 'partager' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [legende, setLegende] = useState(0);

  const memoire = spot?.memoire === true;
  const cadres = memoire ? CADRES_MEMOIRE : CADRES;
  const cadreEffectif: IdCadre = memoire ? 'sobre' : cadre;
  const lieu = spot?.nom ?? LIEU_PAR_DEFAUT;
  const date = new Date().toLocaleDateString(langue === 'ar' ? 'ar' : langue, { day: 'numeric', month: 'short', year: 'numeric' });

  // Taille de la composition : toute la largeur, sans déborder des commandes.
  const hauteurDispo = height - marges.top - marges.bottom - 250;
  const largeur = Math.min(width - 24, hauteurDispo / RATIOS[format]);

  // Lieu automatique (facultatif : si la permission est refusée, « Gorée · Sénégal »).
  useEffect(() => {
    void (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const s = spotProche(p.coords.latitude, p.coords.longitude);
        if (s) setSpot(s);
      } catch { /* sans GPS : lieu par défaut */ }
    })();
  }, []);

  async function declencher() {
    if (!camera.current) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    try {
      const p = await camera.current.takePictureAsync({ quality: 0.92, skipProcessing: false });
      if (p?.uri) { setImagePrete(false); setPhoto(p.uri); setMessage(null); }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    }
  }

  /** Image finale = la composition (photo + cadre) capturée en haute définition. */
  async function exporter(): Promise<string> {
    if (!composition.current) throw new Error('Composition absente');
    return captureRef(composition.current, { format: 'jpg', quality: 0.95, result: 'tmpfile' });
  }

  async function enregistrer() {
    setAction('enregistrer');
    try {
      const { granted } = await requestPermissionsAsync(true);
      if (!granted) { setMessage(t('galerieRefusee')); return; }
      await Asset.create(await exporter());
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      setMessage(t('photoEnregistree'));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setAction(null);
    }
  }

  async function partager() {
    setAction('partager');
    try {
      const fichier = await exporter();
      // La légende est copiée d'avance : Instagram & co ne reçoivent pas de texte avec l'image.
      await Clipboard.setStringAsync(t(LEGENDES[legende])).catch(() => undefined);
      setMessage(t('legendeCopiee'));
      if (!(await Sharing.isAvailableAsync())) { setMessage(t('partageIndisponible')); return; }
      await Sharing.shareAsync(fichier, { mimeType: 'image/jpeg', UTI: 'public.jpeg', dialogTitle: 'Gorée Island' });
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setAction(null);
    }
  }

  // --- Permission caméra ---
  if (!permission) return <View style={{ flex: 1, backgroundColor: couleurs.encre }} />;
  if (!permission.granted) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: couleurs.encre, padding: 24, justifyContent: 'center', gap: 16 }}>
        <Titre taille={28} style={{ color: couleurs.blanc }}>Gorée Moments</Titre>
        <Texte style={{ color: couleurs.sable }}>{t('momentsPermission')}</Texte>
        <Bouton titre={t('autoriserCamera')} onPress={() => void demanderPermission()} />
        <Bouton titre={t('fermer')} variante="clair" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  const photoNoeud = photo ? (
    <Image source={{ uri: photo }} contentFit="cover" style={{ flex: 1 }} onLoad={() => setImagePrete(true)}
      accessibilityLabel={t('taPhoto')} />
  ) : (
    <CameraView ref={camera} style={{ flex: 1 }} facing={cote} mirror={cote === 'front'} />
  );

  return (
    <View style={{ flex: 1, backgroundColor: couleurs.encre, paddingTop: marges.top, paddingBottom: marges.bottom }}>
      {/* Barre du haut : fermer · lieu · format */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12,
        height: 52 }}>
        <BoutonRond libelle={t('fermer')} onPress={() => (photo ? setPhoto(null) : router.back())}>
          <Path d={photo ? 'M15 6l-6 6 6 6' : 'M6 6l12 12M18 6L6 18'} />
        </BoutonRond>
        <Pressable accessibilityRole="button" accessibilityLabel={`${t('lieu')} : ${lieu}`} onPress={() => setChoixLieu(true)}
          style={{ flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 36,
            borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.12)' }}>
          <Text style={{ fontSize: 12 }}>📍</Text>
          <Text numberOfLines={1} style={{ fontFamily: polices.texteMoyen, fontSize: 13, color: couleurs.blanc }}>{lieu}</Text>
        </Pressable>
        {!photo ? (
          <View style={{ flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 18, padding: 3 }}>
            {FORMATS.map((f) => (
              <Pressable key={f.id} accessibilityRole="radio" accessibilityState={{ selected: format === f.id }}
                onPress={() => setFormat(f.id)} style={{ paddingHorizontal: 8, height: 30, borderRadius: 15,
                  justifyContent: 'center', backgroundColor: format === f.id ? couleurs.blanc : 'transparent' }}>
                <Text style={{ fontFamily: polices.texteGras, fontSize: 11,
                  color: format === f.id ? couleurs.encre : couleurs.blanc }}>{f.libelle}</Text>
              </Pressable>
            ))}
          </View>
        ) : <View style={{ width: 44 }} />}
      </View>

      {/* La composition (aperçu en direct, puis photo) */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View ref={composition} collapsable={false} style={{ borderRadius: photo ? 0 : 18, overflow: 'hidden' }}>
          <Composition cadre={cadreEffectif} largeur={largeur} format={format} photo={photoNoeud} lieu={lieu} date={date} />
        </View>
      </View>

      {memoire ? (
        <Text style={{ fontFamily: polices.texteMoyen, fontSize: 12, color: couleurs.ocreClair, textAlign: 'center',
          paddingHorizontal: 24, marginTop: 6 }}>{t('momentsMemoire')}</Text>
      ) : null}
      {message ? (
        <Text accessibilityLiveRegion="polite" style={{ fontFamily: polices.texteMoyen, fontSize: 13, color: couleurs.ocre,
          textAlign: 'center', marginTop: 6, paddingHorizontal: 24 }}>{message}</Text>
      ) : null}

      {!photo ? (
        <>
          {/* Cadres */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}
            contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingVertical: 12 }}>
            {cadres.map((c) => {
              const actif = cadreEffectif === c.id;
              return (
                <Pressable key={c.id} accessibilityRole="radio" accessibilityState={{ selected: actif }}
                  onPress={() => { setCadre(c.id); void Haptics.selectionAsync().catch(() => undefined); }}
                  style={{ paddingHorizontal: 14, height: 34, borderRadius: 17, justifyContent: 'center',
                    backgroundColor: actif ? couleurs.ocre : 'rgba(255,255,255,0.12)' }}>
                  <Text style={{ fontFamily: polices.texteGras, fontSize: 13,
                    color: actif ? couleurs.encre : couleurs.blanc }}>{t(c.libelle)}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          {/* Déclencheur */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingBottom: 8 }}>
            <View style={{ width: 48 }} />
            <Pressable accessibilityRole="button" accessibilityLabel={t('prendrePhoto')} onPress={() => void declencher()}
              style={({ pressed }) => ({ width: 78, height: 78, borderRadius: 39, borderWidth: 4, borderColor: couleurs.blanc,
                alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.92 : 1 }] })}>
              <View style={{ width: 62, height: 62, borderRadius: 31, backgroundColor: couleurs.blanc }} />
            </Pressable>
            <BoutonRond libelle={t('retournerCamera')} onPress={() => setCote((c) => (c === 'back' ? 'front' : 'back'))}>
              <Path d="M4 12a8 8 0 0114-5.3M20 12a8 8 0 01-14 5.3M18 3v4h-4M6 21v-4h4" />
            </BoutonRond>
          </View>
        </>
      ) : (
        <View style={{ paddingHorizontal: 16, paddingTop: 10, gap: 10 }}>
          {/* Légende proposée (toucher = une autre) */}
          <Pressable accessibilityRole="button" accessibilityHint={t('autreLegende')}
            onPress={() => setLegende((i) => (i + 1) % LEGENDES.length)}
            style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: 12 }}>
            <Text style={{ fontFamily: polices.texte, fontSize: 13, color: couleurs.sable }}>{t(LEGENDES[legende])}</Text>
            <Text style={{ fontFamily: polices.texteGras, fontSize: 11, color: couleurs.ocre, marginTop: 4 }}>
              {t('autreLegende')} ↻</Text>
          </Pressable>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Bouton titre={t('enregistrer')} variante="clair" style={{ flex: 1 }} desactive={!imagePrete}
              chargement={action === 'enregistrer'} onPress={() => void enregistrer()} />
            <Bouton titre={t('partager')} style={{ flex: 1.4 }} desactive={!imagePrete}
              chargement={action === 'partager'} onPress={() => void partager()} />
          </View>
          {Platform.OS === 'web' ? <Texte style={{ fontSize: 11, color: couleurs.sable }}>{t('momentsWeb')}</Texte> : null}
        </View>
      )}

      {/* Choix du lieu + spots photo */}
      <Modal visible={choixLieu} transparent animationType="slide" onRequestClose={() => setChoixLieu(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={() => setChoixLieu(false)} />
        <View style={{ backgroundColor: couleurs.sable, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20,
          paddingBottom: 20 + marges.bottom, gap: 10, maxHeight: '75%' }}>
          <Titre taille={22}>{t('spotsPhoto')}</Titre>
          <ScrollView contentContainerStyle={{ gap: 8 }}>
            {[undefined, ...SPOTS].map((s) => {
              const actif = s?.id === spot?.id;
              return (
                <Pressable key={s?.id ?? 'defaut'} accessibilityRole="radio" accessibilityState={{ selected: actif }}
                  onPress={() => { setSpot(s); setChoixLieu(false); }}
                  style={{ padding: 14, borderRadius: 16, backgroundColor: couleurs.blanc, borderWidth: actif ? 2 : 1,
                    borderColor: actif ? couleurs.terracotta : couleurs.bordure, gap: 2 }}>
                  <Texte gras style={{ color: couleurs.encre }}>{s?.nom ?? LIEU_PAR_DEFAUT}</Texte>
                  {s ? <Texte style={{ fontSize: 13 }}>{t(s.conseil)}</Texte> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function BoutonRond({ children, libelle, onPress }: { children: React.ReactNode; libelle: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={libelle} onPress={onPress} hitSlop={6}
      style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.12)' }}>
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={couleurs.blanc} strokeWidth={2}
        strokeLinecap="round" strokeLinejoin="round">{children}</Svg>
    </Pressable>
  );
}

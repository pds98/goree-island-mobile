/**
 * ASSISTANT TÉRANGA — interface (inspirée de l'assistant vocal de Max It).
 *
 *  - Un BOUTON MICRO flottant, présent sur les écrans principaux.
 *  - Un PANNEAU d'écoute : micro animé, transcription, réponse écrite ET
 *    lue à voix haute, suggestions à toucher, saisie au clavier en secours.
 *  - Un MESSAGE D'ACCUEIL vocal au lancement de l'app (désactivable).
 *
 * Tout est dessiné dans une <CouchePleinEcran> : sur iPhone, une couche
 * ordinaire au-dessus de la navigation native ne recevait pas les touchers.
 * Les boutons sont des <ToucheFiable> : iOS annulait parfois le 1er appui.
 *
 * Flux : micro (ou clavier) → backend (voix.ts) : transcription, réponse
 * de l'IA dans la langue du visiteur, intention, VOIX NATURELLE (mp3) →
 * l'app joue la voix et exécute l'action (navigation, préremplissage…).
 * Sans backend : analyse locale (commandes.ts) + meilleure voix du téléphone.
 * SÉCURITÉ : l'assistant ne paie JAMAIS ; il prépare, le visiteur valide.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioPlayer, useAudioRecorder,
} from 'expo-audio';
import { router, usePathname } from 'expo-router';
import * as Speech from 'expo-speech';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated, BackHandler, Easing, Keyboard, KeyboardAvoidingView, Platform, ScrollView, Text,
  TextInput, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';

import { heureDakar, listerRotations } from '@/api/client';
import { libelleDate } from '@/composants/Calendrier';
import { CouchePleinEcran } from '@/composants/CouchePleinEcran';
import { ToucheFiable } from '@/composants/ToucheFiable';
import { LIEUX, traduire } from '@/demo/donnees';
import { LANGUES, useT, type Cles, type Langue } from '@/i18n';
import { couleurs, polices, rayon } from '@/theme';
import { comprendre, type Ecran, type Intention } from './commandes';
import { parlerNaturel } from './synthese';
import { demanderAudio, demanderTexte, demanderVoix, type ReponseAssistant } from './voix';

type Etat = 'repos' | 'ecoute' | 'analyse';

/** Écrans où le bouton micro serait gênant (plein écran, caméra). */
const ECRANS_SANS_MICRO = ['/visite-3d', '/identite'];
const CLE_ACCUEIL = 'goree.accueilVocal';
const DUREE_MAX_ECOUTE_MS = 10_000;
const DUREE_MIN_ECOUTE_MS = 600;     // en dessous : rien d'exploitable, on redemande
let accueilDejaLu = false;           // une seule fois par lancement de l'app

/** Messages d'erreur du micro, dans la langue de l'app (clairs, sans jargon). */
type ErreurMicro = 'serveur' | 'silence' | 'micro';
const ERREURS_MICRO: Record<ErreurMicro, Record<Langue, string>> = {
  serveur: {
    fr: 'Je n’arrive pas à joindre le serveur. Vérifie ta connexion, ou écris ta demande.',
    en: 'I can’t reach the server. Check your connection, or type your request.',
    es: 'No consigo conectar con el servidor. Revisa tu conexión o escribe tu solicitud.',
    ar: 'لا أستطيع الاتصال بالخادم. تحقق من اتصالك أو اكتب طلبك.',
    wo: 'Mënuma jot ci serwëer bi. Seetal sa connexion, walla bindal li nga bëgg.',
  },
  silence: {
    fr: 'Je ne t’ai pas entendu. Touche le micro et parle un peu plus longtemps.',
    en: 'I didn’t hear you. Tap the mic and speak a little longer.',
    es: 'No te he oído. Toca el micro y habla un poco más.',
    ar: 'لم أسمعك. المس الميكروفون وتحدث لفترة أطول قليلاً.',
    wo: 'Dégguma la. Bësal mikro bi te waxaat ba yàgg tuuti.',
  },
  micro: {
    fr: 'Le micro ne démarre pas. Vérifie l’autorisation du micro pour Expo Go, ou écris ta demande.',
    en: 'The microphone won’t start. Check Expo Go’s microphone permission, or type your request.',
    es: 'El micrófono no arranca. Revisa el permiso de micrófono de Expo Go o escribe tu solicitud.',
    ar: 'الميكروفون لا يعمل. تحقق من إذن الميكروفون لـ Expo Go أو اكتب طلبك.',
    wo: 'Mikro bi du dox. Seetal ndigal mikro bi ci Expo Go, walla bindal li nga bëgg.',
  },
};

/** Confirmation de changement de langue, dite DANS la nouvelle langue. */
const CONFIRMATION_LANGUE: Record<Langue, string> = {
  fr: 'C’est noté, je passe en français.', en: 'Done, switching to English.',
  es: 'Hecho, cambio a español.', ar: 'تم، سأتحدث بالعربية.', wo: 'Waaw, dinaa wax ci wolof.',
};

/** Écran demandé → route Expo Router + clé du libellé affiché. */
const ROUTES: Record<Ecran, { chemin: string; libelle: Cles }> = {
  accueil: { chemin: '/', libelle: 'ongletAccueil' },
  chaloupe: { chemin: '/chaloupe', libelle: 'chaloupeTitre' },
  ile: { chemin: '/ile', libelle: 'ileTitre' },
  billets: { chemin: '/billets', libelle: 'mesBillets' },
  circuits: { chemin: '/circuits', libelle: 'circuits' },
  audio: { chemin: '/audio-guide', libelle: 'audioGuide' },
  packs: { chemin: '/packs', libelle: 'packs' },
  visite3d: { chemin: '/visite-3d', libelle: 'visite3dTitre' },
  guides: { chemin: '/marketplace?type=GUIDE', libelle: 'guides' },
  restaurants: { chemin: '/marketplace?type=RESTAURANT', libelle: 'restaurants' },
  hotels: { chemin: '/marketplace?type=HOTEL', libelle: 'hotels' },
};

// --- Icônes -----------------------------------------------------------------------

function IconeMicro({ couleur, taille = 26 }: { couleur: string; taille?: number }) {
  return (
    <Svg width={taille} height={taille} viewBox="0 0 24 24" fill="none">
      <Rect x={9} y={3} width={6} height={11} rx={3} fill={couleur} />
      <Path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7" stroke={couleur} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

/** Anneaux qui « respirent » autour du micro pendant l'écoute. */
function Ondes({ actif }: { actif: boolean }) {
  const valeurs = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;
  useEffect(() => {
    if (!actif) { valeurs.forEach((v) => v.setValue(0)); return; }
    const boucles = valeurs.map((v, i) => Animated.loop(Animated.sequence([
      Animated.delay(i * 400),
      Animated.timing(v, { toValue: 1, duration: 1200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: true }),
    ])));
    boucles.forEach((b) => b.start());
    return () => boucles.forEach((b) => b.stop());
  }, [actif, valeurs]);
  return (
    <>
      {valeurs.map((v, i) => (
        <Animated.View key={i} pointerEvents="none" style={{ position: 'absolute', width: 96, height: 96,
          borderRadius: 48, backgroundColor: couleurs.terracotta,
          opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] }),
          transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 2.1] }) }] }} />
      ))}
    </>
  );
}

// --- Composant principal ------------------------------------------------------------

export function AssistantVocal() {
  const { t, langue, setLangue, selecteurOuvert } = useT();
  const chemin = usePathname();
  const marges = useSafeAreaInsets();
  const [ouvert, setOuvert] = useState(false);
  const [etat, setEtat] = useState<Etat>('repos');
  const [texte, setTexte] = useState('');
  const [transcription, setTranscription] = useState<string | null>(null);
  const [reponse, setReponse] = useState<string | null>(null);
  const [bulleAccueil, setBulleAccueil] = useState(false);
  // « Clic fantôme » : le doigt qui ouvre le panneau ne doit pas activer la
  // suggestion qui apparaît dessous. Le panneau ignore les touchers 400 ms.
  const [pret, setPret] = useState(false);
  useEffect(() => {
    if (!ouvert) { setPret(false); return; }
    const m = setTimeout(() => setPret(true), 400);
    return () => clearTimeout(m);
  }, [ouvert]);
  const enregistreur = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const lecteurVoix = useAudioPlayer(null);
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Jeton de parole : chaque nouvelle prise de parole (ou « tais-toi ») annule
  // la précédente, même si sa voix arrive du serveur après coup.
  const jetonParole = useRef(0);

  /**
   * Dit une phrase de l'app avec la voix ElevenLabs (route /dire, mise en cache
   * côté serveur). Repli : meilleure voix du téléphone (hors ligne, quota,
   * texte long comme les narrations — l'audio-guide garde la voix du téléphone).
   */
  const parler = useCallback((phrase: string, langueVoix: Langue = langue) => {
    const mien = ++jetonParole.current;
    Speech.stop();
    lecteurVoix.pause();
    void (async () => {
      const url = await demanderAudio(phrase, langueVoix);
      if (mien !== jetonParole.current) return;              // une autre parole a pris le relais
      if (url) {
        lecteurVoix.replace({ uri: url });
        lecteurVoix.play();
      } else {
        void parlerNaturel(phrase, langueVoix);
      }
    })();
  }, [langue, lecteurVoix]);

  const taireTout = useCallback(() => {
    jetonParole.current += 1;
    Speech.stop();
    lecteurVoix.pause();
  }, [lecteurVoix]);

  // --- Message d'accueil vocal (une fois par lancement, désactivable) ------------
  useEffect(() => {
    if (accueilDejaLu) return;
    accueilDejaLu = true;
    AsyncStorage.getItem(CLE_ACCUEIL).then((v) => {
      if (v === 'off') return;
      // Lecture même si l'iPhone est en mode silencieux (comme la voix du téléphone avant).
      setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => undefined);
      setTimeout(() => {
        setBulleAccueil(true);
        parler(t('accueilVocal'));
        setTimeout(() => setBulleAccueil(false), 9000);
      }, 1200);
    }).catch(() => undefined);
    // Volontairement une seule fois au montage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const couperAccueil = () => {
    jetonParole.current += 1;
    lecteurVoix.pause();
    Speech.stop();
    setBulleAccueil(false);
    AsyncStorage.setItem(CLE_ACCUEIL, 'off').catch(() => undefined);
  };

  // --- Exécution d'une intention ------------------------------------------------
  const executer = useCallback(async (intention: Intention, silencieux = false) => {
    let phrase: string;
    switch (intention.type) {
      case 'acheter_chaloupe': {
        const n = intention.passagers ?? 1;
        router.navigate({ pathname: '/chaloupe', params: {
          passagers: String(n), trajet: intention.trajet ?? 'ALLER_RETOUR', ...(intention.date ? { date: intention.date } : {}),
        } });
        phrase = t('repChaloupe', { n, trajet: (intention.trajet === 'ALLER_SIMPLE' ? t('allerSimple') : t('allerRetour')).toLowerCase(),
          date: intention.date ? libelleDate(intention.date, t) : t('aujourdhui').toLowerCase() });
        break;
      }
      case 'acheter_entree':
        router.navigate({ pathname: '/ile', params: {
          ...(intention.nationalite ? { nat: intention.nationalite } : {}),
          ...(intention.enfants !== undefined ? { enfants: String(intention.enfants) } : {}),
          ...(intention.adultes !== undefined ? { adultes: String(intention.adultes) } : {}),
          ...(intention.date ? { date: intention.date } : {}),
        } });
        phrase = t('repEntree', { date: intention.date ? libelleDate(intention.date, t) : t('aujourdhui').toLowerCase() });
        break;
      case 'prochain_depart': {
        if (silencieux) return;                 // le serveur a déjà répondu avec les horaires du jour
        try {
          const maintenant = Date.now();
          const prochain = (await listerRotations()).filter((r) => r.depart === 'Dakar')
            .find((r) => new Date(r.heure_prevue).getTime() + r.retard_minutes * 60_000 > maintenant);
          phrase = prochain ? t('repDepart', { h: heureDakar(prochain.heure_prevue) })
            + (prochain.retard_minutes ? ` (+${prochain.retard_minutes} min)` : '') : t('repAucunDepart');
        } catch {
          phrase = t('repAucunDepart');
        }
        break;
      }
      case 'langue':
        setLangue(intention.langue);
        if (silencieux) return;
        setReponse(CONFIRMATION_LANGUE[intention.langue]);
        parler(CONFIRMATION_LANGUE[intention.langue], intention.langue);
        return;
      case 'raconter': {
        const lieu = LIEUX[intention.lieu];
        router.navigate({ pathname: '/audio-guide', params: { lieu: intention.lieu } });
        phrase = `${traduire(lieu.nom, langue)}. ${traduire(lieu.narration, langue)}`;
        break;
      }
      case 'naviguer': {
        const r = ROUTES[intention.ecran];
        router.navigate(r.chemin as never);
        phrase = t('repOuvre', { ecran: t(r.libelle) });
        break;
      }
      default:
        phrase = t('assistantNonCompris');
    }
    if (silencieux) return;
    setReponse(phrase);
    parler(phrase);
    // On referme le panneau pour laisser voir l'écran ouvert (sauf incompréhension).
    if (intention.type !== 'inconnu') setTimeout(() => setOuvert(false), 2500);
  }, [langue, parler, setLangue, t]);

  /** Réponse de l'IA : on l'affiche, on joue la voix naturelle, on exécute l'action. */
  const appliquerReponseServeur = useCallback((r: ReponseAssistant) => {
    setTranscription(r.transcription);
    setReponse(r.reponse);
    if (r.audio_url) {
      jetonParole.current += 1;                 // annule une phrase /dire encore en route
      Speech.stop();
      lecteurVoix.replace({ uri: r.audio_url });
      lecteurVoix.play();
    } else {
      parler(r.reponse, r.langue);              // pas de voix serveur : meilleure voix du téléphone
    }
    if (r.intention) {
      void executer(r.intention, true);
      // Laisse le temps d'entendre le début de la réponse avant de dégager l'écran.
      if (r.intention.type !== 'prochain_depart') setTimeout(() => setOuvert(false), 4000);
    }
  }, [executer, lecteurVoix, parler]);

  const traiterTexte = useCallback(async (phrase: string) => {
    if (!phrase.trim() || etat !== 'repos') return;
    Keyboard.dismiss();
    taireTout();
    setTranscription(phrase.trim());
    setReponse(null);
    setTexte('');
    setEtat('analyse');
    try {
      const r = await demanderTexte(phrase.trim(), langue);
      if (r) appliquerReponseServeur(r);
      else await executer(comprendre(phrase));     // hors ligne : analyse locale
    } finally {
      setEtat('repos');
    }
  }, [appliquerReponseServeur, etat, executer, langue, taireTout]);

  // --- Micro ---------------------------------------------------------------------
  const erreurMicro = useCallback((type: ErreurMicro) => {
    setReponse(ERREURS_MICRO[type][langue]);
  }, [langue]);

  const arreterEcoute = useCallback(async () => {
    if (minuteur.current) clearTimeout(minuteur.current);
    setEtat('analyse');
    try {
      const duree = enregistreur.getStatus().durationMillis;      // mesurée AVANT l'arrêt
      await enregistreur.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      const statut = enregistreur.getStatus();
      const uri = enregistreur.uri ?? statut.url;
      // DIAGNOSTIC (Terminal d'Expo) : ce qui a été enregistré avant l'envoi.
      console.log(`[Assistant] enregistrement : ${duree} ms, ${statut.fileSize} octets, uri=${uri ?? 'aucune'}`);
      if (!uri) { erreurMicro('micro'); return; }
      if (duree < DUREE_MIN_ECOUTE_MS) { erreurMicro('silence'); return; }
      const resultat = await demanderVoix(uri, langue);
      if (resultat) appliquerReponseServeur(resultat);
      else erreurMicro('serveur');
    } catch (erreur) {
      console.warn(`[Assistant] arrêt du micro impossible : ${String(erreur)}`);
      erreurMicro('micro');
    } finally {
      setEtat('repos');
    }
  }, [appliquerReponseServeur, enregistreur, erreurMicro, langue]);

  const demarrerEcoute = useCallback(async () => {
    taireTout();
    setReponse(null);
    setTranscription(null);
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) { setReponse(t('assistantMicRefuse')); return; }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await enregistreur.prepareToRecordAsync();
      enregistreur.record();
      setEtat('ecoute');
      minuteur.current = setTimeout(() => { void arreterEcoute(); }, DUREE_MAX_ECOUTE_MS);
    } catch (erreur) {
      // Avant : l'erreur passait sous silence et rien ne se passait.
      console.warn(`[Assistant] démarrage du micro impossible : ${String(erreur)}`);
      setEtat('repos');
      erreurMicro('micro');
    }
  }, [arreterEcoute, enregistreur, erreurMicro, t, taireTout]);

  /** Micro flottant : ouvre le panneau ET écoute tout de suite (comme Max It). */
  const ouvrirEtEcouter = useCallback(() => {
    setOuvert(true);
    setBulleAccueil(false);
    if (etat === 'repos') void demarrerEcoute();
  }, [demarrerEcoute, etat]);

  const fermer = useCallback(() => {
    if (etat === 'ecoute') void arreterEcoute();
    taireTout();
    setOuvert(false);
  }, [arreterEcoute, etat, taireTout]);

  // Bouton retour Android : ferme le panneau.
  useEffect(() => {
    if (!ouvert) return;
    const abo = BackHandler.addEventListener('hardwareBackPress', () => { fermer(); return true; });
    return () => abo.remove();
  }, [ouvert, fermer]);

  if (ECRANS_SANS_MICRO.includes(chemin) || selecteurOuvert) return null;
  const rtl = !!LANGUES.find((l) => l.code === langue)?.rtl;
  const SUGGESTIONS: Cles[] = ['sugChaloupe', 'sugDepart', 'sugVisite', 'sugMaison', 'sugResto'];

  return (
    <CouchePleinEcran>
      {/* --- Bouton flottant (au-dessus de la barre d'onglets) ------------------ */}
      {!ouvert ? (
        <View pointerEvents="box-none" style={{ position: 'absolute', bottom: marges.bottom + 84,
          [rtl ? 'left' : 'right']: 18, alignItems: rtl ? 'flex-start' : 'flex-end', gap: 8 }}>
          {bulleAccueil ? (
            <View style={{ maxWidth: 260, backgroundColor: couleurs.encre, borderRadius: 16, padding: 12, gap: 8 }}>
              <Text style={{ fontFamily: polices.texteMoyen, fontSize: 13, color: couleurs.blanc }}>🔊 {t('accueilVocal')}</Text>
              <ToucheFiable onPress={couperAccueil} hitSlop={6}>
                <Text style={{ fontFamily: polices.texteGras, fontSize: 12, color: couleurs.ocre }}>🔇 {t('accueilVocalCouper')}</Text>
              </ToucheFiable>
            </View>
          ) : null}
          <ToucheFiable onPress={ouvrirEtEcouter}
            accessibilityRole="button" accessibilityLabel={t('assistantOuvrir')}
            style={({ pressed }) => ({ width: 62, height: 62, borderRadius: 31, alignItems: 'center',
              justifyContent: 'center', backgroundColor: couleurs.terracotta, transform: [{ scale: pressed ? 0.94 : 1 }],
              shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 8 })}>
            <View pointerEvents="none"><IconeMicro couleur={couleurs.blanc} /></View>
          </ToucheFiable>
        </View>
      ) : null}

      {/* --- Panneau d'écoute --------------------------------------------------- */}
      {ouvert ? (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          pointerEvents={pret ? 'auto' : 'none'}>
          <ToucheFiable style={{ flex: 1, backgroundColor: 'rgba(26,20,16,0.5)' }} onPress={fermer}
            accessibilityLabel={t('fermer')} />
          <View style={{ backgroundColor: couleurs.sable, borderTopLeftRadius: 28, borderTopRightRadius: 28,
            paddingHorizontal: 18, paddingTop: 12, paddingBottom: 14 + marges.bottom, gap: 14 }}>
            <View style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: couleurs.bordureForte }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontFamily: polices.titre, fontSize: 20, color: couleurs.encre }}>✨ {t('assistantTitre')}</Text>
              <ToucheFiable onPress={fermer} hitSlop={10} accessibilityLabel={t('fermer')}>
                <Text style={{ fontSize: 20, color: couleurs.gris }}>✕</Text>
              </ToucheFiable>
            </View>

            {/* Micro + état */}
            <View style={{ alignItems: 'center', gap: 10, paddingVertical: 6 }}>
              <View style={{ width: 96, height: 96, alignItems: 'center', justifyContent: 'center' }}>
                <Ondes actif={etat === 'ecoute'} />
                <ToucheFiable onPress={() => (etat === 'ecoute' ? arreterEcoute() : etat === 'repos' ? demarrerEcoute() : undefined)}
                  accessibilityRole="button" accessibilityLabel={t('assistantOuvrir')}
                  style={({ pressed }) => ({ width: 86, height: 86, borderRadius: 43, alignItems: 'center', justifyContent: 'center',
                    backgroundColor: etat === 'ecoute' ? couleurs.rouge : couleurs.terracotta, opacity: etat === 'analyse' ? 0.6 : 1,
                    transform: [{ scale: pressed ? 0.95 : 1 }] })}>
                  <View pointerEvents="none">
                    {etat === 'ecoute'
                      ? <View style={{ width: 26, height: 26, borderRadius: 6, backgroundColor: couleurs.blanc }} />
                      : <IconeMicro couleur={couleurs.blanc} taille={36} />}
                  </View>
                </ToucheFiable>
              </View>
              <Text style={{ fontFamily: polices.texteMoyen, fontSize: 14, color: couleurs.gris, textAlign: 'center' }}>
                {etat === 'ecoute' ? t('assistantEcoute') : etat === 'analyse' ? t('assistantAnalyse') : t('assistantAide')}
              </Text>
            </View>

            {/* Échange */}
            {transcription ? (
              <View style={{ alignSelf: rtl ? 'flex-start' : 'flex-end', maxWidth: '85%', backgroundColor: couleurs.blanc,
                borderRadius: 16, padding: 12, borderWidth: 1, borderColor: couleurs.bordure }}>
                <Text style={{ fontFamily: polices.texte, fontSize: 11, color: couleurs.gris }}>{t('assistantTuAsDit')}</Text>
                <Text style={{ fontFamily: polices.texteMoyen, fontSize: 15, color: couleurs.encre }}>« {transcription} »</Text>
              </View>
            ) : null}
            {reponse ? (
              <View style={{ alignSelf: rtl ? 'flex-end' : 'flex-start', maxWidth: '92%', backgroundColor: couleurs.ocean,
                borderRadius: 16, padding: 12 }}>
                <Text numberOfLines={6} style={{ fontFamily: polices.texteMoyen, fontSize: 15, color: couleurs.blanc, lineHeight: 21 }}>
                  {reponse}
                </Text>
              </View>
            ) : null}

            {/* Suggestions */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ gap: 8 }}>
              {SUGGESTIONS.map((c) => (
                <ToucheFiable key={c} onPress={() => { void traiterTexte(t(c)); }}
                  style={({ pressed }) => ({ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 18,
                    backgroundColor: pressed ? couleurs.terracottaClair : couleurs.blanc, borderWidth: 1, borderColor: couleurs.bordure })}>
                  <Text style={{ fontFamily: polices.texteMoyen, fontSize: 13, color: couleurs.encre }}>{t(c)}</Text>
                </ToucheFiable>
              ))}
            </ScrollView>

            {/* Saisie au clavier (secours, et en attendant la transcription serveur) */}
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <TextInput value={texte} onChangeText={setTexte} placeholder={t('assistantPlaceholder')}
                placeholderTextColor={couleurs.gris} returnKeyType="send" onSubmitEditing={() => { void traiterTexte(texte); }}
                style={{ flex: 1, minHeight: 48, borderRadius: rayon.m, borderWidth: 1, borderColor: couleurs.bordure,
                  backgroundColor: couleurs.blanc, paddingHorizontal: 14, fontFamily: polices.texte, fontSize: 15,
                  color: couleurs.encre, textAlign: rtl ? 'right' : 'left' }} />
              <ToucheFiable onPress={() => { void traiterTexte(texte); }} disabled={!texte.trim() || etat !== 'repos'}
                style={({ pressed }) => ({ minHeight: 48, paddingHorizontal: 16, borderRadius: rayon.m, justifyContent: 'center',
                  backgroundColor: couleurs.encre, opacity: !texte.trim() ? 0.4 : pressed ? 0.8 : 1 })}>
                <Text style={{ fontFamily: polices.texteGras, color: couleurs.blanc }}>{t('assistantEnvoyer')}</Text>
              </ToucheFiable>
            </View>
          </View>
        </KeyboardAvoidingView>
      ) : null}
    </CouchePleinEcran>
  );
}

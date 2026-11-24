/**
 * Audio-guide.
 *
 * 1) MODE RÉEL (billet + backend) : le téléphone suit la position GPS ; à
 *    chaque déplacement de 10 m, l'API indique si l'on est dans la zone d'une
 *    étape et renvoie la piste audio dans la langue de l'app. Conditions
 *    vérifiées par le serveur : être entré sur l'île + pack Essentiel/Premium.
 *
 * 2) MODE DÉMO (sans backend) : chaque lieu de src/demo/donnees.ts a une
 *    narration écrite, lue à voix haute par la synthèse vocale du téléphone
 *    (expo-speech) dans la langue choisie. Le wolof n'ayant pas de voix
 *    système, il est lu en français.
 */
import { useQuery } from '@tanstack/react-query';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as Speech from 'expo-speech';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { API_URL, ErreurApiClient, listerCircuits, positionAudio } from '@/api/client';
import type { ReponseAudio } from '@/api/types';
import { Bandeau, Bouton, Carte, Ecran, EnTete, Etiquette, Texte, Titre } from '@/composants/ui';
import { LIEUX, lieuParNom, ORDRE_VISITE, traduire, type IdLieu } from '@/demo/donnees';
import { parlerNaturel } from '@/assistant/synthese';
import { useT } from '@/i18n';
import { lireBillets, type BilletStocke } from '@/stockage/billets';
import { couleurs, polices } from '@/theme';

const PHOTOS: Partial<Record<IdLieu, number>> = {
  maison: require('@/assets/images/goree/goree-maison-esclaves.jpg'),
  castel: require('@/assets/images/goree/goree-castel.jpg'),
  artistes: require('@/assets/images/goree/goree-rue.jpg'),
  eglise: require('@/assets/images/goree/goree-rue.jpg'),
  mosquee: require('@/assets/images/goree/goree-hero.jpg'),
  fort: require('@/assets/images/goree/goree-hero.jpg'),
};

export default function AudioGuide() {
  const { t, langue } = useT();
  const params = useLocalSearchParams<{ circuit?: string; lieu?: IdLieu }>();
  const [billet, setBillet] = useState<BilletStocke | null>(null);
  const [reponse, setReponse] = useState<ReponseAudio | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [lieuActif, setLieuActif] = useState<IdLieu>(params.lieu ?? 'maison');
  const [enLecture, setEnLecture] = useState(false);
  const circuits = useQuery({ queryKey: ['circuits'], queryFn: listerCircuits });

  const lecteur = useAudioPlayer(null);
  const statut = useAudioPlayerStatus(lecteur);

  // Lieux à présenter : ceux du circuit demandé, sinon tout le parcours.
  const circuit = circuits.data?.find((c) => c.id === params.circuit);
  const lieux: IdLieu[] = circuit
    ? circuit.etapes.map((e) => lieuParNom(e.nom)?.id).filter((x): x is IdLieu => !!x)
    : ORDRE_VISITE;

  // Le billet d'entrée du site le plus récent enregistré sur le téléphone.
  useFocusEffect(useCallback(() => {
    lireBillets().then((bs) => setBillet(
      bs.filter((b) => b.billet.famille === 'ENTREE_SITE')
        .sort((a, b) => b.billet.date_visite.localeCompare(a.billet.date_visite))[0] ?? null));
    return () => { Speech.stop(); };             // on coupe la voix en quittant l'écran
  }, []));

  // --- Mode réel : position GPS → API ---------------------------------------------
  const envoyerPosition = useCallback(async (lat: number, lon: number) => {
    if (!billet) return;
    try {
      const r = await positionAudio({ numero: billet.billet.numero, telephone: billet.telephone,
        lat, lon, langue });
      setErreur(null);
      setReponse(r);
      if (r.piste) {
        lecteur.replace(`${API_URL}${r.piste}`);
        lecteur.play();
      }
    } catch (e) {
      // Pas de serveur : on reste silencieusement en mode démo.
      if ((e as ErreurApiClient).statut !== 0) setErreur((e as ErreurApiClient).message);
    }
  }, [billet, langue, lecteur]);

  useEffect(() => {
    if (!billet) return;
    let abonnement: Location.LocationSubscription | undefined;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      abonnement = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 10 },
        (pos) => envoyerPosition(pos.coords.latitude, pos.coords.longitude));
    })();
    return () => abonnement?.remove();
  }, [billet, envoyerPosition]);

  // --- Mode démo : narration par synthèse vocale ----------------------------------
  const lire = useCallback((id: IdLieu) => {
    setLieuActif(id);
    setEnLecture(true);
    void parlerNaturel(traduire(LIEUX[id].narration, langue), langue, {
      onDone: () => setEnLecture(false), onStopped: () => setEnLecture(false),
      onError: () => setEnLecture(false),
    });
  }, [langue]);

  const arreter = () => { Speech.stop(); setEnLecture(false); };

  // Changer de langue pendant la lecture : on arrête pour ne pas mélanger.
  useEffect(() => { Speech.stop(); setEnLecture(false); }, [langue]);

  const lieu = LIEUX[lieuActif];

  return (
    <Ecran style={{ padding: 0, gap: 0 }}>
      <Image source={PHOTOS[lieuActif]} contentFit="cover" style={{ height: 220 }}
        accessibilityLabel={traduire(lieu.nom, langue)} transition={300} />
      <View style={{ padding: 20, gap: 16 }}>
        <EnTete surtitre={(circuit?.nom ?? t('audioGuide')).toUpperCase()} titre={traduire(lieu.nom, langue)} />

        {erreur ? <Bandeau ton="erreur" texte={erreur} /> : null}

        {/* Piste du mode réel, si le serveur en a envoyé une */}
        {reponse?.piste ? (
          <Carte style={{ gap: 10 }}>
            <Texte gras>{reponse.etape}</Texte>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: couleurs.bordure }}>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: couleurs.terracotta,
                width: `${statut.duration ? (100 * statut.currentTime) / statut.duration : 0}%` }} />
            </View>
            <Bouton titre={statut.playing ? t('pause') : t('ecouter')} variante="terracotta"
              onPress={() => (statut.playing ? lecteur.pause() : lecteur.play())} />
            {reponse.rappel_memoriel ? <Bandeau ton="sombre" texte={t('lieuMemoire')} /> : null}
          </Carte>
        ) : null}

        {/* Lieu sélectionné : résumé + narration */}
        <Carte style={{ gap: 12 }}>
          <Texte style={{ fontSize: 14, lineHeight: 21 }}>{traduire(lieu.narration, langue)}</Texte>
          {lieu.memoriel ? <Bandeau ton="sombre" texte={t('lieuMemoire')} /> : null}
          <Bouton titre={enLecture ? `■  ${t('arreter')}` : `▶  ${t('ecouter')}`} variante="terracotta"
            onPress={() => (enLecture ? arreter() : lire(lieuActif))} />
        </Carte>

        <Bandeau ton="info" texte={t('audioDemo')} />

        {/* Liste des lieux */}
        <View style={{ gap: 8 }}>
          {lieux.map((id, i) => {
            const actif = id === lieuActif;
            return (
              <Pressable key={id} onPress={() => lire(id)} accessibilityRole="button"
                accessibilityState={{ selected: actif }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16,
                  borderWidth: actif ? 2 : 1, borderColor: actif ? couleurs.terracotta : couleurs.bordure,
                  backgroundColor: actif ? couleurs.terracottaClair : couleurs.blanc }}>
                <View style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center',
                  justifyContent: 'center', backgroundColor: actif ? couleurs.terracotta : couleurs.sableFonce }}>
                  <Text style={{ fontFamily: polices.texteGras, color: actif ? couleurs.blanc : couleurs.encre }}>
                    {actif && enLecture ? '♪' : i + 1}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Texte gras style={{ color: couleurs.encre }}>{traduire(LIEUX[id].nom, langue)}</Texte>
                  <Texte style={{ fontSize: 12 }}>{traduire(LIEUX[id].resume, langue)}</Texte>
                </View>
                {LIEUX[id].memoriel ? <Etiquette texte="◆" fond={couleurs.encre} couleur={couleurs.blanc} /> : null}
              </Pressable>
            );
          })}
        </View>

        {billet ? (
          <>
            <Titre taille={17}>{t('simulerPosition')}</Titre>
            {lieux.map((id) => (
              <Bouton key={`gps-${id}`} titre={traduire(LIEUX[id].nom, langue)} variante="contour"
                onPress={() => envoyerPosition(LIEUX[id].lat, LIEUX[id].lon)} />
            ))}
          </>
        ) : null}
        <Texte style={{ fontSize: 12, color: couleurs.gris }}>{t('pistesAProduire')}</Texte>
      </View>
    </Ecran>
  );
}

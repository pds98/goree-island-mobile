/**
 * Audio-guide géolocalisé. Le téléphone suit la position GPS ; à chaque
 * déplacement de 10 m, l'API indique si l'on est dans la zone d'une étape
 * et renvoie la piste dans la langue choisie. Conditions (vérifiées par le
 * serveur) : être entré sur l'île + pack Essentiel ou Premium.
 *
 * Mode démo : des boutons placent virtuellement le visiteur à une étape,
 * pour tester sans être à Gorée.
 */
import { useQuery } from '@tanstack/react-query';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import { API_URL, ErreurApiClient, listerCircuits, positionAudio } from '@/api/client';
import type { ReponseAudio } from '@/api/types';
import { Bandeau, Bouton, Ecran, EnTete, Segment, Texte, Titre } from '@/composants/ui';
import { useT } from '@/i18n';
import { lireBillets, type BilletStocke } from '@/stockage/billets';
import { couleurs } from '@/theme';

type Langue = 'fr' | 'en' | 'wo' | 'es' | 'pt';

export default function AudioGuide() {
  const { t } = useT();
  const [billet, setBillet] = useState<BilletStocke | null>(null);
  const [langue, setLangue] = useState<Langue>('fr');
  const [reponse, setReponse] = useState<ReponseAudio | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const circuits = useQuery({ queryKey: ['circuits'], queryFn: listerCircuits });

  const lecteur = useAudioPlayer(null);
  const statut = useAudioPlayerStatus(lecteur);

  // Le billet d'entrée du site le plus récent enregistré sur le téléphone.
  useFocusEffect(useCallback(() => {
    lireBillets().then((bs) => setBillet(
      bs.filter((b) => b.billet.famille === 'ENTREE_SITE')
        .sort((a, b) => b.billet.date_visite.localeCompare(a.billet.date_visite))[0] ?? null));
  }, []));

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
      setErreur((e as ErreurApiClient).message);
    }
  }, [billet, langue, lecteur]);

  // Suivi GPS réel (premier plan uniquement).
  useEffect(() => {
    let abonnement: Location.LocationSubscription | undefined;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      abonnement = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 10 },
        (pos) => envoyerPosition(pos.coords.latitude, pos.coords.longitude));
    })();
    return () => abonnement?.remove();
  }, [envoyerPosition]);

  return (
    <Ecran style={{ padding: 0, gap: 0 }}>
      <Image source={require('@/assets/images/goree/goree-maison-esclaves.jpg')} contentFit="cover"
        style={{ height: 220 }} accessibilityLabel="Cour de la Maison des Esclaves" />
      <View style={{ padding: 20, gap: 16 }}>
        <EnTete surtitre={reponse?.circuit?.toUpperCase() ?? 'AUDIO-GUIDE'} titre={reponse?.etape ?? t('audioGuide')} />

        {!billet ? <Bandeau ton="alerte" texte="Achète d'abord ton entrée du site (pack Essentiel ou Premium)." /> : null}
        {erreur ? <Bandeau ton="erreur" texte={erreur} /> : null}

        <Segment<Langue> valeur={langue} onChange={setLangue} options={[
          { valeur: 'fr', libelle: 'FR' }, { valeur: 'en', libelle: 'EN' }, { valeur: 'wo', libelle: 'WO' },
          { valeur: 'es', libelle: 'ES' }, { valeur: 'pt', libelle: 'PT' },
        ]} />

        {reponse?.etape ? (
          <View style={{ gap: 10 }}>
            <Texte>À {reponse.distance_m} m · piste : {reponse.piste?.split('/').pop()}</Texte>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: couleurs.bordure }}>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: couleurs.terracotta,
                width: `${statut.duration ? (100 * statut.currentTime) / statut.duration : 0}%` }} />
            </View>
            <Bouton titre={statut.playing ? 'Pause' : 'Écouter'} variante="terracotta"
              onPress={() => (statut.playing ? lecteur.pause() : lecteur.play())} />
            {reponse.rappel_memoriel ? <Bandeau ton="sombre" texte={t('lieuMemoire')} /> : null}
          </View>
        ) : reponse ? <Texte>{t('aucuneEtape')}</Texte> : null}

        <Titre taille={17}>{t('simulerPosition')}</Titre>
        {circuits.data?.flatMap((c) => c.etapes).map((e) => (
          <Bouton key={e.nom} titre={e.nom} variante="contour" desactive={!billet}
            onPress={() => envoyerPosition(e.lat, e.lon)} />
        ))}
        <Texte style={{ fontSize: 12, color: couleurs.gris }}>
          Les pistes audio sont à produire (voix, validation par des historiens) ; les coordonnées GPS sont à relever sur place.
        </Texte>
      </View>
    </Ecran>
  );
}

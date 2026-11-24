/**
 * Horaires du jour d'une ligne de chaloupe, affichés sur le billet.
 *
 *   06:15 ──────────── 06:35   Arrivée
 *   10:00 ~~10:00~~ +15 ─ 10:35   En mer   ← ta chaloupe / prochain départ
 *
 * - Deux sens : Dakar → Gorée et Gorée → Dakar.
 * - Le statut de chaque traversée (à venir, en mer, arrivée) est recalculé
 *   toutes les 30 s sur le téléphone, à partir des heures fournies par le
 *   serveur (retard compris).
 * - Toucher une ligne, ou « Suivre en direct », ouvre l'écran de suivi.
 */
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';

import { heureDakar, listerRotations } from '@/api/client';
import type { Port, Rotation } from '@/api/types';
import { Bouton, Etiquette, Segment, Texte, Titre } from '@/composants/ui';
import { useT, type Cles } from '@/i18n';
import { couleurs, espace, polices, rayon } from '@/theme';

export type EtatTraversee = 'A_VENIR' | 'EN_MER' | 'ARRIVEE';

/** État d'une traversée à l'instant `maintenant` (ms), d'après ses heures réelles. */
export function etatTraversee(r: Rotation, maintenant: number): EtatTraversee {
  if (maintenant < Date.parse(r.heure_depart_reelle)) return 'A_VENIR';
  if (maintenant < Date.parse(r.heure_arrivee_estimee)) return 'EN_MER';
  return 'ARRIVEE';
}

/** Horloge qui avance toutes les `pasMs` millisecondes (pour recalculer les statuts). */
export function useMaintenant(pasMs = 30_000): number {
  const [maintenant, setMaintenant] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setMaintenant(Date.now()), pasMs);
    return () => clearInterval(id);
  }, [pasMs]);
  return maintenant;
}

/**
 * Traversée la plus pertinente à suivre : celle du billet si elle est connue,
 * sinon celle en mer, sinon le prochain départ, sinon la dernière du jour.
 */
export function traverseeASuivre(liste: Rotation[], maintenant: number, rotationBillet?: string | null) {
  return liste.find((r) => r.id === rotationBillet)
    ?? liste.find((r) => etatTraversee(r, maintenant) === 'EN_MER')
    ?? liste.find((r) => etatTraversee(r, maintenant) === 'A_VENIR')
    ?? liste[liste.length - 1];
}

export function HorairesDuJour({ jour, rotationBillet }: { jour: string; rotationBillet?: string | null }) {
  const { t } = useT();
  const maintenant = useMaintenant();
  const horaires = useQuery({ queryKey: ['rotations', jour], queryFn: () => listerRotations(jour),
    refetchInterval: 60_000 });
  const liste = horaires.data ?? [];

  // Sens affiché : celui de la chaloupe du billet, sinon Dakar → Gorée.
  const sensBillet = liste.find((r) => r.id === rotationBillet)?.depart;
  const [sens, setSens] = useState<Port | null>(null);
  const sensAffiche: Port = sens ?? sensBillet ?? 'Dakar';
  const lignes = liste.filter((r) => r.depart === sensAffiche);
  const prochain = lignes.find((r) => etatTraversee(r, maintenant) === 'A_VENIR');
  const aSuivre = traverseeASuivre(lignes, maintenant, rotationBillet);

  return (
    <View style={{ backgroundColor: couleurs.sable, borderRadius: 24, padding: 18, gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Titre taille={20}>{t('horairesDuJour')}</Titre>
        {lignes.length ? <Texte style={{ fontSize: 12, color: couleurs.gris }}>
          {t('traversee')} ~{lignes[0].duree_min} min</Texte> : null}
      </View>

      <Segment<Port> valeur={sensAffiche} onChange={setSens} options={[
        { valeur: 'Dakar', libelle: t('dakarGoree') }, { valeur: 'Gorée', libelle: t('goreeDakar') },
      ]} />

      {horaires.isLoading ? <ActivityIndicator color={couleurs.ocean} /> : null}
      {!horaires.isLoading && lignes.length === 0 ? (
        <Texte style={{ fontSize: 13, color: couleurs.gris }}>
          {horaires.isError ? t('suiviIndispo') : t('aucunHoraire')}
        </Texte>
      ) : null}

      <View style={{ gap: 6 }}>
        {lignes.map((r) => (
          <LigneHoraire key={r.id} r={r} etat={etatTraversee(r, maintenant)}
            estBillet={r.id === rotationBillet} estProchain={r.id === prochain?.id} />
        ))}
      </View>

      {aSuivre ? (
        <Bouton titre={`${t('suivreDirect')} · ${heureDakar(aSuivre.heure_depart_reelle)}`} variante="ocean"
          onPress={() => router.push({ pathname: '/suivi/[id]', params: { id: aSuivre.id } })} />
      ) : null}
    </View>
  );
}

const LIBELLE_ETAT: Record<EtatTraversee, Cles> = {
  A_VENIR: 'statutAQuai', EN_MER: 'statutEnMer', ARRIVEE: 'statutArrivee',
};

function LigneHoraire({ r, etat, estBillet, estProchain }: {
  r: Rotation; etat: EtatTraversee; estBillet: boolean; estProchain: boolean;
}) {
  const { t } = useT();
  const passe = etat === 'ARRIVEE';
  const enAvant = estBillet || estProchain || etat === 'EN_MER';
  const fond = estBillet ? couleurs.ocean : etat === 'EN_MER' ? couleurs.oceanClair : couleurs.blanc;
  const encre = estBillet ? couleurs.blanc : couleurs.encre;
  const doux = estBillet ? couleurs.oceanClair : couleurs.gris;

  return (
    <Pressable accessibilityRole="button"
      accessibilityLabel={`${r.nom}, ${t('recapDepart')} ${heureDakar(r.heure_depart_reelle)}, ${t('statutArrivee')} ${heureDakar(r.heure_arrivee_estimee)}, ${t(LIBELLE_ETAT[etat])}`}
      onPress={() => router.push({ pathname: '/suivi/[id]', params: { id: r.id } })}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: espace.m,
        paddingVertical: 10, paddingHorizontal: 12, borderRadius: rayon.m, backgroundColor: fond,
        borderWidth: enAvant && !estBillet ? 1.5 : 1,
        borderColor: estBillet ? couleurs.ocean : enAvant ? couleurs.ocean : couleurs.bordure,
        opacity: passe && !estBillet ? 0.5 : pressed ? 0.85 : 1 })}>
      {/* Départ (heure réelle ; heure prévue barrée si retard) */}
      <View style={{ width: 58 }}>
        <Text style={{ fontFamily: polices.titre, fontSize: 18, color: encre }}>
          {heureDakar(r.heure_depart_reelle)}</Text>
        {r.retard_minutes ? (
          <Text style={{ fontFamily: polices.texte, fontSize: 11, color: doux, textDecorationLine: 'line-through' }}>
            {heureDakar(r.heure_prevue)}</Text>
        ) : null}
      </View>

      {/* Trait de traversée : pointillé à venir, plein en mer / arrivé */}
      <View style={{ flex: 1, height: 14 }}>
        <Svg width="100%" height={14}>
          <Line x1="6" y1="7" x2="100%" y2="7" stroke={estBillet ? couleurs.oceanClair : couleurs.ocean}
            strokeWidth={2} strokeDasharray={etat === 'A_VENIR' ? '4 5' : undefined} strokeOpacity={0.7} />
          <Circle cx="6" cy="7" r="5" fill={estBillet ? couleurs.blanc : couleurs.ocean} />
        </Svg>
      </View>

      <View style={{ width: 52, alignItems: 'flex-end' }}>
        <Text style={{ fontFamily: polices.texteGras, fontSize: 15, color: encre }}>
          {heureDakar(r.heure_arrivee_estimee)}</Text>
        {r.retard_minutes ? <Text style={{ fontFamily: polices.texteGras, fontSize: 11,
          color: estBillet ? couleurs.ocre : '#8A5A00' }}>+{r.retard_minutes} min</Text> : null}
      </View>

      <View style={{ width: 84, alignItems: 'flex-end' }}>
        {estBillet ? <Etiquette texte={t('taChaloupe')} fond={couleurs.ocre} />
          : estProchain ? <Etiquette texte={t('prochainCourt')} fond={couleurs.vert} couleur={couleurs.blanc} />
            : <Texte style={{ fontSize: 12, color: doux }}>{t(LIBELLE_ETAT[etat])}</Texte>}
      </View>
    </Pressable>
  );
}

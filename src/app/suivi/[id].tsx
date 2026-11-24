/**
 * SUIVI EN DIRECT d'une chaloupe Dakar ⇄ Gorée.
 *
 *   - carte illustrée de la baie, chaloupe animée sur son trajet ;
 *   - étapes À quai → En mer → Arrivée, heure d'arrivée estimée ;
 *   - source affichée : « GPS en direct » (agent à bord) ou « Position estimée »
 *     (calculée d'après l'horaire et le retard) ;
 *   - le serveur est interrogé toutes les 15 s ; entre deux réponses, la
 *     position estimée avance chaque seconde sur le téléphone (mouvement fluide).
 */
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, Pressable, Text, View } from 'react-native';

import { dateDakar, heureDakar, listerRotations, suivreRotation } from '@/api/client';
import type { StatutTraversee, SuiviChaloupe } from '@/api/types';
import { CarteBaie } from '@/composants/CarteBaie';
import { etatTraversee, useMaintenant } from '@/composants/HorairesDuJour';
import { Bandeau, Ecran, EnTete, Etiquette, Texte, Titre } from '@/composants/ui';
import { useT, type Cles } from '@/i18n';
import { couleurs, espace, polices, rayon } from '@/theme';

/** Progression et statut affichés : GPS tel quel, sinon recalculés à la seconde. */
function etatAffiche(s: SuiviChaloupe, maintenant: number): { p: number; statut: StatutTraversee } {
  if (s.source === 'GPS') return { p: s.progression, statut: s.statut };
  const debut = Date.parse(s.heure_depart_reelle);
  const fin = Date.parse(s.heure_arrivee_estimee);
  if (maintenant <= debut) return { p: 0, statut: 'A_QUAI' };
  if (maintenant >= fin) return { p: 1, statut: 'ARRIVEE' };
  return { p: (maintenant - debut) / (fin - debut), statut: 'EN_MER' };
}

const ETAPES: { statut: StatutTraversee; libelle: Cles }[] = [
  { statut: 'A_QUAI', libelle: 'statutAQuai' },
  { statut: 'EN_MER', libelle: 'statutEnMer' },
  { statut: 'ARRIVEE', libelle: 'statutArrivee' },
];

export default function SuiviChaloupeEcran() {
  const { t } = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const maintenant = useMaintenant(1_000);

  const suivi = useQuery({ queryKey: ['suivi', id], queryFn: () => suivreRotation(id),
    refetchInterval: 15_000, refetchIntervalInBackground: false });
  const s = suivi.data;
  const jour = s ? dateDakar(s.heure_prevue) : undefined;
  const autres = useQuery({ queryKey: ['rotations', jour], queryFn: () => listerRotations(jour),
    enabled: !!jour });

  if (!s) {
    return (
      <Ecran fond={couleurs.ocean}>
        <EnTete titre={t('suiviTitre')} clair />
        {suivi.isError ? <Bandeau ton="erreur" texte={t('suiviIndispo')} />
          : <Texte style={{ color: couleurs.oceanClair }}>…</Texte>}
      </Ecran>
    );
  }

  const { p, statut } = etatAffiche(s, maintenant);
  const minutesAvant = Math.max(0, Math.ceil((Date.parse(s.heure_depart_reelle) - maintenant) / 60_000));
  const minutesRestantes = s.source === 'GPS' ? s.minutes_restantes
    : Math.max(0, Math.ceil((Date.parse(s.heure_arrivee_estimee) - maintenant) / 60_000));
  const phrase = statut === 'A_QUAI' ? t('departDansN', { n: minutesAvant })
    : statut === 'EN_MER' ? t('arriveeDansN', { n: minutesRestantes })
      : t('arriveeA', { port: s.arrivee });
  const indexEtape = ETAPES.findIndex((e) => e.statut === statut);
  const memeSens = (autres.data ?? []).filter((r) => r.depart === s.depart);

  return (
    <Ecran fond={couleurs.ocean}>
      <EnTete surtitre={t('suiviTitre').toUpperCase()} titre={`${s.depart} → ${s.arrivee}`} couleur={couleurs.ocre} clair />

      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        <Etiquette texte={`${s.source === 'GPS' ? '● ' : '◌ '}${s.source === 'GPS' ? t('gpsDirect') : t('positionEstimee')}`}
          fond={s.source === 'GPS' ? couleurs.vert : couleurs.oceanClair}
          couleur={s.source === 'GPS' ? couleurs.blanc : couleurs.oceanFonce} />
        <Etiquette texte={s.retard_minutes ? `${t('retard')} +${s.retard_minutes} min` : t('aLHeure')}
          fond={s.retard_minutes ? couleurs.ocre : couleurs.vertClair}
          couleur={s.retard_minutes ? couleurs.encre : couleurs.vert} />
        <Etiquette texte={s.nom} fond={couleurs.oceanFonce} couleur={couleurs.blanc} />
      </View>

      <CarteBaie depart={s.depart} progression={p} statut={statut} gps={s.source === 'GPS'} />

      {/* Statut principal + étapes */}
      <View style={{ backgroundColor: couleurs.sable, borderRadius: 24, padding: 18, gap: 16 }}>
        <Titre taille={24}>{phrase}</Titre>

        <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(p * 100) }}
          style={{ gap: 8 }}>
          <View style={{ height: 10, borderRadius: 5, backgroundColor: couleurs.sableFonce, overflow: 'hidden' }}>
            <View style={{ width: `${Math.round(p * 100)}%`, height: '100%', borderRadius: 5,
              backgroundColor: statut === 'ARRIVEE' ? couleurs.vert : couleurs.ocean }} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {ETAPES.map((e, i) => (
              <View key={e.statut} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 12, height: 12, borderRadius: 6,
                  backgroundColor: i <= indexEtape ? couleurs.ocean : couleurs.bordureForte,
                  borderWidth: i === indexEtape ? 3 : 0, borderColor: couleurs.oceanClair }} />
                <Text style={{ fontFamily: i === indexEtape ? polices.texteGras : polices.texteMoyen, fontSize: 13,
                  color: i <= indexEtape ? couleurs.encre : couleurs.gris }}>{t(e.libelle)}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
          <Heure libelle={t('departPrevu')} valeur={heureDakar(s.heure_prevue)} barre={s.retard_minutes > 0} />
          {s.retard_minutes ? <Heure libelle={t('recapDepart')} valeur={heureDakar(s.heure_depart_reelle)} accent /> : null}
          <Heure libelle={t('arriveeEstimee')} valeur={heureDakar(s.heure_arrivee_estimee)} accent />
        </View>
      </View>

      {/* Autres départs du même sens : on passe de l'un à l'autre */}
      {memeSens.length > 1 ? (
        <View style={{ gap: 8 }}>
          <Texte gras style={{ color: couleurs.blanc }}>{t('autresDeparts')}</Texte>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {memeSens.map((r) => {
              const actif = r.id === s.id;
              const etat = etatTraversee(r, maintenant);
              return (
                <Pressable key={r.id} accessibilityRole="button" accessibilityState={{ selected: actif }}
                  onPress={() => router.setParams({ id: r.id })}
                  style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: rayon.m, minWidth: 74,
                    alignItems: 'center', backgroundColor: actif ? couleurs.ocre : couleurs.oceanFonce,
                    opacity: etat === 'ARRIVEE' && !actif ? 0.55 : 1 }}>
                  <Text style={{ fontFamily: polices.titre, fontSize: 16,
                    color: actif ? couleurs.encre : couleurs.blanc }}>{heureDakar(r.heure_depart_reelle)}</Text>
                  <Text style={{ fontFamily: polices.texteMoyen, fontSize: 11,
                    color: actif ? couleurs.encre : couleurs.oceanClair }}>
                    {etat === 'EN_MER' ? t('statutEnMer') : etat === 'ARRIVEE' ? t('statutArrivee')
                      : r.retard_minutes ? `+${r.retard_minutes} min` : t('aLHeure')}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      <Texte style={{ color: couleurs.oceanClair, fontSize: 12, textAlign: 'center', marginTop: espace.s }}>
        {suivi.isError ? t('suiviIndispo') : t('majAuto')}
      </Texte>
    </Ecran>
  );
}

function Heure({ libelle, valeur, barre = false, accent = false }: {
  libelle: string; valeur: string; barre?: boolean; accent?: boolean;
}) {
  return (
    <View style={{ gap: 2, flex: 1 }}>
      <Texte style={{ fontSize: 11, color: couleurs.gris }} gras>{libelle.toUpperCase()}</Texte>
      <Text style={{ fontFamily: polices.titre, fontSize: 20, color: accent ? couleurs.ocean : couleurs.encre,
        textDecorationLine: barre ? 'line-through' : 'none', opacity: barre ? 0.55 : 1 }}>{valeur}</Text>
    </View>
  );
}

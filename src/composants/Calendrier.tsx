/**
 * Sélecteur de date de visite.
 *
 * Remplace les anciens boutons « Aujourd'hui / Demain / Après-demain » :
 *   - un CHAMP compact affiche la date choisie (« Sam. 22 novembre ») ;
 *   - un appui ouvre un PANNEAU depuis le bas avec un calendrier mensuel.
 *
 * Règles :
 *   - les jours passés et ceux au-delà de `joursMax` sont grisés, non cliquables ;
 *   - la semaine commence le lundi, libellés en français ;
 *   - `joursMarques` (ex. jours avec départs de chaloupe publiés) reçoivent un point.
 *
 * Les dates circulent au format AAAA-MM-JJ, en UTC (Dakar = UTC+0 toute
 * l'année), exactement comme `aujourdHui()` dans api/client.ts.
 */
import { useMemo, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';

import { useT, type Cles } from '@/i18n';
import { couleurs, polices, rayon, TAILLE_TACTILE } from '@/theme';

type Traduire = (c: Cles, v?: Record<string, string | number>) => string;
/** Noms des mois / jours de la langue active (listes séparées par des virgules). */
const liste = (t: Traduire, c: Cles) => t(c).split(',');

// --- Utilitaires de dates (tout en UTC pour éviter les décalages de fuseau) -------

/** Date (UTC minuit) → « AAAA-MM-JJ ». */
const versIso = (d: Date) => d.toISOString().slice(0, 10);
/** « AAAA-MM-JJ » → Date à minuit UTC. */
const depuisIso = (iso: string) => new Date(`${iso}T00:00:00Z`);
/** Aujourd'hui + n jours, au format AAAA-MM-JJ. */
const dansNJours = (n: number) => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + n);
  return versIso(d);
};

/** « 2026-11-22 » → « Sam. 22 novembre » (+ l'année si ce n'est pas l'année en cours). */
export function libelleDate(iso: string, t: Traduire): string {
  const d = depuisIso(iso);
  const annee = d.getUTCFullYear() !== new Date().getUTCFullYear() ? ` ${d.getUTCFullYear()}` : '';
  return `${liste(t, 'joursLongs')[d.getUTCDay()]} ${d.getUTCDate()} ${liste(t, 'nomsMois')[d.getUTCMonth()]}${annee}`;
}

/** Repère relatif affiché sous la date : « Aujourd'hui », « Demain » ou « Dans 12 jours ». */
function repereRelatif(iso: string, t: Traduire): string {
  const ecart = Math.round((depuisIso(iso).getTime() - depuisIso(dansNJours(0)).getTime()) / 86_400_000);
  if (ecart === 0) return t('aujourdhui');
  if (ecart === 1) return t('demain');
  return t('dansNJours', { n: ecart });
}

/** Cases d'un mois : `null` pour les cases vides avant le 1er (semaine commençant le lundi). */
function casesDuMois(annee: number, mois: number): (string | null)[] {
  const premier = new Date(Date.UTC(annee, mois, 1));
  const decalage = (premier.getUTCDay() + 6) % 7;              // lundi = 0 … dimanche = 6
  const nbJours = new Date(Date.UTC(annee, mois + 1, 0)).getUTCDate();
  const cases: (string | null)[] = Array(decalage).fill(null);
  for (let j = 1; j <= nbJours; j++) cases.push(versIso(new Date(Date.UTC(annee, mois, j))));
  while (cases.length % 7) cases.push(null);                   // complète la dernière semaine
  return cases;
}

// --- Icônes ----------------------------------------------------------------------

function IconeCalendrier({ couleur }: { couleur: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={5} width={18} height={16} rx={3} stroke={couleur} strokeWidth={2} />
      <Path d="M3 10h18M8 3v4M16 3v4" stroke={couleur} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function Chevron({ sens, couleur }: { sens: 'gauche' | 'droite'; couleur: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d={sens === 'gauche' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} stroke={couleur}
        strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// --- Composant -------------------------------------------------------------------

export function Calendrier({ valeur, onChange, couleur = couleurs.ocean, joursMax = 180,
  joursMarques, legendeMarque, libelle }: {
  /** Date choisie, AAAA-MM-JJ. */
  valeur: string;
  onChange: (iso: string) => void;
  /** Couleur du parcours : bleu océan (chaloupe) ou terracotta (île). */
  couleur?: string;
  /** Réservation possible jusqu'à J + joursMax (180 = 6 mois). */
  joursMax?: number;
  /** Jours qui reçoivent un point (ex. départs publiés). */
  joursMarques?: Set<string>;
  /** Texte de légende du point, affiché sous le calendrier. */
  legendeMarque?: string;
  libelle: string;
}) {
  const { t } = useT();
  const [ouvert, setOuvert] = useState(false);
  const min = dansNJours(0);
  const max = dansNJours(joursMax);

  // Mois affiché dans le panneau : on part du mois de la date choisie.
  const [vue, setVue] = useState(() => {
    const d = depuisIso(valeur);
    return { annee: d.getUTCFullYear(), mois: d.getUTCMonth() };
  });
  const cases = useMemo(() => casesDuMois(vue.annee, vue.mois), [vue]);

  const debutVue = versIso(new Date(Date.UTC(vue.annee, vue.mois, 1)));
  const finVue = versIso(new Date(Date.UTC(vue.annee, vue.mois + 1, 0)));
  const peutReculer = debutVue > min;
  const peutAvancer = finVue < max;

  const changerMois = (pas: number) => setVue(({ annee, mois }) => {
    const d = new Date(Date.UTC(annee, mois + pas, 1));
    return { annee: d.getUTCFullYear(), mois: d.getUTCMonth() };
  });

  const ouvrir = () => {
    const d = depuisIso(valeur);
    setVue({ annee: d.getUTCFullYear(), mois: d.getUTCMonth() });
    setOuvert(true);
  };

  const choisir = (iso: string) => {
    onChange(iso);
    setOuvert(false);
  };

  return (
    <>
      {/* Champ compact */}
      <View style={{ gap: 6 }}>
        <Text style={{ fontFamily: polices.texteGras, fontSize: 13, color: couleurs.encreDouce }}>
          {libelle}
        </Text>
        <Pressable onPress={ouvrir} accessibilityRole="button"
          accessibilityLabel={`${libelle} : ${libelleDate(valeur, t)}. ${t('changer')}`}
          style={({ pressed }) => ({
            minHeight: TAILLE_TACTILE + 8, borderRadius: rayon.m, borderWidth: 1.5,
            borderColor: pressed ? couleur : couleurs.bordure, backgroundColor: couleurs.blanc,
            paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12,
          })}>
          <IconeCalendrier couleur={couleur} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: polices.texteGras, fontSize: 16, color: couleurs.encre }}>
              {libelleDate(valeur, t)}
            </Text>
            <Text style={{ fontFamily: polices.texte, fontSize: 12, color: couleurs.gris }}>
              {repereRelatif(valeur, t)}
            </Text>
          </View>
          <Text style={{ fontFamily: polices.texteGras, fontSize: 13, color: couleur }}>{t('changer')}</Text>
        </Pressable>
      </View>

      {/* Panneau calendrier */}
      <Modal visible={ouvert} transparent animationType="slide" onRequestClose={() => setOuvert(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(26,20,16,0.45)' }}
          onPress={() => setOuvert(false)} accessibilityLabel={t('fermer')} />
        <SafeAreaView edges={['bottom']} style={{ backgroundColor: couleurs.sable,
          borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 18, paddingTop: 10 }}>
          <View style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3,
            backgroundColor: couleurs.bordureForte, marginBottom: 12 }} />

          {/* Navigation entre les mois */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Pressable onPress={() => changerMois(-1)} disabled={!peutReculer} hitSlop={8}
              accessibilityLabel={t('moisPrecedent')}
              style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center',
                opacity: peutReculer ? 1 : 0.25 }}>
              <Chevron sens="gauche" couleur={couleurs.encre} />
            </Pressable>
            <Text style={{ flex: 1, textAlign: 'center', fontFamily: polices.titre, fontSize: 20,
              color: couleurs.encre, textTransform: 'capitalize' }}>
              {liste(t, 'nomsMois')[vue.mois]} {vue.annee}
            </Text>
            <Pressable onPress={() => changerMois(1)} disabled={!peutAvancer} hitSlop={8}
              accessibilityLabel={t('moisSuivant')}
              style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center',
                opacity: peutAvancer ? 1 : 0.25 }}>
              <Chevron sens="droite" couleur={couleurs.encre} />
            </Pressable>
          </View>

          {/* En-tête des jours */}
          <View style={{ flexDirection: 'row', marginBottom: 4 }}>
            {liste(t, 'joursCourts').map((j, i) => (
              <Text key={i} style={{ flex: 1, textAlign: 'center', fontFamily: polices.texteGras,
                fontSize: 12, color: couleurs.gris }}>{j}</Text>
            ))}
          </View>

          {/* Grille du mois */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {cases.map((iso, i) => {
              if (!iso) return <View key={`vide-${i}`} style={{ width: `${100 / 7}%`, height: 48 }} />;
              const desactive = iso < min || iso > max;
              const choisi = iso === valeur;
              const estAujourdhui = iso === min;
              const marque = joursMarques?.has(iso);
              return (
                <Pressable key={iso} disabled={desactive} onPress={() => choisir(iso)}
                  accessibilityRole="button" accessibilityState={{ selected: choisi, disabled: desactive }}
                  accessibilityLabel={libelleDate(iso, t)}
                  style={{ width: `${100 / 7}%`, height: 48, alignItems: 'center', justifyContent: 'center' }}>
                  <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center',
                    justifyContent: 'center', backgroundColor: choisi ? couleur : 'transparent',
                    borderWidth: estAujourdhui && !choisi ? 1.5 : 0, borderColor: couleur }}>
                    <Text style={{ fontFamily: choisi || estAujourdhui ? polices.texteGras : polices.texteMoyen,
                      fontSize: 15, color: choisi ? couleurs.blanc
                        : desactive ? couleurs.bordureForte : couleurs.encre,
                      textDecorationLine: desactive && iso < min ? 'line-through' : 'none' }}>
                      {Number(iso.slice(8))}
                    </Text>
                    {marque && !desactive ? (
                      <View style={{ position: 'absolute', bottom: 4, width: 5, height: 5, borderRadius: 3,
                        backgroundColor: choisi ? couleurs.blanc : couleur }} />
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>

          {legendeMarque && joursMarques && joursMarques.size > 0 ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: couleur }} />
              <Text style={{ fontFamily: polices.texte, fontSize: 12, color: couleurs.gris }}>
                {legendeMarque}
              </Text>
            </View>
          ) : null}

          {/* Raccourci vers aujourd'hui, utile quand on a navigué loin */}
          <Pressable onPress={() => choisir(min)}
            style={{ marginTop: 12, marginBottom: 8, minHeight: TAILLE_TACTILE, borderRadius: rayon.m,
              alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: couleur }}>
            <Text style={{ fontFamily: polices.texteGras, fontSize: 15, color: couleur }}>
              {t('aujourdhui')}
            </Text>
          </Pressable>
        </SafeAreaView>
      </Modal>
    </>
  );
}

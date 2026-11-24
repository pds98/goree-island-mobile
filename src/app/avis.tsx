/**
 * AVIS & SUGGESTIONS — le visiteur note son expérience et propose ses idées.
 *
 *   - Type : Avis · Suggestion · Problème ;
 *   - note globale 1 → 5 étoiles (animées) + mot qui l'explique ;
 *   - pastilles rapides adaptées à la note (positives / à améliorer) ;
 *   - notes par thème facultatives (achat, chaloupe, visite, appli, assistant) ;
 *   - commentaire, prénom facultatif, billet lié, demande de réponse AVEC consentement ;
 *   - sans réseau : l'avis est gardé et envoyé plus tard (file d'attente) ;
 *   - « Ce que disent les visiteurs » : moyenne, répartition, avis publiés
 *     (relus par un admin avant publication, jamais de coordonnées).
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Animated, Pressable, Switch, Text, TextInput, View } from 'react-native';

import { ErreurApiClient, envoyerRetour, resumeRetours } from '@/api/client';
import type { NouveauRetour, ResumeRetours, ThemeRetour, TypeRetour } from '@/api/types';
import { Bandeau, Bouton, Ecran, EnTete, Segment, Texte, Titre } from '@/composants/ui';
import { useT, type Cles } from '@/i18n';
import { lireBillets, type BilletStocke } from '@/stockage/billets';
import { envoyerEnAttente, mettreEnAttente } from '@/stockage/retours';
import { couleurs, polices, rayon } from '@/theme';

const MOTS_NOTE: Cles[] = ['note1', 'note2', 'note3', 'note4', 'note5'];
const THEMES: { id: ThemeRetour; libelle: Cles }[] = [
  { id: 'achat', libelle: 'themeAchat' }, { id: 'chaloupe', libelle: 'themeChaloupe' },
  { id: 'visite', libelle: 'themeVisite' }, { id: 'application', libelle: 'themeApplication' },
  { id: 'assistant', libelle: 'themeAssistant' },
];
// Pastilles : identifiant stable envoyé au serveur + libellé traduit.
const POSITIVES: [string, Cles][] = [['rapide', 'tagRapide'], ['accueil', 'tagAccueil'], ['guide', 'tagGuide'],
  ['ponctuel', 'tagPonctuel'], ['propre', 'tagPropre'], ['appli', 'tagAppli']];
const A_AMELIORER: [string, Cles][] = [['retard', 'tagRetard'], ['attente', 'tagAttente'], ['prix', 'tagPrix'],
  ['proprete', 'tagProprete'], ['info', 'tagInfo'], ['bug', 'tagBug']];
const PLACEHOLDER: Record<TypeRetour, Cles> = {
  AVIS: 'placeholderAvis', SUGGESTION: 'placeholderSuggestion', PROBLEME: 'placeholderProbleme',
};

export default function Avis() {
  const { t, langue } = useT();
  const client = useQueryClient();
  const resume = useQuery({ queryKey: ['retours-resume'], queryFn: resumeRetours });

  const [type, setType] = useState<TypeRetour>('AVIS');
  const [note, setNote] = useState(0);
  const [etiquettes, setEtiquettes] = useState<string[]>([]);
  const [themesOuverts, setThemesOuverts] = useState(false);
  const [notesThemes, setNotesThemes] = useState<Partial<Record<ThemeRetour, number>>>({});
  const [commentaire, setCommentaire] = useState('');
  const [prenom, setPrenom] = useState('');
  const [billets, setBillets] = useState<BilletStocke[]>([]);
  const [billet, setBillet] = useState<string | undefined>();
  const [veutReponse, setVeutReponse] = useState(false);
  const [contact, setContact] = useState('');
  const [consentement, setConsentement] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [resultat, setResultat] = useState<'envoye' | 'attente' | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  // Billets récents (pour relier l'avis) + envoi des avis restés en attente.
  useEffect(() => {
    void lireBillets().then((l) => setBillets([...l].sort((a, b) => b.enregistreLe.localeCompare(a.enregistreLe)).slice(0, 4)));
    void envoyerEnAttente().then((n) => { if (n) void client.invalidateQueries({ queryKey: ['retours-resume'] }); });
  }, [client]);

  const pastilles = note === 0 ? [] : note >= 4 ? POSITIVES : note <= 2 ? A_AMELIORER
    : [...POSITIVES.slice(0, 3), ...A_AMELIORER.slice(0, 3)];
  const contactValide = !veutReponse || (contact.trim().length >= 6 && consentement);
  const pret = note > 0 && contactValide && !envoi;

  function basculer(id: string) {
    setEtiquettes((e) => (e.includes(id) ? e.filter((x) => x !== id) : [...e, id]));
  }

  async function envoyer() {
    const retour: NouveauRetour = {
      note, type, notes_themes: notesThemes, etiquettes, commentaire: commentaire.trim(), langue,
      prenom: prenom.trim() || undefined, billet_numero: billet,
      contact: veutReponse ? contact.trim() : undefined, consentement_contact: veutReponse && consentement,
    };
    setEnvoi(true);
    setErreur(null);
    try {
      await envoyerRetour(retour);
      setResultat('envoye');
      void client.invalidateQueries({ queryKey: ['retours-resume'] });
    } catch (e) {
      if (e instanceof ErreurApiClient && e.statut === 0) {
        await mettreEnAttente(retour);               // hors ligne : envoi plus tard
        setResultat('attente');
      } else {
        setErreur(e instanceof Error ? e.message : String(e));
      }
    } finally {
      setEnvoi(false);
    }
  }

  function recommencer() {
    setNote(0); setEtiquettes([]); setNotesThemes({}); setCommentaire(''); setBillet(undefined);
    setVeutReponse(false); setContact(''); setConsentement(false); setResultat(null); setType('AVIS');
  }

  return (
    <Ecran fond={couleurs.sable}>
      <EnTete surtitre={t('avisSurtitre')} titre={t('avisTitre')} couleur={couleurs.terracotta} />

      {resume.data ? <Resume r={resume.data} /> : null}

      {resultat ? (
        <Merci attente={resultat === 'attente'} onRecommencer={recommencer} />
      ) : (
        <View style={{ backgroundColor: couleurs.blanc, borderRadius: 24, padding: 18, gap: 18,
          borderWidth: 1, borderColor: couleurs.bordure }}>
          <Segment<TypeRetour> valeur={type} onChange={setType} options={[
            { valeur: 'AVIS', libelle: t('typeAvis') },
            { valeur: 'SUGGESTION', libelle: t('typeSuggestion') },
            { valeur: 'PROBLEME', libelle: t('typeProbleme') },
          ]} />

          {/* Note globale */}
          <View style={{ alignItems: 'center', gap: 6 }}>
            <Texte gras style={{ color: couleurs.encre }}>{t('noteGlobale')}</Texte>
            <Etoiles valeur={note} onChange={(n) => { setNote(n); setEtiquettes([]); }} taille={44} />
            <Text accessibilityLiveRegion="polite" style={{ fontFamily: polices.titre, fontSize: 18,
              color: note ? couleurs.terracotta : couleurs.gris }}>
              {note ? t(MOTS_NOTE[note - 1]) : t('touchEtoiles')}
            </Text>
          </View>

          {/* Pastilles rapides */}
          {pastilles.length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
              {pastilles.map(([id, cle]) => {
                const actif = etiquettes.includes(id);
                const negatif = A_AMELIORER.some(([x]) => x === id);
                const teinte = negatif ? couleurs.rouge : couleurs.vert;
                return (
                  <Pressable key={id} onPress={() => basculer(id)} accessibilityRole="checkbox"
                    accessibilityState={{ checked: actif }}
                    style={{ paddingHorizontal: 12, minHeight: 36, borderRadius: 18, justifyContent: 'center',
                      borderWidth: 1.5, borderColor: actif ? teinte : couleurs.bordureForte,
                      backgroundColor: actif ? teinte : couleurs.blanc }}>
                    <Text style={{ fontFamily: polices.texteMoyen, fontSize: 13,
                      color: actif ? couleurs.blanc : couleurs.encre }}>{t(cle)}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          {/* Notes par thème (facultatif) */}
          <Pressable onPress={() => setThemesOuverts((o) => !o)} accessibilityRole="button"
            accessibilityState={{ expanded: themesOuverts }}
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Texte gras style={{ color: couleurs.encre }}>{t('parTheme')}</Texte>
            <Text style={{ fontSize: 18, color: couleurs.gris }}>{themesOuverts ? '▴' : '▾'}</Text>
          </Pressable>
          {themesOuverts ? (
            <View style={{ gap: 10 }}>
              {THEMES.map((th) => (
                <View key={th.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Texte style={{ fontSize: 14, flex: 1 }}>{t(th.libelle)}</Texte>
                  <Etoiles valeur={notesThemes[th.id] ?? 0} taille={24}
                    onChange={(n) => setNotesThemes((x) => ({ ...x, [th.id]: n }))} />
                </View>
              ))}
            </View>
          ) : null}

          {/* Commentaire */}
          <View style={{ gap: 6 }}>
            <Texte gras style={{ color: couleurs.encre }}>{t('enQuelquesMots')}</Texte>
            <TextInput value={commentaire} onChangeText={setCommentaire} multiline maxLength={1000}
              placeholder={t(PLACEHOLDER[type])} placeholderTextColor={couleurs.gris}
              accessibilityLabel={t('enQuelquesMots')} textAlignVertical="top"
              style={{ minHeight: 110, borderRadius: rayon.m, borderWidth: 1, borderColor: couleurs.bordureForte,
                padding: 12, fontFamily: polices.texte, fontSize: 15, color: couleurs.encre,
                backgroundColor: couleurs.sable }} />
            <Texte style={{ fontSize: 11, color: couleurs.gris, textAlign: 'right' }}>{commentaire.length} / 1000</Texte>
          </View>

          <TextInput value={prenom} onChangeText={setPrenom} maxLength={40} placeholder={t('prenomFacultatif')}
            placeholderTextColor={couleurs.gris} accessibilityLabel={t('prenomFacultatif')} autoComplete="given-name"
            style={champ} />

          {/* Billet lié (facultatif) */}
          {billets.length ? (
            <View style={{ gap: 8 }}>
              <Texte gras style={{ color: couleurs.encre }}>{t('relierBillet')}</Texte>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {billets.map((b) => {
                  const actif = billet === b.billet.numero;
                  return (
                    <Pressable key={b.billet.numero} accessibilityRole="radio" accessibilityState={{ selected: actif }}
                      onPress={() => setBillet(actif ? undefined : b.billet.numero)}
                      style={{ paddingHorizontal: 12, minHeight: 36, borderRadius: 18, justifyContent: 'center',
                        borderWidth: 1.5, borderColor: actif ? couleurs.ocean : couleurs.bordureForte,
                        backgroundColor: actif ? couleurs.oceanClair : couleurs.blanc }}>
                      <Text style={{ fontFamily: polices.texteMoyen, fontSize: 12, color: couleurs.encre }}>
                        {b.nom ?? b.billet.numero}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          {/* Demande de réponse, avec consentement explicite */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Texte gras style={{ color: couleurs.encre }}>{t('veuxReponse')}</Texte>
            <Switch value={veutReponse} onValueChange={setVeutReponse} accessibilityLabel={t('veuxReponse')}
              trackColor={{ true: couleurs.terracotta, false: couleurs.bordureForte }} />
          </View>
          {veutReponse ? (
            <View style={{ gap: 10 }}>
              <TextInput value={contact} onChangeText={setContact} maxLength={120} placeholder={t('contactPlaceholder')}
                placeholderTextColor={couleurs.gris} accessibilityLabel={t('contactPlaceholder')}
                autoCapitalize="none" keyboardType="email-address" style={champ} />
              <Pressable onPress={() => setConsentement((c) => !c)} accessibilityRole="checkbox"
                accessibilityState={{ checked: consentement }} style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, marginTop: 2,
                  borderColor: consentement ? couleurs.terracotta : couleurs.bordureForte,
                  backgroundColor: consentement ? couleurs.terracotta : couleurs.blanc,
                  alignItems: 'center', justifyContent: 'center' }}>
                  {consentement ? <Text style={{ color: couleurs.blanc, fontSize: 13 }}>✓</Text> : null}
                </View>
                <Texte style={{ flex: 1, fontSize: 13 }}>{t('consentementContact')}</Texte>
              </Pressable>
            </View>
          ) : null}

          {erreur ? <Bandeau ton="erreur" texte={erreur} /> : null}
          <Bouton titre={t('envoyerAvis')} onPress={envoyer} chargement={envoi} desactive={!pret} />
          <Texte style={{ fontSize: 12, color: couleurs.gris, textAlign: 'center' }}>{t('avisModere')}</Texte>
        </View>
      )}

      {/* Derniers avis publiés */}
      <View style={{ gap: 10 }}>
        <Titre taille={20}>{t('ceQueDisentVisiteurs')}</Titre>
        {resume.data?.derniers.length ? resume.data.derniers.map((a) => (
          <View key={a.id} style={{ backgroundColor: couleurs.blanc, borderRadius: 18, padding: 14, gap: 6,
            borderWidth: 1, borderColor: couleurs.bordure }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Texte gras style={{ color: couleurs.encre }}>{a.prenom ?? t('visiteurAnonyme')}</Texte>
              <Etoiles valeur={a.note} taille={14} />
            </View>
            <Texte style={{ fontSize: 14 }}>{a.commentaire}</Texte>
            <Texte style={{ fontSize: 11, color: couleurs.gris }}>
              {new Date(a.cree_le).toLocaleDateString(langue === 'wo' ? 'fr' : langue, { day: 'numeric', month: 'long' })}
            </Texte>
          </View>
        )) : <Texte style={{ color: couleurs.gris }}>{t('aucunAvisPublie')}</Texte>}
      </View>
    </Ecran>
  );
}

const champ = { minHeight: 48, borderRadius: rayon.m, borderWidth: 1, borderColor: couleurs.bordureForte,
  paddingHorizontal: 12, fontFamily: polices.texteMoyen, fontSize: 15, color: couleurs.encre,
  backgroundColor: couleurs.sable };

// --- Étoiles -------------------------------------------------------------------------

/** Rangée de 5 étoiles ; interactive si `onChange` est fourni (petit rebond au toucher). */
function Etoiles({ valeur, onChange, taille }: { valeur: number; onChange?: (n: number) => void; taille: number }) {
  const { t } = useT();
  return (
    <View accessibilityRole={onChange ? 'adjustable' : 'text'}
      accessibilityLabel={`${valeur} / 5${valeur ? ` · ${t(MOTS_NOTE[valeur - 1])}` : ''}`}
      style={{ flexDirection: 'row', gap: taille > 30 ? 6 : 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Etoile key={n} pleine={n <= valeur} taille={taille} onPress={onChange ? () => onChange(n) : undefined} />
      ))}
    </View>
  );
}

function Etoile({ pleine, taille, onPress }: { pleine: boolean; taille: number; onPress?: () => void }) {
  const [echelle] = useState(() => new Animated.Value(1));
  const contenu = (
    <Animated.Text style={{ fontSize: taille, lineHeight: taille * 1.15, transform: [{ scale: echelle }],
      color: pleine ? couleurs.ocre : couleurs.bordureForte }}>★</Animated.Text>
  );
  if (!onPress) return contenu;
  return (
    <Pressable hitSlop={4} onPress={() => {
      onPress();
      echelle.setValue(1.35);
      Animated.spring(echelle, { toValue: 1, friction: 3, useNativeDriver: true }).start();
    }}>{contenu}</Pressable>
  );
}

// --- Résumé et remerciement ---------------------------------------------------------------

function Resume({ r }: { r: ResumeRetours }) {
  const { t } = useT();
  if (!r.total || r.moyenne === null) return null;
  const max = Math.max(...Object.values(r.repartition), 1);
  return (
    <View style={{ backgroundColor: couleurs.terracotta, borderRadius: 24, padding: 18, flexDirection: 'row', gap: 18 }}>
      <View style={{ alignItems: 'center', justifyContent: 'center', gap: 4 }}>
        <Text style={{ fontFamily: polices.titre, fontSize: 44, color: couleurs.blanc }}>
          {r.moyenne.toFixed(1).replace('.', ',')}</Text>
        <Etoiles valeur={Math.round(r.moyenne)} taille={16} />
        <Text style={{ fontFamily: polices.texteMoyen, fontSize: 12, color: couleurs.terracottaClair }}>
          {t('surNAvis', { n: r.total })}</Text>
      </View>
      <View style={{ flex: 1, gap: 5, justifyContent: 'center' }}>
        {(['5', '4', '3', '2', '1'] as const).map((n) => (
          <View key={n} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ width: 12, fontFamily: polices.texteGras, fontSize: 12, color: couleurs.blanc }}>{n}</Text>
            <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.25)' }}>
              <View style={{ width: `${(r.repartition[n] / max) * 100}%`, height: '100%', borderRadius: 4,
                backgroundColor: couleurs.ocre }} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function Merci({ attente, onRecommencer }: { attente: boolean; onRecommencer: () => void }) {
  const { t } = useT();
  const [apparition] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.spring(apparition, { toValue: 1, friction: 5, useNativeDriver: true }).start();
  }, [apparition]);
  return (
    <View style={{ backgroundColor: couleurs.blanc, borderRadius: 24, padding: 24, gap: 14, alignItems: 'center',
      borderWidth: 1, borderColor: couleurs.bordure }}>
      <Animated.View style={{ width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center',
        backgroundColor: attente ? couleurs.ocre : couleurs.vert, transform: [{ scale: apparition }] }}>
        <Text style={{ fontSize: 40, color: couleurs.blanc }}>{attente ? '⏳' : '✓'}</Text>
      </Animated.View>
      <Titre taille={26}>{t('merciAvis')}</Titre>
      <Texte style={{ textAlign: 'center' }}>{attente ? t('avisEnAttente') : t('merciAvisTexte')}</Texte>
      <Bouton titre={t('nouvelAvis')} variante="contour" onPress={onRecommencer} style={{ alignSelf: 'stretch' }} />
    </View>
  );
}


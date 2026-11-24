/**
 * CANDIDATURE PARTENAIRE — guide, restaurant ou hôtel.
 *
 * Assistant en 4 étapes courtes (barre de progression en haut) :
 *   1. Activité   : guide · restaurant · hôtel
 *   2. Infos      : nom, responsable, téléphone, e-mail, description, langues, tarif
 *   3. Documents  : carte de guide, registre de commerce, photos… (photo ou PDF, 5 Mo, 8 max)
 *   4. Vérifier   : récapitulatif puis envoi
 *
 * Déjà déposée : écran de SUIVI (frise Reçue → En examen → Décision). Si
 * l'équipe demande un complément ou refuse, le motif s'affiche et le
 * partenaire peut corriger puis renvoyer (formulaire pré-rempli).
 */
import * as DocumentPicker from 'expo-document-picker';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { IconeGuide, IconeHotel, IconeResto } from '@/composants/icones';
import { Bandeau, Bouton, Champ, Ecran, EnTete, Texte, Titre } from '@/composants/ui';
import * as api from '@/compte/api';
import { useCompte } from '@/compte/ContexteCompte';
import { useT, type Cles } from '@/i18n';
import { couleurs, polices, rayon } from '@/theme';

const TYPES: { id: api.TypePartenaireCandidature; libelle: Cles; sous: Cles; Icone: typeof IconeGuide;
  docs: Cles }[] = [
  { id: 'GUIDE', libelle: 'typePartenaireGUIDE', sous: 'typeGuideSous', Icone: IconeGuide, docs: 'docsGuide' },
  { id: 'RESTAURANT', libelle: 'typePartenaireRESTAURANT', sous: 'typeRestoSous', Icone: IconeResto, docs: 'docsResto' },
  { id: 'HOTEL', libelle: 'typePartenaireHOTEL', sous: 'typeHotelSous', Icone: IconeHotel, docs: 'docsHotel' },
];
const ETAPES: Cles[] = ['etapeActivite', 'etapeInfos', 'etapeDocuments', 'etapeVerifier'];
const DOCUMENTS_MAX = 8;

export default function EcranCandidature() {
  const { compte, rafraichir } = useCompte();
  const [modification, setModification] = useState(false);
  if (!compte) return <Redirect href="/compte" />;

  const c = compte.candidature;
  const peutCorriger = c && (c.statut === 'COMPLEMENT' || c.statut === 'REFUSEE');
  if (c && !modification) {
    return <Suivi candidature={c} onCorriger={peutCorriger ? () => setModification(true) : undefined} />;
  }
  return <Assistant compte={compte} existante={c ?? undefined}
    onEnvoyee={async () => { await rafraichir(); setModification(false); }} />;
}

// =====================================================================================
// Assistant de dépôt
// =====================================================================================

function Assistant({ compte, existante, onEnvoyee }: {
  compte: api.Compte; existante?: api.Candidature; onEnvoyee: () => Promise<void>;
}) {
  const { t } = useT();
  const { jeton } = useCompte();
  const [etape, setEtape] = useState(existante ? 1 : 0);
  const [type, setType] = useState<api.TypePartenaireCandidature | null>(existante?.type ?? null);
  const [f, setF] = useState({
    nom_activite: existante?.nom_activite ?? '', responsable: existante?.responsable ?? compte.nom,
    telephone: existante?.telephone ?? compte.telephone ?? '', email: existante?.email ?? compte.email ?? '',
    description: existante?.description ?? '', langues: existante?.langues ?? '', tarif: existante?.tarif ?? '',
  });
  const [documents, setDocuments] = useState<api.DocumentCandidature[]>(existante?.documents ?? []);
  const [televersement, setTeleversement] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const maj = (cle: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [cle]: v }));
  const infosValides = f.nom_activite.trim().length >= 2 && f.telephone.replace(/\D/g, '').length >= 7;
  const typeChoisi = TYPES.find((x) => x.id === type);

  async function ajouterDocument() {
    if (!jeton) return;
    setErreur(null);
    const r = await DocumentPicker.getDocumentAsync({ type: ['image/*', 'application/pdf'], copyToCacheDirectory: true });
    if (r.canceled || !r.assets?.[0]) return;
    const a = r.assets[0];
    if (a.size && a.size > 5 * 1024 * 1024) { setErreur(t('fichierTropGros')); return; }
    setTeleversement(true);
    try {
      const doc = await api.envoyerDocument(jeton, { uri: a.uri, name: a.name, mimeType: a.mimeType, file: a.file });
      setDocuments((d) => [...d, doc].slice(0, DOCUMENTS_MAX));
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
    } finally {
      setTeleversement(false);
    }
  }

  async function envoyer() {
    if (!jeton || !type) return;
    setEnvoi(true);
    setErreur(null);
    try {
      await api.deposerCandidature(jeton, { type, ...Object.fromEntries(
        Object.entries(f).map(([k, v]) => [k, v.trim()])) as typeof f, details: {}, documents });
      await onEnvoyee();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
    } finally {
      setEnvoi(false);
    }
  }

  const suivantPossible = [type !== null, infosValides, !televersement, true][etape];

  return (
    <Ecran>
      <EnTete surtitre={t('devenirPartenaire')} titre={t(ETAPES[etape])} />

      {/* Progression */}
      <View accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: 4, now: etape + 1 }}
        style={{ flexDirection: 'row', gap: 6 }}>
        {ETAPES.map((e, i) => (
          <View key={e} style={{ flex: 1, height: 5, borderRadius: 3,
            backgroundColor: i <= etape ? couleurs.terracotta : couleurs.sableFonce }} />
        ))}
      </View>
      <Texte style={{ fontSize: 12, color: couleurs.gris }}>{t('etapeNSur4', { n: String(etape + 1) })}</Texte>

      {existante?.motif ? <Bandeau ton="alerte" texte={`${t('messageEquipe')} ${existante.motif}`} /> : null}

      {etape === 0 ? (
        <View style={{ gap: 12 }}>
          {TYPES.map(({ id, libelle, sous, Icone }) => {
            const actif = type === id;
            return (
              <Pressable key={id} accessibilityRole="radio" accessibilityState={{ selected: actif }}
                onPress={() => setType(id)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 20,
                  borderWidth: 2, borderColor: actif ? couleurs.terracotta : couleurs.bordure,
                  backgroundColor: actif ? couleurs.terracottaClair : couleurs.blanc }}>
                <View style={{ width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: actif ? couleurs.terracotta : couleurs.sable }}>
                  <Icone couleur={actif ? couleurs.blanc : couleurs.terracotta} taille={26} />
                </View>
                <View style={{ flex: 1 }}>
                  <Titre taille={18}>{t(libelle)}</Titre>
                  <Texte style={{ fontSize: 13 }}>{t(sous)}</Texte>
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {etape === 1 ? (
        <View style={{ gap: 12 }}>
          <Champ libelle={type === 'GUIDE' ? t('nomPublicGuide') : t('nomEtablissement')} value={f.nom_activite}
            onChangeText={maj('nom_activite')} maxLength={120} />
          <Champ libelle={t('nomResponsable')} value={f.responsable} onChangeText={maj('responsable')}
            maxLength={80} autoComplete="name" />
          <Champ libelle={t('telephoneWhatsapp')} value={f.telephone} onChangeText={maj('telephone')}
            keyboardType="phone-pad" autoComplete="tel" maxLength={30} />
          <Champ libelle={t('emailPro')} value={f.email} onChangeText={maj('email')} keyboardType="email-address"
            autoCapitalize="none" maxLength={160} />
          <View style={{ gap: 4 }}>
            <Texte gras style={{ fontSize: 13 }}>{t('presentation')}</Texte>
            <TextInput value={f.description} onChangeText={maj('description')} multiline maxLength={2000}
              placeholder={t('presentationPlaceholder')} placeholderTextColor={couleurs.gris}
              accessibilityLabel={t('presentation')} textAlignVertical="top"
              style={{ minHeight: 100, borderRadius: rayon.m, borderWidth: 1, borderColor: couleurs.bordureForte,
                padding: 12, fontFamily: polices.texte, fontSize: 15, color: couleurs.encre,
                backgroundColor: couleurs.blanc }} />
          </View>
          <Champ libelle={t('languesParlees')} value={f.langues} onChangeText={maj('langues')} maxLength={60}
            placeholder="Français, English, Wolof" />
          <Champ libelle={type === 'HOTEL' ? t('tarifNuit') : type === 'RESTAURANT' ? t('tarifRepas') : t('tarifVisite')}
            value={f.tarif} onChangeText={maj('tarif')} maxLength={80} placeholder="15 000 FCFA" />
        </View>
      ) : null}

      {etape === 2 ? (
        <View style={{ gap: 12 }}>
          {typeChoisi ? <Bandeau texte={t(typeChoisi.docs)} /> : null}
          {documents.map((d) => (
            <View key={d.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12,
              borderRadius: rayon.m, backgroundColor: couleurs.blanc, borderWidth: 1, borderColor: couleurs.bordure }}>
              <Text style={{ fontFamily: polices.texteGras, fontSize: 11, color: couleurs.terracotta, width: 34 }}>
                {d.type.includes('pdf') ? 'PDF' : 'IMG'}</Text>
              <Texte style={{ flex: 1, fontSize: 14 }}>{d.nom}</Texte>
              <Pressable accessibilityRole="button" accessibilityLabel={`${t('retirer')} ${d.nom}`} hitSlop={10}
                onPress={() => setDocuments((x) => x.filter((y) => y.id !== d.id))}>
                <Text style={{ fontSize: 18, color: couleurs.gris }}>✕</Text>
              </Pressable>
            </View>
          ))}
          {documents.length < DOCUMENTS_MAX ? (
            <Bouton titre={documents.length ? t('ajouterAutreDocument') : t('ajouterDocument')} variante="contour"
              chargement={televersement} onPress={() => void ajouterDocument()} />
          ) : null}
          <Texte style={{ fontSize: 12, color: couleurs.gris }}>{t('documentsRegle')}</Texte>
        </View>
      ) : null}

      {etape === 3 ? (
        <View style={{ backgroundColor: couleurs.blanc, borderRadius: 20, padding: 16, gap: 10,
          borderWidth: 1, borderColor: couleurs.bordure }}>
          {[
            [t('etapeActivite'), typeChoisi ? t(typeChoisi.libelle) : ''],
            [t('nomEtablissement'), f.nom_activite], [t('nomResponsable'), f.responsable],
            [t('telephoneWhatsapp'), f.telephone], [t('emailPro'), f.email],
            [t('languesParlees'), f.langues], [t('tarif'), f.tarif],
            [t('etapeDocuments'), String(documents.length)],
          ].filter(([, v]) => v).map(([l, v]) => (
            <View key={l} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
              <Texte style={{ fontSize: 13, color: couleurs.gris }}>{l}</Texte>
              <Texte gras style={{ fontSize: 14, color: couleurs.encre, flexShrink: 1, textAlign: 'right' }}>{v}</Texte>
            </View>
          ))}
          <Texte style={{ fontSize: 12, color: couleurs.gris }}>{t('verificationEquipe')}</Texte>
        </View>
      ) : null}

      {erreur ? <Bandeau ton="erreur" texte={erreur} /> : null}

      <View style={{ flexDirection: 'row', gap: 10 }}>
        {etape > 0 ? <Bouton titre={t('retour')} variante="clair" style={{ flex: 1 }}
          onPress={() => setEtape(etape - 1)} /> : null}
        <Bouton titre={etape === 3 ? t('envoyerCandidature') : t('continuer')} style={{ flex: 2 }}
          desactive={!suivantPossible} chargement={envoi}
          onPress={() => (etape === 3 ? void envoyer() : setEtape(etape + 1))} />
      </View>
      {etape === 0 ? (
        <Pressable accessibilityRole="button" onPress={() => router.back()}
          style={{ alignSelf: 'center', minHeight: 44, justifyContent: 'center' }}>
          <Texte style={{ fontSize: 13, color: couleurs.gris }}>{t('plusTard')}</Texte>
        </Pressable>
      ) : null}
    </Ecran>
  );
}

// =====================================================================================
// Suivi d'une candidature déposée
// =====================================================================================

function Suivi({ candidature: c, onCorriger }: { candidature: api.Candidature; onCorriger?: () => void }) {
  const { t } = useT();
  const decide = c.statut !== 'EN_ATTENTE';
  const jalons: { libelle: string; fait: boolean; ton?: string }[] = [
    { libelle: t('jalonRecue'), fait: true },
    { libelle: t('jalonExamen'), fait: true },
    { libelle: c.statut === 'APPROUVEE' ? t('statutApprouvee') : c.statut === 'REFUSEE' ? t('statutRefusee')
      : c.statut === 'COMPLEMENT' ? t('statutComplement') : t('jalonDecision'), fait: decide,
      ton: c.statut === 'APPROUVEE' ? couleurs.vert : c.statut === 'EN_ATTENTE' ? undefined : couleurs.terracotta },
  ];
  const message: Cles = { EN_ATTENTE: 'suiviEnAttente', APPROUVEE: 'suiviApprouvee', COMPLEMENT: 'suiviComplement',
    REFUSEE: 'suiviRefusee' }[c.statut] as Cles;

  return (
    <Ecran>
      <EnTete surtitre={t('maCandidature')} titre={c.nom_activite} />

      <View style={{ backgroundColor: couleurs.blanc, borderRadius: 22, padding: 18, gap: 16,
        borderWidth: 1, borderColor: couleurs.bordure }}>
        {jalons.map((j, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
              backgroundColor: j.fait ? (j.ton ?? couleurs.ocean) : couleurs.sableFonce }}>
              <Text style={{ color: couleurs.blanc, fontFamily: polices.texteGras, fontSize: 13 }}>
                {j.fait ? '✓' : i + 1}</Text>
            </View>
            <Texte gras={j.fait} style={{ color: j.fait ? couleurs.encre : couleurs.gris }}>{j.libelle}</Texte>
          </View>
        ))}
      </View>

      <Texte>{t(message)}</Texte>
      {c.motif ? <Bandeau ton={c.statut === 'APPROUVEE' ? 'info' : 'alerte'} texte={`${t('messageEquipe')} ${c.motif}`} /> : null}

      {onCorriger ? <Bouton titre={c.statut === 'REFUSEE' ? t('deposerANouveau') : t('completerCandidature')}
        onPress={onCorriger} /> : null}
      <Bouton titre={t('retourAuCompte')} variante="clair" onPress={() => router.back()} />
    </Ecran>
  );
}

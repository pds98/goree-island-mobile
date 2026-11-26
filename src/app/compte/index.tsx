/**
 * COMPTE — facultatif, jamais imposé (on peut tout acheter en invité).
 *
 * Non connecté, un seul parcours en 2 temps, sans surcharge :
 *   1. « Qui es-tu ? »  → Je visite  |  Je suis partenaire (guide, resto, hôtel)
 *   2. Identification   → Continuer avec Apple (iOS)  ou  e-mail + mot de passe
 *      (bascule discrète « J'ai déjà un compte » pour se connecter).
 *   Un partenaire nouvellement inscrit est envoyé directement vers sa candidature.
 *
 * Connecté : « Mon compte » — profil, billets synchronisés, Face ID,
 * statut de candidature partenaire, déconnexion, suppression du compte.
 */
import * as AppleAuthentication from 'expo-apple-authentication';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, Switch, Text, View } from 'react-native';

import { ErreurApiClient } from '@/api/client';
import { FeuilleConfirmation } from '@/composants/FeuilleConfirmation';
import { IconeBillet, IconeGuide, IconeHotel, IconeLieu, IconeResto } from '@/composants/icones';
import { Bandeau, Bouton, Champ, Ecran, EnTete, Texte, Titre } from '@/composants/ui';
import * as api from '@/compte/api';
import { activerBiometrie, biometrieActivee, biometrieDisponible, confirmerIdentite } from '@/compte/biometrie';
import { useCompte } from '@/compte/ContexteCompte';
import { useT, type Cles } from '@/i18n';
import { couleurs, polices, rayon } from '@/theme';

export default function EcranCompte() {
  const { compte, pret } = useCompte();
  const [deconnecte, setDeconnecte] = useState(false);
  if (!pret) {
    return <Ecran defilable={false}><ActivityIndicator color={couleurs.terracotta} style={{ marginTop: 80 }} /></Ecran>;
  }
  return compte ? <MonCompte onDeconnecte={() => setDeconnecte(true)} />
    : <Bienvenue messageDepart={deconnecte ? 'deconnecteOk' : undefined} />;
}

// =====================================================================================
// Non connecté : choix du profil, puis identification
// =====================================================================================

function Bienvenue({ messageDepart }: { messageDepart?: Cles }) {
  const { t, langue } = useT();
  const { ouvrir } = useCompte();
  const [profil, setProfil] = useState<api.Profil | null>(null);
  const [mode, setMode] = useState<'inscription' | 'connexion'>('inscription');
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [appleDispo, setAppleDispo] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'ios') void AppleAuthentication.isAvailableAsync().then(setAppleDispo).catch(() => undefined);
  }, []);

  // Après connexion : un partenaire sans candidature va directement la déposer.
  async function terminer(session: api.Session) {
    await ouvrir(session);
    if (session.compte.profil === 'PARTENAIRE' && !session.compte.candidature) router.replace('/compte/candidature');
  }

  async function avecApple() {
    setErreur(null);
    try {
      const c = await AppleAuthentication.signInAsync({ requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL] });
      if (!c.identityToken) throw new Error(t('erreurApple'));
      const nomApple = [c.fullName?.givenName, c.fullName?.familyName].filter(Boolean).join(' ') || undefined;
      setEnvoi(true);
      await terminer(await api.connecterApple({ jeton_identite: c.identityToken, nom: nomApple,
        profil: profil ?? 'VISITEUR', langue }));
    } catch (e) {
      if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') return;   // fermé par le visiteur
      setErreur(e instanceof Error ? e.message : String(e));
    } finally {
      setEnvoi(false);
    }
  }

  async function avecEmail() {
    setErreur(null);
    setEnvoi(true);
    try {
      const session = mode === 'inscription'
        ? await api.inscrire({ email: email.trim(), mot_de_passe: motDePasse, nom: nom.trim(),
          profil: profil ?? 'VISITEUR', langue })
        : await api.connecter(email.trim(), motDePasse);
      await terminer(session);
    } catch (e) {
      setErreur(e instanceof ErreurApiClient || e instanceof Error ? e.message : String(e));
    } finally {
      setEnvoi(false);
    }
  }

  const emailValide = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
  const formulaireValide = emailValide && motDePasse.length >= 8 && (mode === 'connexion' || nom.trim().length >= 2);
  // Ce qui manque, dans l'ordre du formulaire (affiché sous les champs).
  const raisonInvalide: Cles = mode === 'inscription' && nom.trim().length < 2 ? 'manqueNom'
    : !emailValide ? 'manqueEmail' : 'manqueMotDePasse';

  // --- Étape 1 : qui es-tu ? (la connexion à un compte existant saute ce choix) ---
  if (!profil && mode === 'inscription') {
    return (
      <Ecran>
        <EnTete surtitre={t('compteSurtitre')} titre={t('quiEsTu')} />
        {messageDepart ? <Bandeau ton="info" texte={t(messageDepart)} /> : null}
        <Texte>{t('quiEsTuSous')}</Texte>

        <ChoixProfil couleur={couleurs.ocean} fondIcone={couleurs.ocre} titre={t('jeVisite')} sous={t('jeVisiteSous')}
          icone={<IconeLieu couleur={couleurs.encre} taille={26} />} onPress={() => setProfil('VISITEUR')} />
        <ChoixProfil couleur={couleurs.terracotta} fondIcone={couleurs.sable} titre={t('jeSuisPartenaire')}
          sous={t('jeSuisPartenaireSous')} onPress={() => setProfil('PARTENAIRE')}
          icone={<View style={{ flexDirection: 'row', gap: 1 }}>
            <IconeGuide couleur={couleurs.terracotta} taille={16} />
            <IconeResto couleur={couleurs.terracotta} taille={16} />
            <IconeHotel couleur={couleurs.terracotta} taille={16} />
          </View>} />

        <Pressable accessibilityRole="button" onPress={() => setMode('connexion')}
          style={{ alignSelf: 'center', minHeight: 44, justifyContent: 'center' }}>
          <Texte style={{ color: couleurs.encre }}>{t('dejaUnCompte')} <Text style={{ fontFamily: polices.texteGras,
            color: couleurs.terracotta }}>{t('seConnecter')}</Text></Texte>
        </Pressable>
        <Texte style={{ fontSize: 12, color: couleurs.gris, textAlign: 'center' }}>{t('compteFacultatif')}</Texte>
      </Ecran>
    );
  }

  // --- Étape 2 : identification ---
  const partenaire = profil === 'PARTENAIRE';
  return (
    <Ecran>
      <EnTete surtitre={mode === 'connexion' ? t('compteSurtitre') : (partenaire ? t('jeSuisPartenaire') : t('jeVisite')).toUpperCase()}
        titre={mode === 'connexion' ? t('bonRetour') : t('creeTonCompte')}
        couleur={partenaire ? couleurs.terracotta : couleurs.ocean} />

      {mode === 'inscription' ? (
        <Pressable accessibilityRole="button" onPress={() => setProfil(null)} style={{ alignSelf: 'flex-start' }}>
          <Texte style={{ fontSize: 13, color: couleurs.gris }}>{t('changerProfil')}</Texte>
        </Pressable>
      ) : null}

      {partenaire && mode === 'inscription' ? <Bandeau texte={t('partenaireEtapes')} /> : null}

      {appleDispo ? (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={mode === 'connexion' ? AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
            : AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={rayon.l} style={{ height: 54 }} onPress={() => void avecApple()} />
      ) : null}

      {appleDispo ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: couleurs.bordure }} />
          <Texte style={{ fontSize: 12, color: couleurs.gris }}>{t('ouParEmail')}</Texte>
          <View style={{ flex: 1, height: 1, backgroundColor: couleurs.bordure }} />
        </View>
      ) : null}

      <View style={{ gap: 12 }}>
        {mode === 'inscription' ? (
          <Champ libelle={partenaire ? t('nomResponsable') : t('tonPrenomNom')} value={nom} onChangeText={setNom}
            autoComplete="name" textContentType="name" maxLength={80} />
        ) : null}
        <Champ libelle={t('email')} value={email} onChangeText={setEmail} keyboardType="email-address"
          autoCapitalize="none" autoComplete="email" textContentType="emailAddress" maxLength={160} />
        <Champ libelle={t('motDePasse')} value={motDePasse} onChangeText={setMotDePasse} secureTextEntry
          autoComplete={mode === 'inscription' ? 'new-password' : 'current-password'}
          textContentType={mode === 'inscription' ? 'newPassword' : 'password'} maxLength={200}
          onSubmitEditing={() => { if (formulaireValide) void avecEmail(); }} />
        {mode === 'inscription' ? (
          <Texte style={{ fontSize: 12, color: motDePasse && motDePasse.length < 8 ? couleurs.terracottaFonce
            : couleurs.gris }}>{t('motDePasseRegle')}</Texte>
        ) : null}
      </View>

      {erreur ? <Bandeau ton="erreur" texte={erreur} /> : null}
      {!formulaireValide && (email || motDePasse) && !(mode === 'inscription' && raisonInvalide === 'manqueMotDePasse') ? (
        <Texte style={{ fontSize: 12, color: couleurs.terracottaFonce }}>{t(raisonInvalide)}</Texte>
      ) : null}

      <Bouton titre={mode === 'connexion' ? t('seConnecter') : t('creerMonCompte')}
        variante={partenaire ? 'terracotta' : 'ocean'} chargement={envoi} desactive={!formulaireValide}
        onPress={() => void avecEmail()} />

      <Pressable accessibilityRole="button" style={{ alignSelf: 'center', minHeight: 44, justifyContent: 'center' }}
        onPress={() => { setErreur(null); setMode(mode === 'connexion' ? 'inscription' : 'connexion'); }}>
        <Texte style={{ color: couleurs.encre }}>
          {mode === 'connexion' ? t('pasEncoreDeCompte') : t('dejaUnCompte')}{' '}
          <Text style={{ fontFamily: polices.texteGras, color: couleurs.terracotta }}>
            {mode === 'connexion' ? t('creerUnCompte') : t('seConnecter')}
          </Text>
        </Texte>
      </Pressable>
      <Texte style={{ fontSize: 12, color: couleurs.gris, textAlign: 'center' }}>{t('compteConfidentialite')}</Texte>
    </Ecran>
  );
}

function ChoixProfil({ titre, sous, icone, couleur, fondIcone, onPress }: {
  titre: string; sous: string; icone: React.ReactNode; couleur: string; fondIcone: string; onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress}
      style={({ pressed }) => ({ borderRadius: 22, padding: 18, flexDirection: 'row', gap: 14, alignItems: 'center',
        backgroundColor: couleur, transform: [{ scale: pressed ? 0.98 : 1 }] })}>
      <View style={{ width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
        backgroundColor: fondIcone }}>{icone}</View>
      <View style={{ flex: 1, gap: 3 }}>
        <Titre taille={20} style={{ color: couleurs.blanc }}>{titre}</Titre>
        <Texte style={{ color: couleurs.blanc, opacity: 0.85, fontSize: 13 }}>{sous}</Texte>
      </View>
      <Text style={{ fontSize: 22, color: couleurs.blanc }}>›</Text>
    </Pressable>
  );
}

// =====================================================================================
// Connecté : Mon compte
// =====================================================================================

const STATUTS: Record<api.StatutCandidature, { libelle: Cles; fond: string; texte: string }> = {
  EN_ATTENTE: { libelle: 'statutEnAttente', fond: couleurs.ocreClair, texte: '#8A5A00' },
  COMPLEMENT: { libelle: 'statutComplement', fond: couleurs.terracottaClair, texte: couleurs.terracottaFonce },
  APPROUVEE: { libelle: 'statutApprouvee', fond: couleurs.vertClair, texte: couleurs.vert },
  REFUSEE: { libelle: 'statutRefusee', fond: '#FDE2E1', texte: '#8A1C1C' },
};

function MonCompte({ onDeconnecte }: { onDeconnecte: () => void }) {
  const { t } = useT();
  const { compte, synchroniser, fermer, supprimer, rafraichir } = useCompte();
  const [synchro, setSynchro] = useState<'idle' | 'encours' | number>('idle');
  const [bio, setBio] = useState<{ disponible: boolean; faceId: boolean; active: boolean } | null>(null);
  const [suppression, setSuppression] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([biometrieDisponible(), biometrieActivee()])
      .then(([d, a]) => setBio({ ...d, active: a })).catch(() => undefined);
    void rafraichir().catch(() => undefined);     // statut de candidature à jour
  }, [rafraichir]);

  if (!compte) return null;
  const initiale = (compte.nom || compte.email || '?').trim().charAt(0).toUpperCase();
  const candidature = compte.candidature;

  async function lancerSynchro() {
    setSynchro('encours');
    try { setSynchro(await synchroniser()); } catch { setSynchro('idle'); setErreur(t('erreurSynchro')); }
  }

  async function basculerBio(v: boolean) {
    // Activation : on vérifie d'abord que Face ID répond bien.
    if (v) {
      await activerBiometrie(true);
      if (!(await confirmerIdentite(t('faceIdActiver'), t('annuler')))) { await activerBiometrie(false); return; }
    } else {
      await activerBiometrie(false);
    }
    setBio((b) => (b ? { ...b, active: v } : b));
  }

  async function confirmerSuppression() {
    setEnCours(true);
    try { await supprimer(); setSuppression(false); router.back(); } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e)); setSuppression(false);
    } finally { setEnCours(false); }
  }

  return (
    <Ecran>
      <EnTete surtitre={t('compteSurtitre')} titre={t('monCompte')} />

      {/* Carte d'identité du compte */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: couleurs.blanc,
        borderRadius: 22, padding: 16, borderWidth: 1, borderColor: couleurs.bordure }}>
        <View style={{ width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center',
          backgroundColor: compte.profil === 'PARTENAIRE' ? couleurs.terracotta : couleurs.ocean }}>
          <Text style={{ fontFamily: polices.titre, fontSize: 24, color: couleurs.blanc }}>{initiale}</Text>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Titre taille={19}>{compte.nom || t('visiteurAnonyme')}</Titre>
          {compte.email ? <Texte style={{ fontSize: 13 }}>{compte.email}</Texte> : null}
          <Texte style={{ fontSize: 12, color: couleurs.gris }}>
            {compte.profil === 'PARTENAIRE' ? t('profilPartenaire') : t('profilVisiteur')}
            {compte.apple ? ' ·  Apple' : ''}
          </Texte>
        </View>
      </View>

      {/* Partenaire : statut de la candidature (ou invitation à la déposer) */}
      {compte.profil === 'PARTENAIRE' ? (
        <Pressable accessibilityRole="button" onPress={() => router.push('/compte/candidature')}
          style={{ backgroundColor: couleurs.blanc, borderRadius: 18, padding: 16, gap: 8,
            borderWidth: 1, borderColor: couleurs.bordure }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Texte gras style={{ color: couleurs.encre }}>{t('maCandidature')}</Texte>
            {candidature ? (
              <View style={{ backgroundColor: STATUTS[candidature.statut].fond, borderRadius: 10,
                paddingHorizontal: 10, paddingVertical: 3 }}>
                <Text style={{ fontFamily: polices.texteGras, fontSize: 12,
                  color: STATUTS[candidature.statut].texte }}>{t(STATUTS[candidature.statut].libelle)}</Text>
              </View>
            ) : <Text style={{ fontSize: 18, color: couleurs.gris }}>›</Text>}
          </View>
          <Texte style={{ fontSize: 13 }}>
            {candidature ? `${candidature.nom_activite} · ${t(`typePartenaire${candidature.type}` as Cles)}`
              : t('candidatureADeposer')}
          </Texte>
        </Pressable>
      ) : null}

      {/* Billets synchronisés */}
      <View style={{ backgroundColor: couleurs.blanc, borderRadius: 18, padding: 16, gap: 10,
        borderWidth: 1, borderColor: couleurs.bordure }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <IconeBillet couleur={couleurs.ocean} taille={22} />
          <Texte gras style={{ flex: 1, color: couleurs.encre }}>{t('billetsSynchro')}</Texte>
        </View>
        <Texte style={{ fontSize: 13 }}>{t('billetsSynchroSous')}</Texte>
        <Bouton titre={synchro === 'encours' ? t('synchroEnCours')
          : typeof synchro === 'number' ? t('synchroFaite', { n: String(synchro) }) : t('synchroniserMaintenant')}
          variante="contour" chargement={synchro === 'encours'} onPress={() => void lancerSynchro()} />
      </View>

      {/* Face ID / Touch ID */}
      {bio?.disponible ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: couleurs.blanc,
          borderRadius: 18, padding: 16, borderWidth: 1, borderColor: couleurs.bordure }}>
          <View style={{ flex: 1 }}>
            <Texte gras style={{ color: couleurs.encre }}>{bio.faceId ? t('faceId') : t('biometrie')}</Texte>
            <Texte style={{ fontSize: 13 }}>{t('faceIdSous')}</Texte>
          </View>
          <Switch value={bio.active} onValueChange={(v) => void basculerBio(v)}
            trackColor={{ true: couleurs.vert, false: couleurs.bordureForte }}
            accessibilityLabel={bio.faceId ? t('faceId') : t('biometrie')} />
        </View>
      ) : null}

      {erreur ? <Bandeau ton="erreur" texte={erreur} /> : null}

      <Bouton titre={t('seDeconnecter')} variante="clair" onPress={() => void fermer().then(onDeconnecte)} />
      <Pressable accessibilityRole="button" onPress={() => setSuppression(true)}
        style={{ alignSelf: 'center', minHeight: 44, justifyContent: 'center' }}>
        <Texte style={{ fontSize: 13, color: couleurs.rouge }}>{t('supprimerMonCompte')}</Texte>
      </Pressable>

      <FeuilleConfirmation visible={suppression} ton="danger" titre={t('supprimerMonCompte')}
        message={t('supprimerCompteTexte')} libelleConfirmer={t('supprimerDefinitivement')}
        libelleAnnuler={t('annuler')} chargement={enCours}
        onAnnuler={() => setSuppression(false)} onConfirmer={() => void confirmerSuppression()} />
    </Ecran>
  );
}

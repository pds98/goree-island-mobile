/**
 * MES BILLETS — lus depuis le téléphone (fonctionne hors ligne), rafraîchis
 * depuis l'API quand le réseau est là (statut VALIDE → UTILISÉ).
 *
 *   - Recherche (numéro, nom donné, titulaire, date) ;
 *   - Filtres combinables avec compteurs : type (chaloupe / entrée du site)
 *     et état (à venir / utilisés / expirés) ; tri (récents, date, prix) ;
 *   - Glisser un billet vers la gauche (ou bouton « ⋯ ») : Renommer, Supprimer ;
 *   - Supprimer retire le billet de CE téléphone (il reste valable), après
 *     confirmation, avec « Annuler » pendant 5 secondes ;
 *   - Les billets jamais consultés portent « NOUVEAU » ; ouvrir l'onglet remet
 *     la pastille de l'onglet à zéro.
 */
import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal, Pressable, RefreshControl, ScrollView, Text, TextInput, View,
} from 'react-native';
import Swipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { aujourdHui, lireBillet } from '@/api/client';
import type { Famille } from '@/api/types';
import { libelleDate } from '@/composants/Calendrier';
import { FeuilleConfirmation } from '@/composants/FeuilleConfirmation';
import { IconeBateau, IconeLieu } from '@/composants/icones';
import { Bouton, Etiquette, formaterFcfa, Texte, Titre } from '@/composants/ui';
import { useT, type Cles } from '@/i18n';
import {
  enregistrerBillets, lireBillets, marquerBilletsVus, renommerBillet, restaurerBillet,
  supprimerBillet, type BilletStocke,
} from '@/stockage/billets';
import { couleurs, polices, rayon } from '@/theme';

type FiltreFamille = 'TOUS' | Famille;
type Etat = 'A_VENIR' | 'UTILISE' | 'EXPIRE';
type FiltreEtat = 'TOUS' | Etat;
type Tri = 'RECENT' | 'DATE' | 'PRIX';

const TRIS: { valeur: Tri; libelle: Cles }[] = [
  { valeur: 'RECENT', libelle: 'triRecent' }, { valeur: 'DATE', libelle: 'triDate' }, { valeur: 'PRIX', libelle: 'triPrix' },
];

/** État d'un billet : utilisé (plus aucun QR valable), expiré (date passée) ou à venir. */
function etatBillet(b: BilletStocke, aujourdhui: string): Etat {
  if (b.billet.statut !== 'ACTIF' || !b.billet.coupons.some((c) => c.statut === 'VALIDE')) return 'UTILISE';
  return b.billet.date_visite < aujourdhui ? 'EXPIRE' : 'A_VENIR';
}

export default function Billets() {
  const { t } = useT();
  const [billets, setBillets] = useState<BilletStocke[]>([]);
  const [nouveaux, setNouveaux] = useState<Set<string>>(new Set());   // non vus à l'ouverture
  const [rafraichissement, setRafraichissement] = useState(false);
  const [recherche, setRecherche] = useState('');
  const [famille, setFamille] = useState<FiltreFamille>('TOUS');
  const [etat, setEtat] = useState<FiltreEtat>('TOUS');
  const [tri, setTri] = useState<Tri>('RECENT');
  const [actions, setActions] = useState<BilletStocke | null>(null);    // menu « ⋯ »
  const [aRenommer, setARenommer] = useState<BilletStocke | null>(null);
  const [nouveauNom, setNouveauNom] = useState('');
  const [aSupprimer, setASupprimer] = useState<BilletStocke | null>(null);
  const [retire, setRetire] = useState<BilletStocke | null>(null);       // pour « Annuler »
  const minuteurRetire = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ouverts = useRef(new Map<string, SwipeableMethods>());

  const charger = useCallback(async () => setBillets(await lireBillets()), []);

  // À chaque ouverture de l'onglet : on note les billets nouveaux, puis on les marque vus.
  useFocusEffect(useCallback(() => {
    void (async () => {
      const liste = await lireBillets();
      setNouveaux(new Set(liste.filter((b) => !b.vuLe).map((b) => b.billet.numero)));
      setBillets(liste);
      await marquerBilletsVus();
    })();
  }, []));

  useEffect(() => () => { if (minuteurRetire.current) clearTimeout(minuteurRetire.current); }, []);

  async function rafraichir() {
    setRafraichissement(true);
    const stockes = await lireBillets();
    const maj = await Promise.allSettled(stockes.map(async (s) => ({
      ...s, billet: await lireBillet(s.billet.numero, s.telephone) })));
    await enregistrerBillets(maj.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : [])));
    await charger();
    setRafraichissement(false);
  }

  // --- Filtres, recherche, tri -------------------------------------------------
  const aujourdhui = aujourdHui();
  const { visibles, comptesFamille, comptesEtat } = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    const correspond = (b: BilletStocke) => !q || [b.billet.numero, b.nom ?? '', b.titulaire, b.billet.date_visite]
      .some((champ) => champ.toLowerCase().includes(q));
    const parRecherche = billets.filter(correspond);
    const parFamille = parRecherche.filter((b) => famille === 'TOUS' || b.billet.famille === famille);
    const resultat = parFamille.filter((b) => etat === 'TOUS' || etatBillet(b, aujourdhui) === etat);
    resultat.sort((a, b) => (tri === 'PRIX' ? b.billet.prix - a.billet.prix
      : tri === 'DATE' ? a.billet.date_visite.localeCompare(b.billet.date_visite)
        : b.enregistreLe.localeCompare(a.enregistreLe)));
    const compte = <T,>(liste: BilletStocke[], cle: (b: BilletStocke) => T, v: T) => liste.filter((b) => cle(b) === v).length;
    return {
      visibles: resultat,
      comptesFamille: { TOUS: parRecherche.length, CHALOUPE: compte(parRecherche, (b) => b.billet.famille, 'CHALOUPE'),
        ENTREE_SITE: compte(parRecherche, (b) => b.billet.famille, 'ENTREE_SITE') },
      comptesEtat: { TOUS: parFamille.length, A_VENIR: compte(parFamille, (b) => etatBillet(b, aujourdhui), 'A_VENIR'),
        UTILISE: compte(parFamille, (b) => etatBillet(b, aujourdhui), 'UTILISE'),
        EXPIRE: compte(parFamille, (b) => etatBillet(b, aujourdhui), 'EXPIRE') },
    };
  }, [billets, recherche, famille, etat, tri, aujourdhui]);
  const filtresActifs = recherche !== '' || famille !== 'TOUS' || etat !== 'TOUS';

  // --- Actions -------------------------------------------------------------------
  function fermerGlissements() {
    ouverts.current.forEach((m) => m.close());
  }

  function ouvrirRenommer(b: BilletStocke) {
    fermerGlissements();
    setActions(null);
    setNouveauNom(b.nom ?? '');
    setARenommer(b);
  }

  async function validerRenommer() {
    if (!aRenommer) return;
    await renommerBillet(aRenommer.billet.numero, nouveauNom);
    setARenommer(null);
    await charger();
  }

  function demanderSuppression(b: BilletStocke) {
    fermerGlissements();
    setActions(null);
    setASupprimer(b);
  }

  async function confirmerSuppression() {
    if (!aSupprimer) return;
    const copie = await supprimerBillet(aSupprimer.billet.numero);
    setASupprimer(null);
    await charger();
    if (copie) {
      setRetire(copie);
      if (minuteurRetire.current) clearTimeout(minuteurRetire.current);
      minuteurRetire.current = setTimeout(() => setRetire(null), 5_000);
    }
  }

  async function annulerSuppression() {
    if (!retire) return;
    await restaurerBillet(retire);
    setRetire(null);
    await charger();
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: couleurs.sable }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={rafraichissement} onRefresh={rafraichir} />}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <Titre taille={26}>{t('mesBillets')}</Titre>
          <Texte style={{ fontSize: 13, color: couleurs.gris }}>{t('nBillets', { n: billets.length })}</Texte>
        </View>

        {/* Recherche */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: couleurs.blanc,
          borderRadius: rayon.m, borderWidth: 1, borderColor: couleurs.bordure, paddingHorizontal: 12, minHeight: 48 }}>
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={couleurs.gris} strokeWidth={2}
            strokeLinecap="round"><Circle cx={11} cy={11} r={7} /><Path d="M20 20l-4-4" /></Svg>
          <TextInput value={recherche} onChangeText={setRecherche} placeholder={t('rechercherBillet')}
            placeholderTextColor={couleurs.gris} accessibilityLabel={t('rechercherBillet')} returnKeyType="search"
            style={{ flex: 1, fontFamily: polices.texteMoyen, fontSize: 15, color: couleurs.encre, paddingVertical: 10 }} />
          {recherche ? (
            <Pressable onPress={() => setRecherche('')} hitSlop={10} accessibilityRole="button"
              accessibilityLabel={t('effacerFiltres')}>
              <Text style={{ fontSize: 16, color: couleurs.gris }}>✕</Text>
            </Pressable>
          ) : null}
        </View>

        {/* Filtres : type + état, avec compteurs ; tri */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <Pastille actif={famille === 'TOUS'} onPress={() => setFamille('TOUS')}
            libelle={t('filtreTous')} compte={comptesFamille.TOUS} />
          <Pastille actif={famille === 'CHALOUPE'} onPress={() => setFamille('CHALOUPE')} couleur={couleurs.ocean}
            libelle={t('ongletChaloupe')} compte={comptesFamille.CHALOUPE} />
          <Pastille actif={famille === 'ENTREE_SITE'} onPress={() => setFamille('ENTREE_SITE')} couleur={couleurs.terracotta}
            libelle={t('entreeSite')} compte={comptesFamille.ENTREE_SITE} />
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {([['TOUS', 'filtreTous'], ['A_VENIR', 'filtreAVenir'], ['UTILISE', 'filtreUtilises'],
            ['EXPIRE', 'filtreExpires']] as [FiltreEtat, Cles][]).map(([v, cle]) => (
            <Pastille key={v} petite actif={etat === v} onPress={() => setEtat(v)} libelle={t(cle)}
              compte={comptesEtat[v]} couleur={couleurs.encre} />
          ))}
          <Pastille petite actif={false} couleur={couleurs.encre}
            libelle={`⇅ ${t(TRIS.find((x) => x.valeur === tri)!.libelle)}`}
            onPress={() => setTri(TRIS[(TRIS.findIndex((x) => x.valeur === tri) + 1) % TRIS.length].valeur)} />
        </ScrollView>

        <Texte style={{ fontSize: 12, color: couleurs.gris }}>{t('horsLigne')} · {t('tirerActualiser')}</Texte>

        {billets.length === 0 ? <Texte>{t('aucunBillet')}</Texte> : null}
        {billets.length > 0 && visibles.length === 0 ? (
          <View style={{ gap: 10, alignItems: 'flex-start' }}>
            <Texte>{t('aucunResultat')}</Texte>
            {filtresActifs ? <Bouton titre={t('effacerFiltres')} variante="contour"
              onPress={() => { setRecherche(''); setFamille('TOUS'); setEtat('TOUS'); }} /> : null}
          </View>
        ) : null}

        {visibles.map((b) => (
          <Swipeable key={b.billet.numero} friction={2} rightThreshold={40} overshootRight={false}
            ref={(m) => { if (m) ouverts.current.set(b.billet.numero, m); else ouverts.current.delete(b.billet.numero); }}
            renderRightActions={() => (
              <View style={{ flexDirection: 'row', marginLeft: 8, gap: 6 }}>
                <ActionGlisser libelle={t('renommer')} fond={couleurs.ocre} encre={couleurs.encre}
                  onPress={() => ouvrirRenommer(b)} />
                <ActionGlisser libelle={t('supprimer')} fond={couleurs.rouge} encre={couleurs.blanc}
                  onPress={() => demanderSuppression(b)} />
              </View>
            )}>
            <CarteBillet b={b} etat={etatBillet(b, aujourdhui)} nouveau={nouveaux.has(b.billet.numero)}
              onActions={() => setActions(b)} />
          </Swipeable>
        ))}
      </ScrollView>

      {/* Menu « ⋯ » d'un billet */}
      <Modal visible={!!actions} transparent animationType="fade" onRequestClose={() => setActions(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(26,20,16,0.45)', justifyContent: 'flex-end', padding: 16 }}
          onPress={() => setActions(null)}>
          <View style={{ backgroundColor: couleurs.sable, borderRadius: 22, padding: 16, gap: 10 }}>
            <Texte gras style={{ textAlign: 'center' }}>{actions?.nom ?? actions?.billet.numero}</Texte>
            <Bouton titre={t('renommer')} variante="contour" onPress={() => actions && ouvrirRenommer(actions)} />
            <Bouton titre={t('supprimer')} onPress={() => actions && demanderSuppression(actions)}
              style={{ backgroundColor: couleurs.rouge, borderColor: couleurs.rouge }} />
            <Bouton titre={t('annuler')} variante="clair" onPress={() => setActions(null)} />
          </View>
        </Pressable>
      </Modal>

      {/* Renommer */}
      <FeuilleConfirmation visible={!!aRenommer} titre={t('renommerTitre')} message={t('renommerAide')}
        libelleConfirmer={t('enregistrer')} onAnnuler={() => setARenommer(null)} onConfirmer={validerRenommer}
        enfants={(
          <TextInput value={nouveauNom} onChangeText={setNouveauNom} placeholder={t('nomBilletExemple')}
            placeholderTextColor={couleurs.gris} maxLength={40} autoFocus returnKeyType="done"
            onSubmitEditing={validerRenommer} accessibilityLabel={t('renommerTitre')}
            style={{ minHeight: 50, borderRadius: rayon.m, borderWidth: 1, borderColor: couleurs.bordureForte,
              backgroundColor: couleurs.blanc, paddingHorizontal: 14, fontFamily: polices.texteMoyen,
              fontSize: 16, color: couleurs.encre }} />
        )} />

      {/* Supprimer (confirmation) */}
      <FeuilleConfirmation visible={!!aSupprimer} ton="danger" titre={t('supprimerTitre')} message={t('supprimerTexte')}
        lignes={aSupprimer ? [{ libelle: t('recapTrajet'), valeur: aSupprimer.nom ?? aSupprimer.billet.numero },
          { libelle: t('recapDate'), valeur: libelleDate(aSupprimer.billet.date_visite, t) }] : undefined}
        libelleConfirmer={t('supprimer')} onAnnuler={() => setASupprimer(null)} onConfirmer={confirmerSuppression} />

      {/* « Annuler » pendant 5 s après une suppression */}
      {retire ? (
        <View accessibilityLiveRegion="polite" style={{ position: 'absolute', left: 16, right: 16, bottom: 16,
          backgroundColor: couleurs.encre, borderRadius: rayon.l, paddingVertical: 12, paddingHorizontal: 16,
          flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Texte style={{ flex: 1, color: couleurs.sable }}>{t('billetRetire')}</Texte>
          <Pressable onPress={annulerSuppression} hitSlop={10} accessibilityRole="button">
            <Text style={{ fontFamily: polices.texteGras, color: couleurs.ocre, fontSize: 15 }}>{t('annuler')}</Text>
          </Pressable>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

// --- Composants locaux ---------------------------------------------------------

function Pastille({ libelle, compte, actif, onPress, couleur = couleurs.encre, petite = false }: {
  libelle: string; compte?: number; actif: boolean; onPress: () => void; couleur?: string; petite?: boolean;
}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: actif }}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: petite ? 12 : 14, minHeight: petite ? 36 : 42, borderRadius: 21, borderWidth: 1.5,
        borderColor: actif ? couleur : couleurs.bordureForte, backgroundColor: actif ? couleur : couleurs.blanc,
        opacity: pressed ? 0.8 : 1 })}>
      <Text style={{ fontFamily: actif ? polices.texteGras : polices.texteMoyen, fontSize: petite ? 13 : 14,
        color: actif ? couleurs.blanc : couleurs.encre }}>{libelle}</Text>
      {compte !== undefined ? (
        <View style={{ minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, alignItems: 'center',
          justifyContent: 'center', backgroundColor: actif ? 'rgba(255,255,255,0.25)' : couleurs.sableFonce }}>
          <Text style={{ fontFamily: polices.texteGras, fontSize: 12, color: actif ? couleurs.blanc : couleurs.encreDouce }}>
            {compte}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function ActionGlisser({ libelle, fond, encre, onPress }: {
  libelle: string; fond: string; encre: string; onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button"
      style={{ width: 92, borderRadius: 18, backgroundColor: fond, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: polices.texteGras, fontSize: 13, color: encre }}>{libelle}</Text>
    </Pressable>
  );
}

function CarteBillet({ b, etat, nouveau, onActions }: {
  b: BilletStocke; etat: Etat; nouveau: boolean; onActions: () => void;
}) {
  const { t } = useT();
  const { billet, titulaire } = b;
  const chaloupe = billet.famille === 'CHALOUPE';
  const couleur = chaloupe ? couleurs.ocean : couleurs.terracotta;
  const etiquette = etat === 'A_VENIR' ? { texte: t('valide'), fond: couleurs.vert, encre: couleurs.blanc }
    : etat === 'UTILISE' ? { texte: t('utilise'), fond: couleurs.bordure, encre: couleurs.encreDouce }
      : { texte: t('expire'), fond: couleurs.sableFonce, encre: couleurs.gris };

  return (
    <Link asChild href={{ pathname: '/billet/[numero]', params: { numero: billet.numero } }}>
      <Pressable accessibilityRole="link" style={{ backgroundColor: couleurs.blanc, borderRadius: 18,
        borderLeftWidth: 6, borderLeftColor: couleur, paddingVertical: 14, paddingLeft: 16, paddingRight: 6,
        flexDirection: 'row', gap: 12, alignItems: 'center', opacity: etat === 'A_VENIR' ? 1 : 0.75 }}>
        {chaloupe ? <IconeBateau couleur={couleur} /> : <IconeLieu couleur={couleur} />}
        <View style={{ flex: 1, gap: 3 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Texte gras style={{ color: couleurs.encre, flexShrink: 1 }}>{b.nom ?? billet.numero}</Texte>
            {nouveau ? <Etiquette texte={t('nouveau').toUpperCase()} fond={couleurs.rouge} couleur={couleurs.blanc} /> : null}
          </View>
          {b.nom ? <Texte style={{ fontSize: 12, color: couleurs.gris }}>{billet.numero}</Texte> : null}
          <Texte style={{ fontSize: 13 }}>
            {libelleDate(billet.date_visite, t)} · {titulaire} · {formaterFcfa(billet.prix)}
          </Texte>
        </View>
        <Etiquette fond={etiquette.fond} couleur={etiquette.encre} texte={etiquette.texte.toUpperCase()} />
        <Pressable onPress={onActions} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('actionsBillet')}
          style={{ width: 36, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 20, color: couleurs.gris, marginTop: -6 }}>⋯</Text>
        </Pressable>
      </Pressable>
    </Link>
  );
}

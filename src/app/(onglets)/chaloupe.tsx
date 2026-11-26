/**
 * PARCOURS 1 — La traversée Dakar ⇄ Gorée.
 *
 * Depuis le 29 octobre 2026, le billet de chaloupe est vendu par la billetterie
 * OFFICIELLE du Port autonome de Dakar (dakargoree.sn) : c'est son QR code qui
 * est scanné à l'embarquement. L'app ne vend donc pas ce billet (un billet
 * émis par l'app serait refusé au quai) : le bouton ouvre la billetterie
 * officielle dans l'app, et l'écran garde ce que le Port ne fait pas :
 * horaires du jour, retards en direct, suivi de la chaloupe.
 *
 * Le jour où un partenariat de revente (API du Port) sera signé, l'achat
 * direct pourra revenir ici : l'ancien parcours est dans l'historique Git
 * (commit 48d1e5c, src/app/(onglets)/chaloupe.tsx).
 */
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { aujourdHui, dateDakar, heureDakar, listerRotations } from '@/api/client';
import type { Rotation } from '@/api/types';
import { Calendrier } from '@/composants/Calendrier';
import { Bandeau, Bouton, Ecran, Etiquette, Frise, Texte, Titre } from '@/composants/ui';
import { useT } from '@/i18n';
import { couleurs, polices } from '@/theme';

/** Billetterie officielle de la Liaison maritime Dakar-Gorée (Port autonome de Dakar). */
export const BILLETTERIE_OFFICIELLE = 'https://dakargoree.sn';

export default function Chaloupe() {
  const { t } = useT();
  const [jour, setJour] = useState(aujourdHui());
  const [erreur, setErreur] = useState<string | null>(null);

  const rotations = useQuery({ queryKey: ['rotations', jour], queryFn: () => listerRotations(jour) });
  const departs = (rotations.data ?? []).filter((r) => r.depart === 'Dakar' && dateDakar(r.heure_prevue) === jour);
  const retours = (rotations.data ?? []).filter((r) => r.depart !== 'Dakar' && dateDakar(r.heure_prevue) === jour);
  const joursAvecDeparts = new Set((rotations.data ?? [])
    .filter((r) => r.depart === 'Dakar').map((r) => dateDakar(r.heure_prevue)));

  async function ouvrirBilletterie() {
    setErreur(null);
    try {
      // Navigateur intégré (SFSafariViewController / Custom Tabs) : le visiteur
      // reste dans l'app, et le paiement se fait chez le Port, pas chez nous.
      await WebBrowser.openBrowserAsync(BILLETTERIE_OFFICIELLE, {
        toolbarColor: couleurs.ocean, controlsColor: couleurs.blanc,
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
      });
    } catch {
      setErreur(t('billetterieIndisponible'));
    }
  }

  return (
    <Ecran style={{ padding: 0, gap: 0 }}>
      <Image source={require('@/assets/images/goree/goree-chaloupe.jpg')} contentFit="cover"
        style={{ height: 160 }} accessibilityLabel="Chaloupe traversant vers Gorée" />
      <View style={{ backgroundColor: couleurs.ocean, padding: 20, flexDirection: 'row',
        alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Titre taille={26} style={{ color: couleurs.blanc }}>{t('chaloupeTitre')}</Titre>
          <Texte style={{ color: couleurs.oceanClair, fontSize: 13 }}>Dakar ⇄ Gorée · ~20 min</Texte>
        </View>
        <Etiquette texte={t('enDirect')} incline />
      </View>
      <Frise />

      <View style={{ padding: 20, gap: 18 }}>
        {/* Billetterie officielle du Port */}
        <View style={{ backgroundColor: couleurs.blanc, borderRadius: 20, padding: 16, gap: 10,
          borderWidth: 1, borderColor: couleurs.bordure }}>
          <Texte gras style={{ color: couleurs.encre, fontSize: 16 }}>{t('billetChaloupe')}</Texte>
          <Texte style={{ fontSize: 13 }}>{t('billetterieOfficielleSous')}</Texte>
          <Bouton titre={t('acheterSurSiteOfficiel')} variante="ocean" onPress={() => void ouvrirBilletterie()} />
          <Texte style={{ fontSize: 11, color: couleurs.gris }}>{t('billetterieMention')}</Texte>
        </View>
        {erreur ? <Bandeau ton="erreur" texte={erreur} /> : null}

        {/* Horaires en direct (ce que le Port n'affiche pas en temps réel) */}
        <Calendrier valeur={jour} onChange={setJour} libelle={t('dateTraversee')}
          joursMarques={joursAvecDeparts} legendeMarque={t('departsPublies')} />

        <View style={{ gap: 8 }}>
          <Texte gras>{t('departsDakar')}</Texte>
          {departs.length ? <Grille liste={departs} /> : (
            <Texte style={{ fontSize: 13, color: couleurs.gris }}>{t('horairesNonPublies')}</Texte>
          )}
        </View>
        {retours.length ? (
          <View style={{ gap: 8 }}>
            <Texte gras>{t('goreeDakar')}</Texte>
            <Grille liste={retours} />
          </View>
        ) : null}
        <Texte style={{ fontSize: 12, color: couleurs.gris }}>{t('toucherPourSuivre')}</Texte>
      </View>
    </Ecran>
  );
}

/** Grille d'horaires : un toucher ouvre le suivi en direct de la chaloupe. */
function Grille({ liste }: { liste: Rotation[] }) {
  const { t } = useT();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {liste.map((r) => (
        <Pressable key={r.id} accessibilityRole="button" onPress={() => router.push(`/suivi/${r.id}`)}
          accessibilityLabel={`${heureDakar(r.heure_prevue)} · ${r.annulee ? t('statutAnnulee')
            : r.retard_minutes ? `+${r.retard_minutes} min` : t('aLHeure')} · ${t('suivreDirect')}`}
          style={{ width: 84, minHeight: 66, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
            gap: 3, borderWidth: 1, borderColor: couleurs.bordure, backgroundColor: couleurs.blanc,
            opacity: r.annulee ? 0.5 : 1 }}>
          <Text style={{ fontFamily: polices.titre, fontSize: 19, color: couleurs.encre,
            textDecorationLine: r.annulee ? 'line-through' : 'none' }}>{heureDakar(r.heure_prevue)}</Text>
          <Text style={{ fontFamily: polices.texteGras, fontSize: 11,
            color: r.annulee ? couleurs.rouge : r.retard_minutes ? '#8A5A00' : couleurs.vert }}>
            {r.annulee ? t('statutAnnulee') : r.retard_minutes ? `+${r.retard_minutes} min` : t('aLHeure')}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

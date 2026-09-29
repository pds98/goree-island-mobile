/**
 * Un billet avec son / ses QR. Affiché depuis le téléphone (hors ligne),
 * rafraîchi en ligne. Chaloupe : alerte de retard + annonce du retour.
 * Entrée du site : report (1 fois, 7 jours) → nouveau QR, l'ancien révoqué.
 */
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import {
  annoncerRetour, aujourdHui, dateDakar, ErreurApiClient, lireBillet, listerRotations,
  reporterBillet,
} from '@/api/client';
import type { Billet } from '@/api/types';
import { IconeCloche } from '@/composants/icones';
import { Bandeau, Bouton, Ecran, EnTete, Etiquette, formaterFcfa, Texte, Titre } from '@/composants/ui';
import { useT } from '@/i18n';
import { enregistrerBillets, trouverBillet, type BilletStocke } from '@/stockage/billets';
import { couleurs } from '@/theme';

export default function DetailBillet() {
  const { t } = useT();
  const { numero } = useLocalSearchParams<{ numero: string }>();
  const [stocke, setStocke] = useState<BilletStocke | null>(null);
  const [message, setMessage] = useState<{ ton: 'info' | 'erreur'; texte: string } | null>(null);

  // 1) Lecture locale immédiate (hors ligne), 2) mise à jour depuis l'API.
  useEffect(() => {
    (async () => {
      const local = await trouverBillet(numero);
      if (!local) return;
      setStocke(local);
      try {
        await sauver(local, await lireBillet(numero, local.telephone));
      } catch { /* hors ligne : on garde la version locale */ }
    })();
  }, [numero]);

  async function sauver(s: BilletStocke, billet: Billet) {
    const maj = { ...s, billet };
    await enregistrerBillets([maj]);
    setStocke(maj);
  }

  const estChaloupe = stocke?.billet.famille === 'CHALOUPE';
  const rotations = useQuery({ queryKey: ['rotations'], queryFn: listerRotations, enabled: !!estChaloupe });
  const retardDakar = rotations.data?.find((r) => r.depart === 'Dakar' && r.retard_minutes > 0
    && dateDakar(r.heure_prevue) === stocke?.billet.date_visite);
  const retoursGoree = rotations.data?.filter((r) => r.depart === 'Gorée') ?? [];

  if (!stocke) {
    return <Ecran><EnTete titre={numero} /><Texte>Billet introuvable sur ce téléphone.</Texte></Ecran>;
  }
  const { billet, telephone, titulaire } = stocke;
  const couleur = estChaloupe ? couleurs.ocean : couleurs.terracotta;

  async function reporter() {
    try {
      await sauver(stocke!, await reporterBillet(billet.numero, telephone, aujourdHui(1)));
      setMessage({ ton: 'info', texte: 'Report accepté : un nouveau QR a été émis, l\'ancien est désactivé.' });
    } catch (e) { setMessage({ ton: 'erreur', texte: (e as ErreurApiClient).message }); }
  }

  async function retour(rotationId: string, nom: string) {
    try {
      await annoncerRetour(billet.numero, telephone, rotationId);
      setMessage({ ton: 'info', texte: `Retour annoncé sur « ${nom} » (indicatif, ton billet reste libre).` });
    } catch (e) { setMessage({ ton: 'erreur', texte: (e as ErreurApiClient).message }); }
  }

  return (
    <Ecran fond={couleur}>
      <EnTete titre={t('mesBillets')} clair />

      {estChaloupe && retardDakar ? (
        <View style={{ backgroundColor: couleurs.ocre, borderRadius: 16, padding: 12, flexDirection: 'row',
          gap: 10, alignItems: 'center' }}>
          <IconeCloche couleur={couleurs.encre} />
          <Texte gras style={{ flex: 1, color: couleurs.encre }}>
            {t('retard')} : « {retardDakar.nom} » +{retardDakar.retard_minutes} min. Ton billet reste valable.
          </Texte>
        </View>
      ) : null}

      <View style={{ backgroundColor: couleurs.sable, borderRadius: 24, padding: 18, gap: 14 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Texte gras style={{ color: couleur, fontSize: 12, letterSpacing: 1.2 }}>
              {estChaloupe ? 'CHALOUPE' : 'ENTRÉE DU SITE'}
            </Texte>
            <Titre taille={22}>{estChaloupe ? 'Dakar ⇄ Gorée' : titulaire}</Titre>
          </View>
          <Etiquette fond={billet.statut === 'ACTIF' ? couleurs.vert : couleurs.bordure} couleur={couleurs.blanc}
            texte={billet.statut === 'ACTIF' ? t('valide').toUpperCase() : billet.statut} />
        </View>

        {billet.coupons.map((c) => (
          <View key={c.jeton} style={{ alignItems: 'center', gap: 8, opacity: c.statut === 'VALIDE' ? 1 : 0.35 }}>
            <Texte gras>{c.libelle} · {c.statut === 'VALIDE' ? t('valide') : t('utilise')}</Texte>
            <View style={{ padding: 10, backgroundColor: couleurs.blanc, borderRadius: 14 }}
              accessibilityLabel={`QR code : ${c.libelle}`}>
              <QRCode value={c.jeton} size={200} color={couleurs.encre} backgroundColor={couleurs.blanc} ecl="M" />
            </View>
          </View>
        ))}
        <Texte gras style={{ textAlign: 'center', letterSpacing: 1 }}>{billet.numero}</Texte>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Info libelle="DATE" valeur={billet.date_visite} />
          {estChaloupe ? <Info libelle="PASSAGERS" valeur={String(billet.passagers)} />
            : <Info libelle="PERSONNES" valeur={String(1 + (billet.adultes_supp ?? 0) + (billet.enfants ?? 0))} />}
          {estChaloupe ? <Info libelle="PRIX" valeur={formaterFcfa(billet.prix)} />
            : <Info libelle="PACK" valeur={billet.pack ?? '—'} />}
        </View>
      </View>

      <Texte style={{ color: estChaloupe ? couleurs.oceanClair : couleurs.terracottaClair, textAlign: 'center',
        fontSize: 12 }}>{estChaloupe ? t('scannerEmbarcadere') : t('scannerSite')}</Texte>

      {message ? <Bandeau ton={message.ton} texte={message.texte} /> : null}

      {estChaloupe && billet.coupons.length > 1 && retoursGoree.length > 0 ? (
        <View style={{ gap: 8 }}>
          <Texte gras style={{ color: couleurs.blanc }}>{t('annoncerRetour')} (indicatif)</Texte>
          {retoursGoree.map((r) => (
            <Bouton key={r.id} titre={r.nom} variante="clair" onPress={() => retour(r.id, r.nom)} />
          ))}
        </View>
      ) : null}

      {!estChaloupe && billet.coupons[0]?.statut === 'VALIDE' ? (
        <Bouton titre={t('reporter')} variante="clair" onPress={reporter} />
      ) : null}
    </Ecran>
  );
}

function Info({ libelle, valeur }: { libelle: string; valeur: string }) {
  return (
    <View style={{ gap: 2 }}>
      <Texte style={{ fontSize: 11, color: couleurs.gris }} gras>{libelle}</Texte>
      <Texte gras style={{ color: couleurs.encre }}>{valeur}</Texte>
    </View>
  );
}

/**
 * PARCOURS 1 — Achat d'une traversée.
 * Tarif unique, nom + téléphone, AUCUNE pièce d'identité.
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import {
  acheterChaloupe, aujourdHui, dateDakar, ErreurApiClient, heureDakar, listerRotations,
} from '@/api/client';
import type { MoyenPaiement, Trajet } from '@/api/types';
import { Calendrier, libelleDate } from '@/composants/Calendrier';
import { FeuilleConfirmation } from '@/composants/FeuilleConfirmation';
import { MOYENS, MoyensPaiement } from '@/composants/MoyensPaiement';
import {
  Bandeau, Bouton, Champ, Compteur, Ecran, Etiquette, formaterFcfa, Frise, Segment, Texte, Titre,
} from '@/composants/ui';
import { confirmerIdentite } from '@/compte/biometrie';
import { useT } from '@/i18n';
import { enregistrerBillets } from '@/stockage/billets';
import { couleurs, polices } from '@/theme';

// Miroir de app/tarifs.py — VALEURS PROVISOIRES. Le montant final est
// toujours celui calculé par le serveur (affiché après paiement).
const PRIX_PAR_PASSAGER: Record<Trajet, number> = { ALLER_SIMPLE: 750, ALLER_RETOUR: 1_500 };

export default function Chaloupe() {
  const { t } = useT();
  // Paramètres envoyés par l'assistant vocal (« 2 billets aller-retour samedi »).
  const p = useLocalSearchParams<{ passagers?: string; trajet?: Trajet; date?: string }>();
  const [trajet, setTrajet] = useState<Trajet>(p.trajet ?? 'ALLER_RETOUR');
  const [jour, setJour] = useState(p.date && p.date >= aujourdHui() ? p.date : aujourdHui());
  const [rotationId, setRotationId] = useState<string | null>(null);
  const [passagers, setPassagers] = useState(Math.min(10, Math.max(1, Number(p.passagers) || 1)));

  // Nouvelle demande de l'assistant alors que l'écran est déjà ouvert : on
  // ajuste l'état pendant le rendu (motif recommandé par React, sans effet).
  const [derniersParams, setDerniersParams] = useState(p);
  if (p.passagers !== derniersParams.passagers || p.trajet !== derniersParams.trajet || p.date !== derniersParams.date) {
    setDerniersParams(p);
    if (p.passagers) setPassagers(Math.min(10, Math.max(1, Number(p.passagers) || 1)));
    if (p.trajet) setTrajet(p.trajet);
    if (p.date && p.date >= aujourdHui()) { setJour(p.date); setRotationId(null); }
  }
  const [nom, setNom] = useState('');
  const [telephone, setTelephone] = useState('+221 ');
  const [moyen, setMoyen] = useState<MoyenPaiement>('WAVE');
  const [confirmation, setConfirmation] = useState(false);   // feuille « Confirmer et payer »

  const rotations = useQuery({ queryKey: ['rotations', jour], queryFn: () => listerRotations(jour) });
  const departs = (rotations.data ?? []).filter((r) => r.depart === 'Dakar'
    && dateDakar(r.heure_prevue) === jour);
  // Jours ayant au moins un départ publié depuis Dakar : un point dans le calendrier.
  const joursAvecDeparts = new Set((rotations.data ?? [])
    .filter((r) => r.depart === 'Dakar').map((r) => dateDakar(r.heure_prevue)));

  const achat = useMutation({
    mutationFn: () => acheterChaloupe({
      nom, telephone: telephone.replace(/\s/g, ''), date_visite: jour, trajet, passagers,
      rotation_id: rotationId, moyen_paiement: moyen,
    }),
    onSettled: () => setConfirmation(false),
    onSuccess: async (commande) => {
      await enregistrerBillets(commande.billets.map((billet) => ({
        billet, telephone: telephone.replace(/\s/g, ''), titulaire: nom,
        enregistreLe: new Date().toISOString(),
      })));
      router.push({ pathname: '/billet/[numero]', params: { numero: commande.billets[0].numero } });
    },
  });

  const formulaireValide = nom.trim().length >= 2 && telephone.replace(/\D/g, '').length >= 9;

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
        <Etiquette texte={t('tarifUnique')} incline />
      </View>
      <Frise />

      <View style={{ padding: 20, gap: 16 }}>
        <Segment<Trajet> valeur={trajet} onChange={setTrajet} options={[
          { valeur: 'ALLER_RETOUR', libelle: t('allerRetour') },
          { valeur: 'ALLER_SIMPLE', libelle: t('allerSimple') },
        ]} />

        <Calendrier valeur={jour} onChange={(j) => { setJour(j); setRotationId(null); }}
          libelle={t('dateTraversee')} joursMarques={joursAvecDeparts}
          legendeMarque={t('departsPublies')} />

        <View style={{ gap: 8 }}>
          <Texte gras>{t('departsDakar')}</Texte>
          {departs.length === 0 ? (
            <Texte style={{ fontSize: 13, color: couleurs.gris }}>
              {t('horairesNonPublies')}
            </Texte>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {departs.map((r) => {
                const actif = r.id === rotationId;
                return (
                  <Pressable key={r.id} accessibilityRole="radio" accessibilityState={{ selected: actif }}
                    onPress={() => setRotationId(actif ? null : r.id)}
                    style={{ width: 84, minHeight: 72, borderRadius: 16, alignItems: 'center',
                      justifyContent: 'center', gap: 4, borderWidth: 1,
                      borderColor: actif ? couleurs.ocean : couleurs.bordure,
                      backgroundColor: actif ? couleurs.ocean : couleurs.blanc }}>
                    <Text style={{ fontFamily: polices.titre, fontSize: 19,
                      color: actif ? couleurs.blanc : couleurs.encre }}>{heureDakar(r.heure_prevue)}</Text>
                    <Text style={{ fontFamily: polices.texteGras, fontSize: 11,
                      color: actif ? couleurs.oceanClair : r.retard_minutes ? '#8A5A00' : couleurs.vert }}>
                      {r.retard_minutes ? `+${r.retard_minutes} min` : t('aLHeure')}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        <Compteur libelle={t('passagers')} valeur={passagers} min={1} max={10} onChange={setPassagers}
          sous={`${formaterFcfa(PRIX_PAR_PASSAGER[trajet])} ${t('parPersonne')} · ${t('tarifUnique').toLowerCase()}`} />

        <Champ libelle={t('nomPrenom')} value={nom} onChangeText={setNom} autoComplete="name"
          textContentType="name" />
        <Champ libelle={t('telephone')} value={telephone} onChangeText={setTelephone}
          keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" />

        <MoyensPaiement valeur={moyen} onChange={setMoyen} />

        <Texte style={{ fontSize: 12, color: couleurs.gris }}>{t('aucuneIdentite')}</Texte>

        {achat.error ? <Bandeau ton="erreur" texte={(achat.error as ErreurApiClient).message} /> : null}

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View>
            <Texte style={{ fontSize: 12 }}>{t('total')}</Texte>
            <Titre taille={20}>{formaterFcfa(PRIX_PAR_PASSAGER[trajet] * passagers)}</Titre>
          </View>
          <Bouton titre={t('payer')} variante="ocean" style={{ flex: 1 }}
            chargement={achat.isPending} desactive={!formulaireValide} onPress={() => setConfirmation(true)} />
        </View>
      </View>

      {/* Récapitulatif avant paiement : rien n'est payé sans confirmation */}
      <FeuilleConfirmation visible={confirmation} ton="ocean" titre={t('confirmerPaiement')}
        lignes={[
          { libelle: t('recapTrajet'), valeur: `Dakar ⇄ Gorée · ${trajet === 'ALLER_RETOUR' ? t('allerRetour') : t('allerSimple')}` },
          { libelle: t('recapDate'), valeur: libelleDate(jour, t) },
          { libelle: t('recapDepart'), valeur: departs.find((r) => r.id === rotationId)?.nom ?? t('tousDeparts') },
          { libelle: t('passagers'), valeur: `${passagers} × ${formaterFcfa(PRIX_PAR_PASSAGER[trajet])}` },
          { libelle: t('recapTitulaire'), valeur: nom.trim() },
          { libelle: t('recapMoyen'), valeur: nomMoyen(moyen) },
        ]}
        total={formaterFcfa(PRIX_PAR_PASSAGER[trajet] * passagers)}
        message={t('paiementSecurise', { moyen: nomMoyen(moyen) })}
        libelleConfirmer={t('confirmerEtPayer')} libelleAnnuler={t('modifier')} chargement={achat.isPending}
        onAnnuler={() => setConfirmation(false)} onConfirmer={async () => {
          // Face ID (si activé dans « Mon compte ») avant de lancer le paiement.
          if (await confirmerIdentite(t('faceIdPaiement'), t('annuler'))) achat.mutate();
        }} />
    </Ecran>
  );
}

/** Nom affiché d'un moyen de paiement (« Wave », « Orange Money »…). */
function nomMoyen(api: MoyenPaiement): string {
  return MOYENS.find((m) => m.api === api)?.nom ?? api;
}

/**
 * Vérification d'identité — tarif national de l'ENTRÉE DU SITE uniquement.
 * Étapes : 1) photo de la CNI (caméra arrière) 2) selfie (caméra avant)
 *          3) numéro de CNI — saisi à la main en MODE DÉMO (remplace l'OCR).
 * Les photos partent au serveur puis sont supprimées ; seule une photo de
 * contrôle chiffrée est gardée pour l'agent.
 */
import { useMutation } from '@tanstack/react-query';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { View } from 'react-native';

import { ErreurApiClient, verifierIdentite } from '@/api/client';
import { Bandeau, Bouton, Champ, Ecran, EnTete, Texte } from '@/composants/ui';
import { useT } from '@/i18n';
import { couleurs } from '@/theme';

type Etape = 'cni' | 'selfie' | 'numero';

export default function Identite() {
  const { t } = useT();
  const [permission, demanderPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const [etape, setEtape] = useState<Etape>('cni');
  const [uriCni, setUriCni] = useState<string | null>(null);
  const [uriSelfie, setUriSelfie] = useState<string | null>(null);
  const [numero, setNumero] = useState('');
  const [nom, setNom] = useState('');

  const envoi = useMutation({
    mutationFn: () => verifierIdentite({ uriCni: uriCni!, uriSelfie: uriSelfie!, numeroCni: numero, nom }),
    onSuccess: (v) => {
      // Retour à l'onglet « L'île » avec le résultat : l'achat national se débloque.
      router.dismissTo({ pathname: '/ile', params: {
        verification: v.verification_id, cni4: v.cni_4_derniers, nomCarte: v.nom_carte } });
    },
  });

  async function photographier() {
    const photo = await camera.current?.takePictureAsync({ quality: 0.6 });
    if (!photo) return;
    if (etape === 'cni') { setUriCni(photo.uri); setEtape('selfie'); }
    else { setUriSelfie(photo.uri); setEtape('numero'); }
  }

  const numeroValide = /^\d{13,17}$/.test(numero);

  return (
    <Ecran>
      <EnTete surtitre="ENTRÉE DU SITE · TARIF NATIONAL" titre={t('cestBienToi')} />
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {(['cni', 'selfie', 'numero'] as Etape[]).map((e, i) => (
          <View key={e} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor:
            i <= ['cni', 'selfie', 'numero'].indexOf(etape) ? couleurs.terracotta : couleurs.bordure }} />
        ))}
      </View>
      <Texte>{t('identiteExplication')}</Texte>

      {etape !== 'numero' ? (
        !permission?.granted ? (
          <Bouton titre={t('autoriserCamera')} variante="encre" onPress={demanderPermission} />
        ) : (
          <View style={{ gap: 12 }}>
            <Texte gras>{etape === 'cni' ? `1. ${t('photoCni')}` : `2. ${t('selfieVivant')}`}</Texte>
            <View style={{ height: 340, borderRadius: 20, overflow: 'hidden', backgroundColor: couleurs.encre }}>
              <CameraView ref={camera} style={{ flex: 1 }} facing={etape === 'cni' ? 'back' : 'front'} />
              {/* Gabarit : rectangle pour la carte, ovale pour le visage */}
              <View pointerEvents="none" style={{ position: 'absolute', alignSelf: 'center',
                top: etape === 'cni' ? 90 : 40, width: etape === 'cni' ? 280 : 190,
                height: etape === 'cni' ? 170 : 250, borderRadius: etape === 'cni' ? 14 : 125,
                borderWidth: 3, borderStyle: 'dashed', borderColor: couleurs.ocre }} />
            </View>
            {etape === 'selfie' ? (
              <Bandeau ton="alerte" texte="Regarde l'objectif, visage bien éclairé. En production, un test de « vivant » (mouvement de tête) est ajouté par le prestataire biométrique." />
            ) : null}
            <Bouton titre={t('prendrePhoto')} variante="terracotta" onPress={photographier} />
          </View>
        )
      ) : (
        <View style={{ gap: 14 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {uriCni ? <Image source={{ uri: uriCni }} style={{ flex: 1, height: 110, borderRadius: 12 }}
              accessibilityLabel="Photo de la CNI" /> : null}
            {uriSelfie ? <Image source={{ uri: uriSelfie }} style={{ width: 90, height: 110, borderRadius: 12 }}
              accessibilityLabel="Selfie" /> : null}
          </View>
          <Bouton titre={t('recommencer')} variante="contour"
            onPress={() => { setUriCni(null); setUriSelfie(null); setEtape('cni'); }} />
          <Champ libelle="Nom tel qu'écrit sur la CNI" value={nom} onChangeText={setNom} />
          <Champ libelle={t('numeroCni')} value={numero} onChangeText={(v) => setNumero(v.replace(/\D/g, ''))}
            keyboardType="number-pad" maxLength={17} />
          <Texte style={{ fontSize: 12, color: couleurs.gris }}>
            Mode démo : le numéro est saisi à la main. En production, il est lu automatiquement sur la photo (OCR).
          </Texte>
          {envoi.error ? <Bandeau ton="erreur" texte={(envoi.error as ErreurApiClient).message} /> : null}
          <Bouton titre={t('valider')} chargement={envoi.isPending}
            desactive={!numeroValide || nom.trim().length < 2} onPress={() => envoi.mutate()} />
        </View>
      )}

      <Bandeau texte={t('confidentialite')} />
    </Ecran>
  );
}

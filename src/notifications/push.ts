/**
 * NOTIFICATIONS PUSH — retards de chaloupe.
 *
 *   1. Le visiteur achète un billet chaloupe → l'app demande l'autorisation
 *      (au bon moment, pas au lancement : Apple le recommande).
 *   2. L'app obtient son jeton Expo Push et l'envoie au backend avec la
 *      langue choisie et les numéros de ses billets chaloupe :
 *        POST {API_URL}/api/v3/notifications/appareil
 *   3. Quand l'admin déclare un retard, le backend prévient chaque téléphone
 *      concerné, dans sa langue. Toucher la notification ouvre le billet.
 *
 * Limites connues :
 *   - Android : pas de notifications distantes dans Expo Go (SDK 53+) → il
 *     faut une vraie build (TestFlight / EAS) ;
 *   - le jeton exige un projet EAS (`eas init` renseigne `extra.eas.projectId`) ;
 *     sans lui, l'inscription est simplement ignorée.
 */
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { API_URL } from '@/api/client';
import type { Langue } from '@/i18n';
import { lireBillets } from '@/stockage/billets';

/** Canal Android des retards (son + bannière). */
export const CANAL_RETARDS = 'retards';

// Notification reçue app OUVERTE : on l'affiche quand même (bannière + son).
if (Platform.OS !== 'web') Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function identifiantProjet(): string | undefined {
  return Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
}

/** Numéros des billets CHALOUPE gardés sur le téléphone (seuls concernés par les retards). */
async function billetsChaloupe(): Promise<string[]> {
  return (await lireBillets()).filter((b) => b.billet.famille === 'CHALOUPE').map((b) => b.billet.numero);
}

async function preparerCanalAndroid(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CANAL_RETARDS, {
    name: 'Retards de chaloupe',
    // eslint-disable-next-line import/namespace -- énumération ré-exportée (faux positif du linter)
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
  });
}

/**
 * Inscrit (ou met à jour) ce téléphone auprès du backend.
 *
 * @param demander  true : affiche la demande d'autorisation si besoin
 *                  (juste après un achat) ; false : n'agit que si l'autorisation
 *                  est déjà accordée (au lancement, changement de langue).
 * @returns true si le téléphone est inscrit.
 */
export async function synchroniserPush(langue: Langue, demander = false): Promise<boolean> {
  try {
    if (Platform.OS === 'web' || !Device.isDevice) return false;   // simulateur / web : pas de push
    const billets = await billetsChaloupe();
    if (billets.length === 0) return false;                         // rien à suivre

    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted' && demander) {
      ({ status } = await Notifications.requestPermissionsAsync());
    }
    if (status !== 'granted') return false;

    const projectId = identifiantProjet();
    if (!projectId) {
      console.warn('[Notifications] pas de projet EAS (lancer « eas init ») : inscription ignorée');
      return false;
    }
    await preparerCanalAndroid();
    const { data: jeton } = await Notifications.getExpoPushTokenAsync({ projectId });

    const reponse = await fetch(`${API_URL}/api/v3/notifications/appareil`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jeton, langue, billets }),
    });
    if (!reponse.ok) {
      console.warn(`[Notifications] inscription refusée : HTTP ${reponse.status}`);
      return false;
    }
    return true;
  } catch (erreur) {
    // Réseau faible, service de jetons indisponible… : on réessaiera au prochain lancement.
    console.warn(`[Notifications] inscription impossible : ${String(erreur)}`);
    return false;
  }
}

/** Numéro du billet à ouvrir quand on touche une notification de retard. */
export function billetDeLaNotification(reponse: Notifications.NotificationResponse | null | undefined): string | null {
  const donnees = reponse?.notification.request.content.data as { type?: string; billet?: string } | undefined;
  return donnees?.type === 'retard' && typeof donnees.billet === 'string' ? donnees.billet : null;
}

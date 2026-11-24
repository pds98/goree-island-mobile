/**
 * Face ID / Touch ID / empreinte (expo-local-authentication).
 *
 * Utilisé, si le visiteur l'active, pour :
 *   - confirmer un paiement (fenêtre « Confirmer et payer ») ;
 *   - ouvrir l'espace « Mon compte ».
 * Jamais pour afficher un billet : à l'embarcadère, le QR doit s'ouvrir tout
 * de suite, même si la reconnaissance échoue (soleil, casquette…).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

const CLE = 'goree.biometrie.active';

export async function biometrieDisponible(): Promise<{ disponible: boolean; faceId: boolean }> {
  if (Platform.OS === 'web') return { disponible: false, faceId: false };
  try {
    const [materiel, enregistree, types] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(), LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync()]);
    return { disponible: materiel && enregistree,
      faceId: types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION) };
  } catch {
    return { disponible: false, faceId: false };
  }
}

export async function biometrieActivee(): Promise<boolean> {
  return (await AsyncStorage.getItem(CLE)) === 'oui';
}

export async function activerBiometrie(active: boolean): Promise<void> {
  await AsyncStorage.setItem(CLE, active ? 'oui' : 'non');
}

/** Demande Face ID si le visiteur l'a activé ; renvoie true si l'action peut continuer. */
export async function confirmerIdentite(raison: string, annuler = 'Annuler'): Promise<boolean> {
  if (!(await biometrieActivee()) || !(await biometrieDisponible()).disponible) return true;
  const r = await LocalAuthentication.authenticateAsync({ promptMessage: raison, cancelLabel: annuler,
    disableDeviceFallback: false });
  return r.success;
}

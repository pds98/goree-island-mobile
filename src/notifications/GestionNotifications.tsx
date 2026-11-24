/**
 * Branche les notifications push sur l'app (composant sans affichage, monté
 * une fois dans la racine) :
 *   - au lancement et à chaque changement de langue : met à jour l'inscription
 *     si l'autorisation est déjà accordée (les messages suivent la langue) ;
 *   - après un achat de billet : demande l'autorisation puis inscrit ;
 *   - toucher une notification de retard : ouvre le billet concerné, même si
 *     l'app était fermée.
 */
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { useT } from '@/i18n';
import { surNouveauxBillets } from '@/stockage/billets';
import { billetDeLaNotification, synchroniserPush } from './push';

/** Pas de notifications sur la version web (API indisponible dans le navigateur). */
export function GestionNotifications() {
  return Platform.OS === 'web' ? null : <GestionNotificationsNative />;
}

function GestionNotificationsNative() {
  const { langue } = useT();
  const derniereOuverte = useRef<string | null>(null);

  // Inscription silencieuse (aucune demande d'autorisation au lancement).
  useEffect(() => {
    void synchroniserPush(langue, false);
  }, [langue]);

  // Après un achat : moment idéal pour demander l'autorisation.
  useEffect(() => surNouveauxBillets(() => { void synchroniserPush(langue, true); }), [langue]);

  // Toucher une notification (app ouverte, en arrière-plan ou fermée).
  const derniere = Notifications.useLastNotificationResponse();
  useEffect(() => {
    const numero = billetDeLaNotification(derniere);
    const id = derniere?.notification.request.identifier ?? null;
    if (!numero || id === derniereOuverte.current) return;
    derniereOuverte.current = id;                       // n'ouvrir qu'une fois par notification
    router.push({ pathname: '/billet/[numero]', params: { numero } });
  }, [derniere]);

  return null;
}

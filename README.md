# Gorée Island — App visiteur (React Native + Expo)

Application mobile des visiteurs de l'île de Gorée, branchée sur l'API [`goree-island-backend`](https://github.com/pds98/goree-island-backend). Elle reprend les maquettes validées : style afro-contemporain, **bleu pour la chaloupe**, **terracotta pour l'île**.

Stack : **Expo SDK 57 · TypeScript · Expo Router · TanStack Query · expo-camera · expo-location · expo-audio**.

---

## Lancer l'app sur ton iPhone (Expo Go)

1. **Démarrer l'API** (dossier `goree-island-backend`) en l'ouvrant au réseau local, avec le mode démo d'identité :
   ```bash
   IDENTITE_DEMO=true uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```
2. **Trouver l'IP du Mac** : Réglages Système → Wi-Fi → Détails → Adresse IP (ex. `192.168.1.20`).
3. **Configurer l'app** :
   ```bash
   cp .env.example .env        # puis EXPO_PUBLIC_API_URL=http://192.168.1.20:8000
   npm install
   npx expo start
   ```
4. Sur l'iPhone, **même Wi-Fi que le Mac** : installe *Expo Go* depuis l'App Store, puis scanne le QR affiché dans le Terminal avec l'appareil photo.

> Pour avoir des horaires de chaloupe, crée des rotations via l'admin : `POST /api/v3/admin/rotations` dans Swagger (http://localhost:8000/docs, en-tête `X-Cle-Admin`).

Version web (pratique pour une démo) : `npx expo start --web`. Le backend n'active pas encore le CORS, il faut donc passer par un proxy de même origine ou l'ajouter côté API.

## Écrans

| Onglet / route | Rôle |
|---|---|
| `(onglets)/index` | Accueil : les deux parcours, prochain départ en direct, changement de langue FR/EN/WO |
| `(onglets)/chaloupe` | **Parcours 1** : trajet, jour, départ (retards affichés), passagers, nom + téléphone, paiement. Aucune pièce d'identité |
| `(onglets)/ile` | **Parcours 2** : national (vérification CNI) ou international, accompagnants, pack, puis accès aux services |
| `identite` | Photo de la CNI, puis selfie (caméra avant), puis numéro de CNI (saisi en **mode démo**, lu par OCR en production) |
| `(onglets)/billets` | Mes billets, chaloupe / site, **disponibles hors ligne**, tirer vers le bas pour actualiser |
| `billet/[numero]` | QR signé par coupon, alerte de retard, annonce du retour, report du billet d'entrée |
| `circuits` · `audio-guide` | Circuits, et audio-guide déclenché par GPS (mode démo : se placer virtuellement à une étape) |
| `packs` · `marketplace` | Packs, et réservation de guides, restaurants et hôtels en séquestre (pack Premium) |

## Choix techniques

- **Billets hors ligne** : enregistrés dans AsyncStorage après l'achat (`src/stockage/billets.ts`). Le QR est le jeton signé Ed25519 renvoyé par l'API. Il ne contient aucune donnée personnelle, il s'affiche donc sans réseau à l'embarcadère.
- **Heure de Dakar** : tous les horaires passent par `heureDakar()` / `dateDakar()` (UTC+0), quel que soit le fuseau du serveur.
- **Erreurs métier** : l'API renvoie `{code, message}`, et le message s'affiche tel quel dans un bandeau.
- **Accessibilité** : zones tactiles de 48 px au minimum, rôles et libellés ARIA sur les boutons et les QR, contraste AA.
- **Wolof** : premier jet dans `src/i18n`, **à faire relire par un locuteur natif**.

## Vérifications faites

- `npx tsc --noEmit` et `npx expo lint` : 0 erreur.
- Build web complet (`expo export --platform web`) : 16 routes.
- Parcours de bout en bout dans Chromium (390×844) contre l'API sur PostgreSQL : achat de la chaloupe (2 passagers, départ avec retard), puis billet QR aller et retour avec l'alerte de retard, puis achat de l'entrée internationale avec pack Premium, puis « Mes billets ». 0 erreur JavaScript, caisses cohérentes.
- **Non testé ici** : la caméra et le GPS sur un vrai téléphone. À faire avec Expo Go.

## Reste à faire

- Paiement réel : ouvrir `url_paiement` (Wave / Orange Money) quand `PAIEMENT_SIMULE=false`, puis attendre la confirmation.
- Prestataire biométrique (OCR + test du vivant) à la place du mode démo.
- Pistes audio réelles, coordonnées GPS relevées sur place, photos sous licence (les images actuelles sont générées par IA).
- Passes Apple Wallet / Google Wallet, notifications push de retard.

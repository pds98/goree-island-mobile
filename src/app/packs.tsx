/** Les trois packs (ajoutés au billet d'entrée du site, jamais à la chaloupe). */
import { router } from 'expo-router';
import { View } from 'react-native';

import type { NomPack } from '@/api/types';
import { IconeCoche } from '@/composants/icones';
import { Bouton, Ecran, EnTete, Etiquette, formaterFcfa, Frise, Texte, Titre } from '@/composants/ui';
import { couleurs } from '@/theme';

const PACKS: { niveau: NomPack; nom: string; prix: number; fond: string; texte: string;
  contenu: string[] }[] = [
  { niveau: 'DECOUVERTE', nom: 'Découverte', prix: 0, fond: couleurs.blanc, texte: couleurs.encre,
    contenu: ['Achat des billets', "Aperçu de l'histoire", 'Galerie photos'] },
  { niveau: 'ESSENTIEL', nom: 'Essentiel', prix: 2_000, fond: couleurs.ocean, texte: couleurs.blanc,
    contenu: ['Histoire complète', 'Audio-guide GPS en 5 langues', 'Carte hors ligne', 'Circuits'] },
  { niveau: 'PREMIUM', nom: 'Premium Téranga', prix: 5_000, fond: couleurs.bougainvillier,
    texte: couleurs.blanc, contenu: ['Tout Essentiel', 'Guides certifiés + chat',
      'Pré-commande restaurant', 'Hôtels et maisons d\'hôtes'] },
];

export default function Packs() {
  return (
    <Ecran>
      <EnTete titre="Enrichis ta visite" />
      <Texte>{"Les packs s'ajoutent au billet d'entrée du site. Prix provisoires."}</Texte>
      {PACKS.map((p) => (
        <View key={p.niveau} style={{ backgroundColor: p.fond, borderRadius: 22, overflow: 'hidden',
          borderWidth: p.niveau === 'DECOUVERTE' ? 1 : 0, borderColor: couleurs.bordure }}>
          {p.niveau === 'PREMIUM' ? <Frise /> : null}
          <View style={{ padding: 16, gap: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Titre taille={22} style={{ color: p.texte }}>{p.nom}</Titre>
              {p.niveau === 'PREMIUM' ? <Etiquette texte="LE PLUS COMPLET" incline /> : null}
            </View>
            {p.contenu.map((c) => (
              <View key={c} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <IconeCoche couleur={p.niveau === 'DECOUVERTE' ? couleurs.vert : couleurs.ocre} taille={16} />
                <Texte style={{ color: p.texte }}>{c}</Texte>
              </View>
            ))}
            <Bouton titre={`Choisir · ${p.prix ? formaterFcfa(p.prix) : 'Gratuit'}`}
              variante={p.niveau === 'DECOUVERTE' ? 'contour' : 'clair'}
              onPress={() => router.navigate({ pathname: '/ile', params: { pack: p.niveau } })} />
          </View>
        </View>
      ))}
      <Texte style={{ fontSize: 12, textAlign: 'center' }}>Wave · Orange Money · Carte bancaire</Texte>
    </Ecran>
  );
}

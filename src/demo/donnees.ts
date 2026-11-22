/**
 * DONNÉES DE DÉMONSTRATION — utilisées quand le backend ne répond pas.
 *
 * ⚠️ Tous les guides, restaurants et hôtels ci-dessous sont FICTIFS : noms,
 * tarifs, notes et menus sont inventés pour la démo. L'interface les marque
 * d'un badge « Démo ». À remplacer par les vrais partenaires (signés, licences
 * vérifiées) via le dashboard admin avant toute mise en production.
 *
 * Les textes historiques résument des faits établis ; ils restent à faire
 * valider par les historiens du site (Musée historique / IFAN) avant
 * publication. Coordonnées GPS APPROXIMATIVES, à relever sur le terrain.
 */
import type { Circuit, Partenaire } from '@/api/types';
import type { Langue } from '@/i18n';

/** Texte multilingue : le français est obligatoire, les autres retombent sur l'anglais puis le français. */
export type TexteMultilingue = { fr: string; en: string; es?: string; ar?: string; wo?: string };

export function traduire(texte: TexteMultilingue, langue: Langue): string {
  return texte[langue] ?? (langue === 'wo' ? texte.fr : texte.en) ?? texte.fr;
}

// ---------------------------------------------------------------------------------
//  LIEUX (étapes des circuits, de l'audio-guide et de la visite 3D)
// ---------------------------------------------------------------------------------

export type IdLieu = 'maison' | 'fort' | 'eglise' | 'mosquee' | 'castel' | 'artistes';

export type Lieu = {
  id: IdLieu;
  nom: TexteMultilingue;
  lat: number;
  lon: number;
  /** Lieu de mémoire : rappel de recueillement dans l'audio-guide. */
  memoriel?: boolean;
  /** Résumé court (fiche). */
  resume: TexteMultilingue;
  /** Narration lue par l'audio-guide (≈ 30 s). */
  narration: TexteMultilingue;
};

export const LIEUX: Record<IdLieu, Lieu> = {
  maison: {
    id: 'maison', memoriel: true, lat: 14.66711, lon: -17.39837,
    nom: { fr: 'Maison des Esclaves', en: 'House of Slaves', es: 'Casa de los Esclavos',
      ar: 'بيت العبيد', wo: 'Kër Jaam yi' },
    resume: {
      fr: 'Bâtie vers 1776, devenue musée en 1962. Symbole mondial de la mémoire de la traite.',
      en: 'Built around 1776, a museum since 1962. A worldwide symbol of the memory of the slave trade.',
      es: 'Construida hacia 1776, museo desde 1962. Símbolo mundial de la memoria de la trata.',
      ar: 'بُني حوالي عام 1776 وأصبح متحفًا منذ 1962. رمز عالمي لذاكرة تجارة الرقيق.',
    },
    narration: {
      fr: "Tu te trouves devant la Maison des Esclaves, construite vers 1776. Au rez-de-chaussée, des cellules étroites ; à l'étage, les appartements des marchands. Au bout du couloir s'ouvre la porte du voyage sans retour, face à l'océan. Devenue musée en 1962, elle est aujourd'hui un lieu de mémoire visité par des chefs d'État du monde entier. Prends un moment de silence.",
      en: 'You are standing in front of the House of Slaves, built around 1776. On the ground floor, narrow cells; upstairs, the merchants\' quarters. At the end of the corridor opens the door of no return, facing the ocean. A museum since 1962, it is now a place of remembrance visited by heads of state from around the world. Take a moment of silence.',
      es: 'Estás frente a la Casa de los Esclavos, construida hacia 1776. En la planta baja, celdas estrechas; arriba, las viviendas de los comerciantes. Al final del pasillo se abre la puerta del viaje sin retorno, frente al océano. Museo desde 1962, hoy es un lugar de memoria visitado por jefes de Estado de todo el mundo. Tómate un momento de silencio.',
      ar: 'أنت الآن أمام بيت العبيد الذي بُني حوالي عام 1776. في الطابق الأرضي زنازين ضيقة، وفي الطابق العلوي مساكن التجار. وفي نهاية الممر يُفتح باب اللاعودة المطل على المحيط. أصبح متحفًا منذ عام 1962، وهو اليوم مكان للذاكرة يزوره رؤساء دول من العالم كله. خذ لحظة صمت.',
    },
  },
  fort: {
    id: 'fort', lat: 14.66568, lon: -17.39700,
    nom: { fr: "Fort d'Estrées · Musée historique", en: "Fort d'Estrées · History Museum",
      es: "Fuerte d'Estrées · Museo histórico", ar: 'حصن ديستري · المتحف التاريخي' },
    resume: {
      fr: 'Fort circulaire du XIXᵉ siècle, il abrite le Musée historique du Sénégal.',
      en: '19th-century circular fort housing the History Museum of Senegal.',
      es: 'Fuerte circular del siglo XIX que alberga el Museo Histórico de Senegal.',
      ar: 'حصن دائري من القرن التاسع عشر يضم المتحف التاريخي للسنغال.',
    },
    narration: {
      fr: "Voici le fort d'Estrées, construit au milieu du XIXᵉ siècle à la pointe nord de l'île. Sa forme circulaire servait à défendre la rade de Dakar. Il abrite aujourd'hui le Musée historique du Sénégal, qui retrace l'histoire du pays de la préhistoire à l'indépendance.",
      en: "This is Fort d'Estrées, built in the mid-19th century at the northern tip of the island. Its circular shape protected the harbour of Dakar. Today it houses the History Museum of Senegal, tracing the country's story from prehistory to independence.",
      es: "Este es el fuerte d'Estrées, construido a mediados del siglo XIX en la punta norte de la isla. Su forma circular defendía la rada de Dakar. Hoy alberga el Museo Histórico de Senegal, que recorre la historia del país desde la prehistoria hasta la independencia.",
      ar: 'هذا هو حصن ديستري، بُني في منتصف القرن التاسع عشر عند الطرف الشمالي للجزيرة. كان شكله الدائري يحمي مرسى داكار. ويضم اليوم المتحف التاريخي للسنغال الذي يروي تاريخ البلاد من عصور ما قبل التاريخ حتى الاستقلال.',
    },
  },
  eglise: {
    id: 'eglise', lat: 14.66650, lon: -17.39790,
    nom: { fr: 'Église Saint-Charles-Borromée', en: 'Saint Charles Borromeo Church',
      es: 'Iglesia de San Carlos Borromeo', ar: 'كنيسة القديس شارل بوروميو' },
    resume: {
      fr: "Église du XIXᵉ siècle au cœur du village, à deux pas de la mosquée.",
      en: '19th-century church in the heart of the village, a short walk from the mosque.',
      es: 'Iglesia del siglo XIX en el corazón del pueblo, a pocos pasos de la mezquita.',
      ar: 'كنيسة من القرن التاسع عشر في قلب القرية، على بعد خطوات من المسجد.',
    },
    narration: {
      fr: "L'église Saint-Charles-Borromée date du XIXᵉ siècle. Avec la mosquée toute proche, elle illustre la cohabitation paisible des religions, si chère au Sénégal.",
      en: 'Saint Charles Borromeo Church dates from the 19th century. Together with the nearby mosque, it shows the peaceful coexistence of faiths that Senegal holds dear.',
      es: 'La iglesia de San Carlos Borromeo data del siglo XIX. Junto a la mezquita cercana, ilustra la convivencia pacífica de las religiones, tan apreciada en Senegal.',
      ar: 'تعود كنيسة القديس شارل بوروميو إلى القرن التاسع عشر. ومع المسجد القريب منها، تجسد التعايش السلمي بين الأديان الذي يعتز به السنغال.',
    },
  },
  mosquee: {
    id: 'mosquee', lat: 14.66745, lon: -17.39725,
    nom: { fr: 'Mosquée de Gorée', en: 'Gorée Mosque', es: 'Mezquita de Gorea', ar: 'مسجد غوري',
      wo: 'Jumaa ju Goree' },
    resume: {
      fr: "L'une des plus anciennes mosquées en pierre du Sénégal, fin du XIXᵉ siècle.",
      en: 'One of the oldest stone mosques in Senegal, late 19th century.',
      es: 'Una de las mezquitas de piedra más antiguas de Senegal, finales del siglo XIX.',
      ar: 'من أقدم المساجد الحجرية في السنغال، أواخر القرن التاسع عشر.',
    },
    narration: {
      fr: "Cette mosquée, édifiée à la fin du XIXᵉ siècle, compte parmi les plus anciennes mosquées en pierre du pays. Merci de respecter les heures de prière et de te couvrir pour entrer.",
      en: 'This mosque, built in the late 19th century, is among the oldest stone mosques in the country. Please respect prayer times and dress modestly to enter.',
      es: 'Esta mezquita, construida a finales del siglo XIX, es una de las más antiguas de piedra del país. Respeta las horas de oración y cúbrete para entrar.',
      ar: 'بُني هذا المسجد في أواخر القرن التاسع عشر، وهو من أقدم المساجد الحجرية في البلاد. يُرجى احترام أوقات الصلاة وارتداء لباس محتشم للدخول.',
    },
  },
  castel: {
    id: 'castel', lat: 14.66470, lon: -17.39930,
    nom: { fr: 'Plateau du Castel', en: 'Castel Plateau', es: 'Meseta del Castel', ar: 'هضبة الكاستيل' },
    resume: {
      fr: "Point culminant de l'île : vue sur Dakar, canons de la Seconde Guerre mondiale.",
      en: 'Highest point of the island: views of Dakar, Second World War guns.',
      es: 'Punto más alto de la isla: vistas de Dakar, cañones de la Segunda Guerra Mundial.',
      ar: 'أعلى نقطة في الجزيرة: إطلالة على داكار ومدافع من الحرب العالمية الثانية.',
    },
    narration: {
      fr: "Bienvenue sur le Castel, le point le plus haut de Gorée. D'ici, tu vois toute la presqu'île du Cap-Vert et la ville de Dakar. Les énormes canons que tu aperçois datent de la Seconde Guerre mondiale. En contrebas, les artistes du village peignent avec le sable.",
      en: "Welcome to the Castel, the highest point of Gorée. From here you can see the whole Cap-Vert peninsula and the city of Dakar. The huge guns you can spot date from the Second World War. Below, the village artists paint with sand.",
      es: 'Bienvenido al Castel, el punto más alto de Gorea. Desde aquí se ve toda la península de Cabo Verde y la ciudad de Dakar. Los enormes cañones que ves datan de la Segunda Guerra Mundial. Más abajo, los artistas del pueblo pintan con arena.',
      ar: 'مرحبًا بك في الكاستيل، أعلى نقطة في غوري. من هنا ترى شبه جزيرة الرأس الأخضر كلها ومدينة داكار. المدافع الضخمة التي تراها تعود إلى الحرب العالمية الثانية. وفي الأسفل، يرسم فنانو القرية بالرمل.',
    },
  },
  artistes: {
    id: 'artistes', lat: 14.66520, lon: -17.39880,
    nom: { fr: 'Village des artistes', en: "Artists' village", es: 'Pueblo de los artistas',
      ar: 'قرية الفنانين' },
    resume: {
      fr: 'Ateliers de peinture sur sable, sculpture et verre peint (sous-verre).',
      en: 'Workshops for sand painting, sculpture and reverse glass painting.',
      es: 'Talleres de pintura con arena, escultura y pintura bajo vidrio.',
      ar: 'ورش للرسم بالرمل والنحت والرسم على الزجاج.',
    },
    narration: {
      fr: "Les artistes de Gorée perpétuent des techniques uniques : tableaux en sable coloré, sous-verres peints à l'envers, sculptures. Prends le temps d'échanger avec eux : chaque œuvre raconte une histoire de l'île.",
      en: 'The artists of Gorée keep unique techniques alive: coloured sand paintings, reverse glass paintings, sculptures. Take time to chat with them: each piece tells a story of the island.',
      es: 'Los artistas de Gorea mantienen técnicas únicas: cuadros de arena de colores, pinturas bajo vidrio, esculturas. Tómate tiempo para hablar con ellos: cada obra cuenta una historia de la isla.',
      ar: 'يحافظ فنانو غوري على تقنيات فريدة: لوحات من الرمل الملون، ورسوم على الزجاج من الخلف، ومنحوتات. خذ وقتك للحديث معهم، فكل عمل يروي حكاية من الجزيرة.',
    },
  },
};

/** Ordre de visite proposé (sert aussi de trajet à la caméra de la visite 3D). */
export const ORDRE_VISITE: IdLieu[] = ['fort', 'mosquee', 'maison', 'eglise', 'artistes', 'castel'];

// ---------------------------------------------------------------------------------
//  CIRCUITS
// ---------------------------------------------------------------------------------

const etape = (id: IdLieu) => ({ nom: LIEUX[id].nom.fr, lat: LIEUX[id].lat, lon: LIEUX[id].lon });

export const DEMO_CIRCUITS: Circuit[] = [
  { id: 'demo-memoire', nom: 'Sur les pas de la mémoire', theme: 'Mémoire', duree_min: 90,
    ton_memoriel: true, etapes: [etape('maison'), etape('fort')] },
  { id: 'demo-castel', nom: 'Montée au Castel', theme: 'Panorama', duree_min: 60,
    ton_memoriel: false, etapes: [etape('artistes'), etape('castel')] },
  { id: 'demo-culture', nom: 'Foi, art et patrimoine', theme: 'Culture', duree_min: 75,
    ton_memoriel: false, etapes: [etape('eglise'), etape('mosquee'), etape('artistes')] },
];

/** Retrouve un lieu à partir du nom d'étape renvoyé par l'API (en français). */
export const lieuParNom = (nom: string) => Object.values(LIEUX).find((l) => l.nom.fr === nom);

// ---------------------------------------------------------------------------------
//  PARTENAIRES (fictifs)
// ---------------------------------------------------------------------------------

export const DEMO_PARTENAIRES: Partenaire[] = [
  // Guides
  { id: 'demo-g1', type: 'GUIDE', nom: 'Moussa Fall', langues: 'Français · English · Wolof',
    licence_verifiee: true, demo: true, note: 4.9, avis: 128, tarif: '15 000 FCFA · 2 h',
    description: 'Né sur l\'île, spécialiste du circuit Mémoire.' },
  { id: 'demo-g2', type: 'GUIDE', nom: 'Aïssatou Ndiaye', langues: 'Français · Español · Wolof',
    licence_verifiee: true, demo: true, note: 4.8, avis: 94, tarif: '15 000 FCFA · 2 h',
    description: 'Historienne de l\'art, visites du village des artistes.' },
  { id: 'demo-g3', type: 'GUIDE', nom: 'Ibrahima Sarr', langues: 'Français · العربية · English',
    licence_verifiee: true, demo: true, note: 4.7, avis: 61, tarif: '20 000 FCFA · 3 h',
    description: 'Tour complet de l\'île, du fort d\'Estrées au Castel.' },
  // Restaurants
  { id: 'demo-r1', type: 'RESTAURANT', nom: 'Chez Yaay Fatou', langues: null, licence_verifiee: false,
    demo: true, note: 4.8, avis: 210, tarif: 'Thiéboudienne 4 000 · Yassa 3 500 FCFA',
    description: 'Cuisine sénégalaise familiale, terrasse ombragée.' },
  { id: 'demo-r2', type: 'RESTAURANT', nom: 'Le Ponton Téranga', langues: null, licence_verifiee: false,
    demo: true, note: 4.6, avis: 156, tarif: 'Poisson grillé 5 000 · Langouste 12 000 FCFA',
    description: 'Poissons du jour face à l\'embarcadère.' },
  { id: 'demo-r3', type: 'RESTAURANT', nom: 'Café du Castel', langues: null, licence_verifiee: false,
    demo: true, note: 4.5, avis: 88, tarif: 'Café Touba 500 · Bissap 1 000 FCFA',
    description: 'Pause avec vue, jus locaux et beignets.' },
  { id: 'demo-r4', type: 'RESTAURANT', nom: 'La Terrasse des Bougainvilliers', langues: null,
    licence_verifiee: false, demo: true, note: 4.7, avis: 132, tarif: 'Menu du jour 7 500 FCFA',
    description: 'Cuisine fusion sénégalaise, coucher de soleil.' },
  // Hôtels
  { id: 'demo-h1', type: 'HOTEL', nom: 'Maison d\'hôtes Les Signares', langues: null,
    licence_verifiee: false, demo: true, note: 4.8, avis: 73, tarif: '35 000 FCFA / nuit',
    description: 'Demeure coloniale restaurée, 6 chambres, petit-déjeuner inclus.' },
  { id: 'demo-h2', type: 'HOTEL', nom: 'Auberge du Fort', langues: null, licence_verifiee: false,
    demo: true, note: 4.4, avis: 112, tarif: '25 000 FCFA / nuit',
    description: 'Simple et chaleureuse, à 2 minutes de l\'embarcadère.' },
  { id: 'demo-h3', type: 'HOTEL', nom: 'Villa Océane', langues: null, licence_verifiee: false,
    demo: true, note: 4.9, avis: 45, tarif: '55 000 FCFA / nuit',
    description: 'Suites avec vue mer, rooftop et transfert depuis Dakar.' },
];

/**
 * À FAIRE À GORÉE — activités proposées une fois descendu de la chaloupe.
 *
 * Sources des informations pratiques (vérifiées en novembre 2026) :
 *   - Musée historique du Sénégal (Fort d'Estrées) : ouvert du mardi au
 *     dimanche, 10 h 30 – 16 h 30, fermé le lundi (Routard).
 *   - Maison des Esclaves : fermée le lundi selon les guides de l'île
 *     (Le Soleil) — à confirmer auprès du musée.
 *   - Musée de la Mer, Castel, plage, restaurants de bord de mer :
 *     Au Sénégal, Routard. Horaires non publiés : « à vérifier sur place ».
 *   - Le Musée de la Femme Henriette-Bathily a quitté Gorée en 2015 pour la
 *     corniche de Dakar : il n'est volontairement PAS listé ici.
 *
 * Pas de prix ici : les tarifs changent et doivent venir du backend/admin.
 * Pour ajouter une activité : une entrée dans ACTIVITES (texte FR obligatoire).
 */
import type { IdLieu, TexteMultilingue } from './donnees';

export type ThemeActivite = 'memoire' | 'culture' | 'panorama' | 'plage' | 'gourmand' | 'artisanat' | 'balade';

/** Ce que propose le bouton principal de la fiche. */
export type ActionActivite =
  | { type: 'audio' }                     // écouter la narration (audio-guide)
  | { type: 'guide' }                     // réserver un guide partenaire
  | { type: 'restaurants' }               // restaurants partenaires
  | { type: 'moments' }                   // appareil photo Gorée Moments
  | { type: 'chaloupe' };                 // horaires (ne pas rater la dernière chaloupe)

export type Activite = {
  id: string;
  theme: ThemeActivite;
  titre: TexteMultilingue;
  resume: TexteMultilingue;
  /** Infos pratiques vérifiées (horaires…) ; absent = « à vérifier sur place ». */
  pratique?: TexteMultilingue;
  dureeMin: number;
  moment: TexteMultilingue;
  lieu?: IdLieu;
  /** Fermé le lundi (affiché en alerte les lundis). */
  fermeLundi?: boolean;
  action: ActionActivite;
};

export const ACTIVITES: Activite[] = [
  {
    id: 'maison-esclaves', theme: 'memoire', lieu: 'maison', dureeMin: 45, fermeLundi: true, action: { type: 'audio' },
    titre: { fr: 'Maison des Esclaves', en: 'House of Slaves', es: 'Casa de los Esclavos', ar: 'بيت العبيد' },
    resume: {
      fr: 'Lieu de mémoire de la traite atlantique et sa Porte du voyage sans retour. Visite en silence et avec respect.',
      en: 'Memorial to the Atlantic slave trade and its Door of No Return. Visit in silence and with respect.',
      es: 'Lugar de memoria de la trata atlántica y su Puerta del viaje sin retorno. Visita en silencio y con respeto.',
      ar: 'مكان لذاكرة تجارة الرقيق عبر الأطلسي وباب اللاعودة. زيارة بصمت واحترام.',
    },
    pratique: {
      fr: 'Généralement fermée le lundi : à confirmer à l’entrée. Photos parfois interdites à l’intérieur.',
      en: 'Usually closed on Mondays: please check at the entrance. Photos are sometimes not allowed inside.',
      es: 'Normalmente cerrada los lunes: confírmalo en la entrada. A veces no se permiten fotos dentro.',
      ar: 'مغلق عادة يوم الاثنين: تحقق عند المدخل. التصوير ممنوع أحيانًا في الداخل.',
    },
    moment: { fr: 'Le matin, plus calme', en: 'Morning, quieter', es: 'Por la mañana, más tranquilo', ar: 'صباحًا، أكثر هدوءًا' },
  },
  {
    id: 'musee-historique', theme: 'culture', lieu: 'fort', dureeMin: 60, fermeLundi: true, action: { type: 'audio' },
    titre: { fr: 'Musée historique du Sénégal', en: 'Historical Museum of Senegal', es: 'Museo Histórico de Senegal', ar: 'المتحف التاريخي للسنغال' },
    resume: {
      fr: 'Dans le Fort d’Estrées, à la pointe nord : l’histoire du Sénégal, de la préhistoire à l’indépendance.',
      en: 'Inside Fort d’Estrées, at the northern tip: the history of Senegal from prehistory to independence.',
      es: 'En el Fuerte de Estrées, en la punta norte: la historia de Senegal desde la prehistoria hasta la independencia.',
      ar: 'داخل حصن ديستري في الطرف الشمالي: تاريخ السنغال من عصور ما قبل التاريخ حتى الاستقلال.',
    },
    pratique: {
      fr: 'Du mardi au dimanche, 10 h 30 – 16 h 30. Fermé le lundi.',
      en: 'Tuesday to Sunday, 10:30 am – 4:30 pm. Closed on Mondays.',
      es: 'De martes a domingo, 10:30 – 16:30. Cerrado los lunes.',
      ar: 'من الثلاثاء إلى الأحد، 10:30 – 16:30. مغلق يوم الاثنين.',
    },
    moment: { fr: 'En fin de matinée', en: 'Late morning', es: 'A media mañana', ar: 'آخر الصباح' },
  },
  {
    id: 'castel', theme: 'panorama', lieu: 'castel', dureeMin: 60, action: { type: 'moments' },
    titre: { fr: 'Monter au Castel', en: 'Climb up to the Castel', es: 'Subir al Castel', ar: 'الصعود إلى الكاستل' },
    resume: {
      fr: 'Le point le plus haut de l’île : canons historiques et vue sur Dakar et l’Atlantique.',
      en: 'The highest point of the island: historic cannons and a view over Dakar and the Atlantic.',
      es: 'El punto más alto de la isla: cañones históricos y vista sobre Dakar y el Atlántico.',
      ar: 'أعلى نقطة في الجزيرة: مدافع تاريخية وإطلالة على داكار والمحيط الأطلسي.',
    },
    moment: { fr: 'Fin d’après-midi', en: 'Late afternoon', es: 'Al final de la tarde', ar: 'آخر النهار' },
  },
  {
    id: 'ruelles', theme: 'balade', dureeMin: 45, action: { type: 'moments' },
    titre: { fr: 'Flâner dans les ruelles', en: 'Wander the lanes', es: 'Pasear por las callejuelas', ar: 'التجول في الأزقة' },
    resume: {
      fr: 'Une île sans voitures : façades colorées, bougainvilliers et maisons coloniales. Les plus belles photos de Gorée.',
      en: 'A car-free island: colourful façades, bougainvillea and colonial houses. Gorée’s most beautiful photos.',
      es: 'Una isla sin coches: fachadas de colores, buganvillas y casas coloniales. Las fotos más bonitas de Gorée.',
      ar: 'جزيرة بلا سيارات: واجهات ملونة وجهنمية وبيوت استعمارية. أجمل صور غوري.',
    },
    moment: { fr: 'Le matin, lumière douce', en: 'Morning, soft light', es: 'Por la mañana, luz suave', ar: 'صباحًا، ضوء ناعم' },
  },
  {
    id: 'artistes', theme: 'artisanat', lieu: 'artistes', dureeMin: 40, action: { type: 'audio' },
    titre: { fr: 'Ateliers d’artistes', en: 'Artists’ workshops', es: 'Talleres de artistas', ar: 'ورش الفنانين' },
    resume: {
      fr: 'Tableaux de sable coloré, sous-verres et sculptures : échange avec les artistes, souvenir authentique.',
      en: 'Coloured sand paintings, reverse glass paintings and sculptures: meet the artists, take home an authentic souvenir.',
      es: 'Cuadros de arena de colores, pinturas bajo vidrio y esculturas: conoce a los artistas y llévate un recuerdo auténtico.',
      ar: 'لوحات الرمل الملون والرسم على الزجاج والمنحوتات: تحدث مع الفنانين واحصل على تذكار أصيل.',
    },
    moment: { fr: 'À tout moment', en: 'Any time', es: 'En cualquier momento', ar: 'في أي وقت' },
  },
  {
    id: 'musee-mer', theme: 'culture', dureeMin: 40, action: { type: 'guide' },
    titre: { fr: 'Musée de la Mer', en: 'Sea Museum', es: 'Museo del Mar', ar: 'متحف البحر' },
    resume: {
      fr: 'La faune et la flore marines des côtes sénégalaises, idéal en famille.',
      en: 'Marine life of the Senegalese coast, great for families.',
      es: 'La fauna y flora marinas de la costa senegalesa, ideal en familia.',
      ar: 'الحياة البحرية على السواحل السنغالية، مثالي للعائلات.',
    },
    moment: { fr: 'Aux heures chaudes', en: 'During the hot hours', es: 'En las horas de calor', ar: 'في ساعات الحر' },
  },
  {
    id: 'plage', theme: 'plage', dureeMin: 90, action: { type: 'restaurants' },
    titre: { fr: 'Plage et baignade', en: 'Beach and swimming', es: 'Playa y baño', ar: 'الشاطئ والسباحة' },
    resume: {
      fr: 'La petite plage près de l’embarcadère : pirogues, eau calme et pause fraîcheur entre deux visites.',
      en: 'The small beach by the jetty: pirogues, calm water and a cool break between visits.',
      es: 'La pequeña playa junto al embarcadero: piraguas, agua tranquila y un descanso entre visitas.',
      ar: 'الشاطئ الصغير قرب الرصيف: قوارب ومياه هادئة واستراحة منعشة بين الزيارات.',
    },
    pratique: {
      fr: 'Très fréquentée pendant les vacances. Pense à la crème solaire et à l’eau.',
      en: 'Very busy during holidays. Bring sunscreen and water.',
      es: 'Muy concurrida en vacaciones. Lleva crema solar y agua.',
      ar: 'مزدحم جدًا في العطل. لا تنسَ واقي الشمس والماء.',
    },
    moment: { fr: 'Milieu de journée', en: 'Midday', es: 'Al mediodía', ar: 'منتصف النهار' },
  },
  {
    id: 'dejeuner', theme: 'gourmand', dureeMin: 75, action: { type: 'restaurants' },
    titre: { fr: 'Déjeuner face à l’océan', en: 'Lunch by the ocean', es: 'Almuerzo frente al océano', ar: 'غداء أمام المحيط' },
    resume: {
      fr: 'Poisson grillé, fruits de mer, thiéboudienne et jus locaux (bissap, bouye) sur les terrasses de bord de mer.',
      en: 'Grilled fish, seafood, thieboudienne and local juices (bissap, bouye) on seaside terraces.',
      es: 'Pescado a la parrilla, marisco, thieboudienne y zumos locales (bissap, bouye) en terrazas junto al mar.',
      ar: 'سمك مشوي ومأكولات بحرية وتيبودجين وعصائر محلية (بيساب، بويه) على شرفات البحر.',
    },
    moment: { fr: 'Vers 13 h', en: 'Around 1 pm', es: 'Hacia las 13 h', ar: 'حوالي الواحدة ظهرًا' },
  },
  {
    id: 'coucher-soleil', theme: 'panorama', dureeMin: 30, action: { type: 'chaloupe' },
    titre: { fr: 'Coucher de soleil', en: 'Sunset', es: 'Puesta de sol', ar: 'غروب الشمس' },
    resume: {
      fr: 'Les façades se dorent et Dakar s’illumine en face. Garde un œil sur l’heure de la dernière chaloupe.',
      en: 'The façades turn golden and Dakar lights up across the bay. Keep an eye on the last ferry time.',
      es: 'Las fachadas se doran y Dakar se ilumina enfrente. Vigila la hora del último ferry.',
      ar: 'تتلون الواجهات بالذهبي وتضيء داكار في المقابل. انتبه لموعد آخر قارب.',
    },
    moment: { fr: 'Au crépuscule', en: 'At dusk', es: 'Al atardecer', ar: 'عند الغسق' },
  },
];

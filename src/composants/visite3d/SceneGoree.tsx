/**
 * Scène 3D STYLISÉE de l'île de Gorée (low-poly, style afro-contemporain).
 *
 * Tout est généré par le code — aucun modèle 3D à télécharger :
 *   - océan animé (vagues calculées à chaque image) ;
 *   - île extrudée, colline du Castel au sud ;
 *   - ~70 maisons colorées et ~30 palmiers en « instanced mesh » (1 seul
 *     appel de dessin par famille : fluide même sur un téléphone moyen) ;
 *   - lieux phares : fort d'Estrées, mosquée, Maison des Esclaves, église,
 *     village des artistes, Castel et ses canons, embarcadère + chaloupe ;
 *   - une balise flottante au-dessus de chaque étape de la visite.
 *
 * Disposition NON à l'échelle : on privilégie la lisibilité.
 * Axes : x = est, z = sud, y = haut. 1 unité ≈ 25 m.
 */
import { useLayoutEffect, useMemo, useRef, type MutableRefObject } from 'react';

// ⚠️ Canvas3D AVANT three : il installe le correctif process.emitWarning.
// eslint-disable-next-line import/order
import { useFrame, useThree } from './Canvas3D';
// eslint-disable-next-line import/order
import * as THREE from 'three';

import type { IdLieu } from '@/demo/donnees';

// --- Palette (reprise du thème de l'app) ------------------------------------------
const C = {
  mer: '#1FA3B8', merProfonde: '#0F5E7A', sable: '#E9CF9B', roche: '#6B5A4A', herbe: '#7FA65A',
  ocre: '#F4B41A', terracotta: '#C4401F', rose: '#D9577C', jaune: '#F2D16B', blanc: '#FBF4E8',
  bleu: '#17408B', toit: '#9C3116', tronc: '#7A5636', palme: '#2E7D4F', ciel: '#F7C9A0',
};

// --- Géométrie de l'île -----------------------------------------------------------

/** Contour de l'île vu du dessus (x, z). Nord = z négatif. */
const CONTOUR: [number, number][] = [
  [0, -10.2], [1.9, -9.4], [3.1, -6.6], [3.5, -2.5], [3.2, 1.5], [2.8, 5.5], [2.0, 8.4], [0.2, 9.6],
  [-1.8, 9.0], [-2.9, 6.4], [-3.3, 2.4], [-3.5, -1.8], [-3.0, -6.0], [-1.7, -9.2],
];

/** Demi-largeur approximative de l'île à la latitude z (pour placer les maisons). */
function demiLargeur(z: number): number {
  return Math.max(0, 3.2 - Math.abs(z) * 0.03 - (z < -7 ? (-7 - z) * 0.8 : 0) - (z > 6 ? (z - 6) * 0.7 : 0));
}

/** Position (x, z) et hauteur du sol de chaque lieu phare dans la scène. */
export const POSITIONS: Record<IdLieu, { x: number; z: number; y: number }> = {
  fort: { x: 0.4, z: -8.6, y: 0.6 },
  mosquee: { x: 1.6, z: -5.2, y: 0.6 },
  maison: { x: -2.4, z: -1.8, y: 0.6 },
  eglise: { x: 0.9, z: -1.2, y: 0.6 },
  artistes: { x: -1.0, z: 3.6, y: 0.75 },
  castel: { x: 0.1, z: 6.3, y: 2.1 },
};

/** Point de vue de la caméra pour chaque étape : position + point regardé. */
export const VUES: Record<IdLieu, { pos: [number, number, number]; cible: [number, number, number] }> = {
  fort: { pos: [6, 5, -15], cible: [0.4, 0.8, -8.6] },
  mosquee: { pos: [8, 4.5, -8], cible: [1.6, 1.2, -5.2] },
  maison: { pos: [-9, 3.2, -3.5], cible: [-2.4, 1, -1.8] },
  eglise: { pos: [6.5, 4, 1.5], cible: [0.9, 1.2, -1.2] },
  artistes: { pos: [-6.5, 4.5, 6.5], cible: [-1, 1, 3.6] },
  castel: { pos: [5, 7, 13], cible: [0.1, 2.4, 6.3] },
};

/** Générateur pseudo-aléatoire déterministe : la même île à chaque ouverture. */
function aleatoire(graine: number) {
  let s = graine;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// --- Océan ------------------------------------------------------------------------

function Ocean() {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(160, 160, 90, 90);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);
  const base = useMemo(() => Float32Array.from(geo.attributes.position.array as Float32Array), [geo]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3];
      const z = base[i * 3 + 2];
      // Trois houles superposées → vagues irrégulières, crédibles en low-poly.
      const y = Math.sin(x * 0.35 + t * 1.1) * 0.12 + Math.cos(z * 0.28 + t * 0.8) * 0.1
        + Math.sin((x + z) * 0.9 + t * 1.9) * 0.04;
      pos.setY(i, y);
    }
    pos.needsUpdate = true;
  });

  return (
    <mesh geometry={geo} position={[0, 0, 0]} receiveShadow>
      <meshStandardMaterial color={C.mer} flatShading roughness={0.35} metalness={0.1} />
    </mesh>
  );
}

/** Écume autour de l'île : anneau clair qui « respire ». */
function Ecume() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.scale.setScalar(1.06 + Math.sin(clock.elapsedTime * 1.4) * 0.015);
  });
  const forme = useMemo(() => {
    const s = new THREE.Shape(CONTOUR.map(([x, z]) => new THREE.Vector2(x * 1.08, -z * 1.04)));
    return new THREE.ShapeGeometry(s);
  }, []);
  return (
    <mesh ref={ref} geometry={forme} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.16, 0]}>
      <meshBasicMaterial color="#E8FBFF" transparent opacity={0.55} />
    </mesh>
  );
}

// --- Île et relief ----------------------------------------------------------------

function Ile() {
  const geo = useMemo(() => {
    const s = new THREE.Shape(CONTOUR.map(([x, z]) => new THREE.Vector2(x, -z)));
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.8, bevelEnabled: true, bevelSize: 0.25,
      bevelThickness: 0.2, bevelSegments: 1, curveSegments: 4 });
    g.rotateX(-Math.PI / 2);
    g.translate(0, -0.2, 0);
    return g;
  }, []);
  return (
    <group>
      <mesh geometry={geo} castShadow receiveShadow>
        <meshStandardMaterial color={C.sable} flatShading roughness={0.9} />
      </mesh>
      {/* Colline du Castel (sud) */}
      <mesh position={[0, 0.5, 6.4]} scale={[2.6, 1.6, 2.6]} castShadow receiveShadow>
        <sphereGeometry args={[1, 9, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={C.herbe} flatShading roughness={1} />
      </mesh>
      {/* Falaises rocheuses autour du Castel */}
      {[[-2.6, 7.2], [2.4, 7.4], [1.6, 8.8], [-1.4, 9.1], [2.9, 5.2]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.3, z]} rotation={[0, i, 0]} castShadow>
          <dodecahedronGeometry args={[0.7 + (i % 2) * 0.3, 0]} />
          <meshStandardMaterial color={C.roche} flatShading />
        </mesh>
      ))}
    </group>
  );
}

// --- Maisons colorées (instanced) -------------------------------------------------

function Maisons() {
  const COULEURS = [C.ocre, C.terracotta, C.rose, C.jaune, C.blanc, C.ocre, C.blanc];
  const maisons = useMemo(() => {
    const rnd = aleatoire(42);
    const liste: { x: number; z: number; l: number; p: number; h: number; r: number; c: string }[] = [];
    let essais = 0;
    while (liste.length < 72 && essais++ < 2000) {
      const z = -8.5 + rnd() * 11.5;                      // village : moitié nord
      const w = demiLargeur(z) - 0.6;
      const x = (rnd() * 2 - 1) * w;
      // On laisse de la place autour des lieux phares et des autres maisons.
      const tropPres = Object.values(POSITIONS).some((p) => Math.hypot(p.x - x, p.z - z) < 1.15)
        || liste.some((m) => Math.hypot(m.x - x, m.z - z) < 0.62);
      if (tropPres) continue;
      liste.push({ x, z, l: 0.45 + rnd() * 0.3, p: 0.45 + rnd() * 0.3, h: 0.35 + rnd() * 0.4,
        r: Math.round(rnd() * 4) * (Math.PI / 2) + (rnd() - 0.5) * 0.2, c: COULEURS[Math.floor(rnd() * COULEURS.length)] });
    }
    return liste;
  }, []);

  const murs = useRef<THREE.InstancedMesh>(null);
  const toits = useRef<THREE.InstancedMesh>(null);

  // Couleurs par instance, fournies DÈS la création du mesh : sinon le shader
  // est compilé sans la couleur d'instance et toutes les maisons sortent beige.
  const couleurs = useMemo(() => {
    const c = new THREE.Color();
    const m = new Float32Array(maisons.length * 3);
    const t = new Float32Array(maisons.length * 3);
    maisons.forEach((h, i) => {
      c.set(h.c).toArray(m, i * 3);
      c.set(i % 3 === 0 ? C.toit : '#E7D7BC').toArray(t, i * 3);
    });
    return { murs: m, toits: t };
  }, [maisons]);

  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    maisons.forEach((h, i) => {
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), h.r);
      m.compose(new THREE.Vector3(h.x, 0.6 + h.h / 2, h.z), q, new THREE.Vector3(h.l, h.h, h.p));
      murs.current?.setMatrixAt(i, m);
      // Toit plat ocre-brun façon terrasse, légèrement débordant.
      m.compose(new THREE.Vector3(h.x, 0.6 + h.h + 0.04, h.z), q, new THREE.Vector3(h.l + 0.08, 0.08, h.p + 0.08));
      toits.current?.setMatrixAt(i, m);
    });
    [murs, toits].forEach((r) => { if (r.current) r.current.instanceMatrix.needsUpdate = true; });
  }, [maisons]);

  return (
    <group>
      <instancedMesh ref={murs} args={[undefined, undefined, maisons.length]} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]}>
          <instancedBufferAttribute attach="attributes-color" args={[couleurs.murs, 3]} />
        </boxGeometry>
        <meshStandardMaterial vertexColors flatShading roughness={0.8} />
      </instancedMesh>
      <instancedMesh ref={toits} args={[undefined, undefined, maisons.length]} castShadow>
        <boxGeometry args={[1, 1, 1]}>
          <instancedBufferAttribute attach="attributes-color" args={[couleurs.toits, 3]} />
        </boxGeometry>
        <meshStandardMaterial vertexColors flatShading roughness={0.9} />
      </instancedMesh>
    </group>
  );
}

// --- Palmiers (instanced) ---------------------------------------------------------

function Palmiers() {
  const arbres = useMemo(() => {
    const rnd = aleatoire(7);
    const liste: { x: number; z: number; h: number; a: number }[] = [];
    let essais = 0;
    while (liste.length < 30 && essais++ < 1500) {
      const z = -9 + rnd() * 17;
      const w = demiLargeur(z) - 0.3;
      // Surtout sur le pourtour (bord de mer)
      const x = (rnd() < 0.5 ? -1 : 1) * w * (0.7 + rnd() * 0.3);
      if (Object.values(POSITIONS).some((p) => Math.hypot(p.x - x, p.z - z) < 1)) continue;
      liste.push({ x, z, h: 0.9 + rnd() * 0.6, a: rnd() * Math.PI * 2 });
    }
    return liste;
  }, []);
  const troncs = useRef<THREE.InstancedMesh>(null);
  const palmes = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    arbres.forEach((a, i) => {
      q.setFromEuler(new THREE.Euler(0.12 * Math.cos(a.a), a.a, 0.12 * Math.sin(a.a)));
      m.compose(new THREE.Vector3(a.x, 0.6 + a.h / 2, a.z), q, new THREE.Vector3(0.07, a.h, 0.07));
      troncs.current?.setMatrixAt(i, m);
      m.compose(new THREE.Vector3(a.x, 0.6 + a.h + 0.05, a.z), q, new THREE.Vector3(0.55, 0.22, 0.55));
      palmes.current?.setMatrixAt(i, m);
    });
    if (troncs.current) troncs.current.instanceMatrix.needsUpdate = true;
    if (palmes.current) palmes.current.instanceMatrix.needsUpdate = true;
  }, [arbres]);

  return (
    <group>
      <instancedMesh ref={troncs} args={[undefined, undefined, arbres.length]} castShadow>
        <cylinderGeometry args={[0.6, 1, 1, 5]} />
        <meshStandardMaterial color={C.tronc} flatShading />
      </instancedMesh>
      <instancedMesh ref={palmes} args={[undefined, undefined, arbres.length]} castShadow>
        <coneGeometry args={[1, 1, 7]} />
        <meshStandardMaterial color={C.palme} flatShading />
      </instancedMesh>
    </group>
  );
}

// --- Lieux phares -----------------------------------------------------------------

function Fort() {
  const { x, z, y } = POSITIONS.fort;
  return (
    <group position={[x, y, z]}>
      <mesh castShadow receiveShadow position={[0, 0.35, 0]}>
        <cylinderGeometry args={[1.05, 1.15, 0.7, 14, 1, true]} />
        <meshStandardMaterial color="#CDB89A" flatShading side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <cylinderGeometry args={[1.0, 1.0, 0.1, 14]} />
        <meshStandardMaterial color="#B9A27E" flatShading />
      </mesh>
      {/* Créneaux */}
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 1.08, 0.78, Math.sin(a) * 1.08]} rotation={[0, -a, 0]} castShadow>
            <boxGeometry args={[0.18, 0.16, 0.14]} />
            <meshStandardMaterial color="#CDB89A" flatShading />
          </mesh>
        );
      })}
    </group>
  );
}

function Mosquee() {
  const { x, z, y } = POSITIONS.mosquee;
  return (
    <group position={[x, y, z]}>
      <mesh castShadow position={[0, 0.3, 0]}><boxGeometry args={[0.9, 0.6, 0.8]} />
        <meshStandardMaterial color={C.blanc} flatShading /></mesh>
      <mesh castShadow position={[0, 0.65, 0]}><sphereGeometry args={[0.3, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#2E7D4F" flatShading /></mesh>
      <mesh castShadow position={[0.55, 0.75, 0.3]}><cylinderGeometry args={[0.09, 0.11, 1.5, 8]} />
        <meshStandardMaterial color={C.blanc} flatShading /></mesh>
      <mesh castShadow position={[0.55, 1.6, 0.3]}><coneGeometry args={[0.12, 0.25, 8]} />
        <meshStandardMaterial color="#2E7D4F" flatShading /></mesh>
    </group>
  );
}

function MaisonEsclaves() {
  const { x, z, y } = POSITIONS.maison;
  return (
    <group position={[x, y, z]} rotation={[0, Math.PI / 2, 0]}>
      {/* Corps rose-ocre à étage, double escalier en fer à cheval */}
      <mesh castShadow position={[0, 0.45, 0]}><boxGeometry args={[1.3, 0.9, 0.8]} />
        <meshStandardMaterial color="#C9705A" flatShading /></mesh>
      <mesh castShadow position={[0, 0.94, 0]}><boxGeometry args={[1.4, 0.08, 0.9]} />
        <meshStandardMaterial color="#8E4A3A" flatShading /></mesh>
      {[-0.35, 0.35].map((dx) => (
        <mesh key={dx} castShadow position={[dx, 0.25, 0.5]} rotation={[0.6, 0, dx > 0 ? -0.3 : 0.3]}>
          <boxGeometry args={[0.22, 0.06, 0.6]} />
          <meshStandardMaterial color="#E9CF9B" flatShading />
        </mesh>
      ))}
      {/* « Porte du voyage sans retour », côté océan */}
      <mesh position={[0, 0.25, -0.41]}><boxGeometry args={[0.2, 0.35, 0.02]} />
        <meshBasicMaterial color="#1A1410" /></mesh>
    </group>
  );
}

function Eglise() {
  const { x, z, y } = POSITIONS.eglise;
  return (
    <group position={[x, y, z]}>
      <mesh castShadow position={[0, 0.35, 0]}><boxGeometry args={[0.6, 0.7, 1.1]} />
        <meshStandardMaterial color="#F2E6CF" flatShading /></mesh>
      <mesh castShadow position={[0, 0.82, 0]} rotation={[0, 0, Math.PI / 4]} scale={[0.43, 0.43, 1.1]}>
        <boxGeometry args={[1, 1, 1]} /><meshStandardMaterial color={C.toit} flatShading /></mesh>
      <mesh castShadow position={[0, 0.85, -0.55]}><boxGeometry args={[0.3, 1.0, 0.3]} />
        <meshStandardMaterial color="#F2E6CF" flatShading /></mesh>
      <mesh castShadow position={[0, 1.5, -0.55]}><coneGeometry args={[0.23, 0.4, 4]} />
        <meshStandardMaterial color={C.toit} flatShading /></mesh>
    </group>
  );
}

function Artistes() {
  const { x, z, y } = POSITIONS.artistes;
  const COUL = [C.ocre, C.rose, C.bleu, C.terracotta, C.jaune];
  return (
    <group position={[x, y, z]}>
      {COUL.map((c, i) => {
        const a = (i / COUL.length) * Math.PI * 2;
        return (
          <group key={i} position={[Math.cos(a) * 0.7, 0, Math.sin(a) * 0.7]}>
            <mesh castShadow position={[0, 0.18, 0]}><boxGeometry args={[0.32, 0.36, 0.32]} />
              <meshStandardMaterial color={c} flatShading /></mesh>
            <mesh castShadow position={[0, 0.48, 0]}><coneGeometry args={[0.28, 0.26, 4]} />
              <meshStandardMaterial color="#D9C08A" flatShading /></mesh>
          </group>
        );
      })}
    </group>
  );
}

function Castel() {
  const { x, z, y } = POSITIONS.castel;
  return (
    <group position={[x, y, z]}>
      {/* Plateforme et deux grands canons pointés vers le large */}
      <mesh receiveShadow position={[0, 0, 0]}><cylinderGeometry args={[0.9, 1.0, 0.15, 10]} />
        <meshStandardMaterial color="#9A9A8E" flatShading /></mesh>
      {[-0.35, 0.35].map((dx, i) => (
        <group key={dx} position={[dx, 0.2, 0]} rotation={[0, i ? -0.5 : 0.4, 0]}>
          <mesh castShadow><boxGeometry args={[0.3, 0.22, 0.4]} />
            <meshStandardMaterial color="#4B5148" flatShading /></mesh>
          <mesh castShadow position={[0, 0.1, 0.55]} rotation={[Math.PI / 2 - 0.15, 0, 0]}>
            <cylinderGeometry args={[0.05, 0.07, 0.9, 8]} />
            <meshStandardMaterial color="#3A3F38" flatShading metalness={0.4} /></mesh>
        </group>
      ))}
    </group>
  );
}

/** Embarcadère + chaloupe qui fait l'aller-retour vers Dakar (au nord-est). */
function EmbarcadereEtChaloupe() {
  const bateau = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!bateau.current) return;
    // Phase 0 → 1 → 0 : la chaloupe arrive, marque une pause au quai, repart.
    const t = (clock.elapsedTime % 40) / 40;
    const p = t < 0.4 ? t / 0.4 : t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4;
    const lisse = p * p * (3 - 2 * p);
    bateau.current.position.set(THREE.MathUtils.lerp(16, 3.9, lisse), 0.12 + Math.sin(clock.elapsedTime * 2) * 0.04,
      THREE.MathUtils.lerp(-24, -6.7, lisse));
    bateau.current.rotation.set(Math.sin(clock.elapsedTime * 1.6) * 0.04, t < 0.5 ? 0.6 : 0.6 + Math.PI, 0);
  });
  return (
    <group>
      <mesh castShadow receiveShadow position={[3.2, 0.35, -6.3]} rotation={[0, 0.6, 0]}>
        <boxGeometry args={[0.35, 0.12, 1.8]} /><meshStandardMaterial color="#8B6B4A" flatShading /></mesh>
      <group ref={bateau}>
        <mesh castShadow><boxGeometry args={[0.6, 0.25, 1.7]} />
          <meshStandardMaterial color={C.blanc} flatShading /></mesh>
        <mesh castShadow position={[0, 0.25, -0.1]}><boxGeometry args={[0.5, 0.3, 0.9]} />
          <meshStandardMaterial color={C.bleu} flatShading /></mesh>
        <mesh position={[0, 0.0, 0]}><boxGeometry args={[0.62, 0.06, 1.72]} />
          <meshStandardMaterial color={C.ocre} flatShading /></mesh>
      </group>
    </group>
  );
}

// --- Balises de la visite ---------------------------------------------------------

function Balises({ ordre, actif, onChoisir }: {
  ordre: IdLieu[]; actif: IdLieu | null; onChoisir: (id: IdLieu) => void;
}) {
  const refs = useRef<(THREE.Group | null)[]>([]);
  useFrame(({ clock }) => {
    refs.current.forEach((g, i) => {
      if (!g) return;
      const id = ordre[i];
      const estActif = id === actif;
      g.position.y = POSITIONS[id].y + 2 + Math.sin(clock.elapsedTime * 2 + i) * 0.15;
      const cible = estActif ? 1.5 : 1;
      g.scale.setScalar(THREE.MathUtils.lerp(g.scale.x, cible, 0.1));
      g.rotation.y = clock.elapsedTime * (estActif ? 1.5 : 0.6);
    });
  });
  return (
    <group>
      {ordre.map((id, i) => {
        const estActif = id === actif;
        const couleur = estActif ? C.terracotta : '#FFFFFF';
        return (
          <group key={id} ref={(g) => { refs.current[i] = g; }} position={[POSITIONS[id].x, POSITIONS[id].y + 2, POSITIONS[id].z]}
            onClick={(e) => { e.stopPropagation(); onChoisir(id); }}>
            <mesh><octahedronGeometry args={[0.28, 0]} />
              <meshStandardMaterial color={couleur} emissive={couleur} emissiveIntensity={estActif ? 0.6 : 0.25} flatShading /></mesh>
            <mesh position={[0, -0.55, 0]}><cylinderGeometry args={[0.015, 0.015, 0.8, 4]} />
              <meshBasicMaterial color={couleur} transparent opacity={0.6} /></mesh>
          </group>
        );
      })}
    </group>
  );
}

// --- Caméra -----------------------------------------------------------------------

export type ControleCamera = {
  /** 'visite' : la caméra vole vers l'étape active. 'libre' : orbite au doigt. */
  mode: 'visite' | 'libre';
  theta: number;   // angle horizontal (orbite libre)
  phi: number;     // angle vertical
  rayon: number;   // distance au centre
};

function Camera({ actif, controle }: { actif: IdLieu | null; controle: MutableRefObject<ControleCamera> }) {
  const { camera } = useThree();
  const regard = useRef(new THREE.Vector3(0, 0, 0));
  const posCible = useMemo(() => new THREE.Vector3(), []);
  const regardCible = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ clock }, dt) => {
    const c = controle.current;
    const t = clock.elapsedTime;
    if (c.mode === 'visite' && actif) {
      const v = VUES[actif];
      // Léger balancement « drone » autour du point de vue.
      posCible.set(v.pos[0] + Math.sin(t * 0.35) * 0.6, v.pos[1] + Math.sin(t * 0.5) * 0.2, v.pos[2] + Math.cos(t * 0.35) * 0.6);
      regardCible.set(...v.cible);
    } else if (c.mode === 'visite') {
      // Intro : grand tour au-dessus de l'île.
      posCible.set(Math.cos(t * 0.15) * 26, 14, Math.sin(t * 0.15) * 26);
      regardCible.set(0, 0, 0);
    } else {
      posCible.set(Math.sin(c.theta) * Math.cos(c.phi) * c.rayon, Math.sin(c.phi) * c.rayon,
        Math.cos(c.theta) * Math.cos(c.phi) * c.rayon);
      regardCible.set(0, 0.8, 0);
    }
    // Amorti exponentiel indépendant du nombre d'images par seconde.
    const k = 1 - Math.exp(-dt * (c.mode === 'libre' ? 6 : 1.3));
    camera.position.lerp(posCible, k);
    regard.current.lerp(regardCible, k);
    camera.lookAt(regard.current);
  });
  return null;
}

// --- Assemblage -------------------------------------------------------------------

export function SceneGoree({ ordre, actif, onChoisir, controle }: {
  ordre: IdLieu[]; actif: IdLieu | null; onChoisir: (id: IdLieu) => void;
  controle: MutableRefObject<ControleCamera>;
}) {
  return (
    <>
      <color attach="background" args={[C.ciel]} />
      <fog attach="fog" args={[C.ciel, 30, 85]} />
      {/* Lumière de fin d'après-midi : soleil chaud bas + ciel / reflet de la mer */}
      <hemisphereLight args={['#FFE7C2', '#1F6E80', 0.75]} />
      <directionalLight position={[-14, 16, 8]} intensity={1.9} color="#FFD2A0" castShadow
        shadow-mapSize={[1024, 1024]} shadow-camera-left={-14} shadow-camera-right={14}
        shadow-camera-top={14} shadow-camera-bottom={-14} />
      {/* Soleil visible à l'horizon */}
      <mesh position={[-60, 9, 30]}><sphereGeometry args={[4, 16, 12]} />
        <meshBasicMaterial color="#FFB86B" fog={false} /></mesh>

      <Ocean />
      <Ecume />
      <Ile />
      <Maisons />
      <Palmiers />
      <Fort />
      <Mosquee />
      <MaisonEsclaves />
      <Eglise />
      <Artistes />
      <Castel />
      <EmbarcadereEtChaloupe />
      <Balises ordre={ordre} actif={actif} onChoisir={onChoisir} />
      <Camera actif={actif} controle={controle} />
    </>
  );
}

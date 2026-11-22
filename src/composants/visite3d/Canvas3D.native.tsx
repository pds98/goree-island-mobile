/**
 * Version iOS / Android du moteur 3D : react-three-fiber sur expo-gl.
 * Metro choisit automatiquement ce fichier sur mobile (suffixe .native).
 *
 * CORRECTIF : la version CommonJS de `three` (≥ r180) appelle
 * `process.emitWarning`, qui n'existe que sous Node. Sous React Native,
 * `process` existe mais sans cette fonction → « undefined is not a function ».
 * On déclare une fonction vide AVANT de charger la librairie ; d'où le
 * `require` (un `import` serait remonté avant ce code par Babel).
 */
const proc = ((globalThis as { process?: Record<string, unknown> }).process ??= {});
if (typeof proc.emitWarning !== 'function') proc.emitWarning = () => undefined;

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fibre = require('@react-three/fiber/native') as typeof import('@react-three/fiber/native');

export const { Canvas, useFrame, useThree } = fibre;

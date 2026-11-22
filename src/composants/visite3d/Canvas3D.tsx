/**
 * Version WEB du moteur 3D (react-three-fiber pour le DOM).
 * Les hooks DOIVENT venir du même module que <Canvas> : on les réexporte ici
 * pour que la scène n'importe jamais '@react-three/fiber' directement.
 *
 * Même correctif que la version mobile : `process.emitWarning` n'existe pas
 * dans le navigateur, on le déclare avant de charger `three`.
 */
const proc = ((globalThis as { process?: Record<string, unknown> }).process ??= {});
if (typeof proc.emitWarning !== 'function') proc.emitWarning = () => undefined;

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fibre = require('@react-three/fiber') as typeof import('@react-three/fiber');

export const { Canvas, useFrame, useThree } = fibre;

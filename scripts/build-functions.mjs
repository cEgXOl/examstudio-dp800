import {build} from 'esbuild';
await build({entryPoints:['netlify/functions/exams.mjs'],outfile:'functions-built/exams.mjs',bundle:true,platform:'node',target:'node22',format:'esm',banner:{js:'import { createRequire as __createRequire } from "node:module"; const require = __createRequire(import.meta.url);'}});
console.log('Función Netlify empaquetada.');

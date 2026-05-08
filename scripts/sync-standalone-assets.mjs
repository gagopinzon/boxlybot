/**
 * Tras `next build` con output standalone, copia `.next/static` y `public`
 * dentro de `.next/standalone` (requerido por Next para servir estáticos).
 * Se ejecuta vía npm `postbuild`.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const standalone = path.join(root, ".next", "standalone");

if (!fs.existsSync(standalone)) {
  console.warn(
    "[sync-standalone-assets] No está .next/standalone; omite (¿build falló o sin standalone?).",
  );
  process.exit(0);
}

const staticSrc = path.join(root, ".next", "static");
const staticDest = path.join(standalone, ".next", "static");
if (!fs.existsSync(staticSrc)) {
  console.warn("[sync-standalone-assets] Falta .next/static.");
  process.exit(0);
}

fs.mkdirSync(path.dirname(staticDest), { recursive: true });
fs.cpSync(staticSrc, staticDest, { recursive: true });

const publicSrc = path.join(root, "public");
const publicDest = path.join(standalone, "public");
if (fs.existsSync(publicSrc)) {
  fs.cpSync(publicSrc, publicDest, { recursive: true });
}

console.log("[sync-standalone-assets] Listo para node .next/standalone/server.js");

#!/usr/bin/env node
// Escáner de secretos sin dependencias: revisa los archivos versionados con patrones de credenciales conocidas.
// Es un filtro básico (no sustituye a gitleaks/trufflehog con reglas completas). Sale con código 1 si encuentra algo.
import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const raiz = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
const archivos = execFileSync("git", ["ls-files", "-z"], { cwd: raiz, encoding: "utf8" }).split("\0").filter(Boolean);
const PATRONES = [
  ["clave privada", /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/],
  ["token JWT", /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/],
  ["clave secreta de Supabase", /\bsb_secret_[A-Za-z0-9_-]{16,}/],
  ["clave de AWS", /\bAKIA[0-9A-Z]{16}\b/],
  ["clave de API de Google", /\bAIza[0-9A-Za-z_-]{35}\b/],
  ["token de GitHub", /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36,}\b|\bgithub_pat_[A-Za-z0-9_]{50,}\b/],
  ["token de Slack", /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/],
  ["contraseña asignada", /\b(?:password|passwd|contrase[nñ]a|secret)\b\s*[:=]\s*["'](?!env\()[^"'\s]{10,}["']/i],
];
const OMITIR = /(^|\/)(package-lock\.json|node_modules|dist)\/|\.(png|jpe?g|webp|glb|pdf|docx|pptx|woff2?|ico|mp4|zip|crt|pem)$|(^|\/)public\/data\//i;
const hallazgos = [];
for (const rel of archivos) {
  if (OMITIR.test(rel)) continue;
  if (/(^|\/)\.env(\.|$)/.test(rel) && !/\.env\.example$/.test(rel)) hallazgos.push([rel, 0, "archivo .env versionado"]);
  const ruta = join(raiz, rel);
  let texto;
  try {
    if (statSync(ruta).size > 2_000_000) continue;
    texto = readFileSync(ruta, "utf8");
  } catch { continue; }
  texto.split("\n").forEach((linea, i) => {
    if (linea.length > 4000) return;
    for (const [nombre, re] of PATRONES) if (re.test(linea)) hallazgos.push([rel, i + 1, nombre]);
  });
}
if (hallazgos.length) {
  console.error(`Posibles secretos (${hallazgos.length}):`);
  for (const [f, l, n] of hallazgos) console.error(`  ${f}:${l} · ${n}`);
  process.exit(1);
}
console.log(`Sin secretos evidentes en ${archivos.length} archivos versionados.`);

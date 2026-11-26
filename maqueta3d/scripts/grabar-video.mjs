// Graba el video de uso en emergencia contra la app local (npx vite --port 5173). Salida: public/video/uso-emergencia.mp4 + poster.jpg.
// Uso: node scripts/grabar-video.mjs   (requiere ffmpeg; los subtítulos se dibujan en la página)
import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, rmSync } from "node:fs";

const BASEURL = process.env.URL ?? "http://127.0.0.1:5173/";
const TMP = new URL("../.video-tmp/", import.meta.url).pathname;
rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, recordVideo: { dir: TMP, size: { width: 1280, height: 800 } } });
const page = await ctx.newPage();
const sub = (t) => page.evaluate((t) => {
  let d = document.getElementById("sub-video");
  if (!d) {
    d = document.createElement("div");
    d.id = "sub-video";
    d.style.cssText = "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:rgba(20,40,30,.92);color:#fff;font:600 22px/1.3 sans-serif;padding:12px 20px;border-radius:10px;max-width:80%;text-align:center;z-index:99999";
    document.body.appendChild(d);
  }
  d.textContent = t;
}, t);
const pausa = (ms) => page.waitForTimeout(ms);

await page.goto(BASEURL);
await sub("Territorio Preparado: saber dónde acoger ayuda antes de la emergencia");
await pausa(4000);
await page.getByRole("link", { name: "Entrar como entidad" }).click();
await sub("1. La entidad entra y ve la ficha de su ciudad");
await pausa(3500);
await page.getByLabel("Simular y preparar").getByRole("link", { name: "Simular una amenaza" }).click();
await page.getByRole("complementary", { name: "Datos de la simulación" }).waitFor({ timeout: 40000 });
await sub("2. Simula: elige el sismo (magnitud, profundidad y epicentro)");
await page.getByRole("button", { name: "Sismo", exact: true }).click();
await page.locator("canvas").first().scrollIntoViewIfNeeded();
await pausa(3500);
await page.getByLabel("Epicentro del sismo").selectOption("cali");
await page.getByLabel("Magnitud del sismo").fill("7");
await sub("Sismo de Mw 7,0 bajo Cali: el panel muestra el daño esperado por grado");
await pausa(5000);
await page.getByRole("button", { name: /Oriente y Jarillón/ }).click();
await page.locator("canvas").first().scrollIntoViewIfNeeded();
await sub("3. Los sitios sugeridos de acopio aparecen numerados en el mapa");
await pausa(5000);
await page.goto(BASEURL + "#/aporta/reportar");
await sub("4. La comunidad envía cada mes un reporte con solo conteos, sin datos personales");
await pausa(5000);
await ctx.close();
await browser.close();

const webm = readdirSync(TMP).find((f) => f.endsWith(".webm"));
execFileSync("ffmpeg", ["-y", "-i", TMP + webm, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "30", "-preset", "slow", "-movflags", "+faststart", "-an", "public/video/uso-emergencia.mp4"], { stdio: "ignore" });
execFileSync("ffmpeg", ["-y", "-ss", "10", "-i", "public/video/uso-emergencia.mp4", "-frames:v", "1", "-q:v", "4", "public/video/poster.jpg"], { stdio: "ignore" });
rmSync(TMP, { recursive: true, force: true });
console.log("listo");

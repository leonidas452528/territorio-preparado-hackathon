import { expect, test } from "@playwright/test";

test("simulación de ciudad: panel de datos, capas del sismo por origen y vistas guiadas", async ({ page }) => {
  const errores: string[] = [];
  page.on("pageerror", (e) => errores.push(String(e)));
  await page.goto("/#/entidad/mapa");
  await page.getByRole("link", { name: "Simular una amenaza", exact: true }).click();

  const panel = page.getByRole("complementary", { name: "Datos de la simulación" });
  await expect(panel).toContainText("Amenaza alta", { timeout: 40_000 });
  await expect(panel).toContainText("Ilustrativo");

  // Sismo: los daños se separan por origen del dato y las capas se pueden apagar.
  await page.getByRole("button", { name: "Sismo", exact: true }).click();
  await expect(panel).toContainText("Observado en imagen satelital");
  await expect(panel).toContainText("Estimado por modelo de IA");
  await expect(panel).toContainText("Sedes educativas reportadas");
  // Escenario elegible: el sismo real por defecto y más daño bajo Cali.
  await expect(panel).toContainText("Mw 7,4 a 103 km");
  await page.getByLabel("Epicentro del sismo").selectOption("cali");
  await expect(panel).toContainText("Mw 6,5 a 15 km");
  await page.getByLabel("Magnitud del sismo").fill("7.5");
  await expect(panel).toContainText("Mw 7,5 a 15 km");
  await expect(panel).toContainText("Daño importante o mayor");
  const modelo = panel.getByRole("checkbox", { name: /Estimado por modelo de IA/ });
  await modelo.uncheck();
  await expect(modelo).not.toBeChecked();

  // Vistas guiadas y marcadores de acopio (aparecen al terminar la simulación).
  await page.getByRole("button", { name: /Oriente y Jarillón/ }).click();
  await expect(page.locator(".pin-num").first()).toBeVisible();

  // Incendio: cifras del ejercicio.
  await page.getByRole("button", { name: /Incendio/ }).first().click();
  await expect(panel).toContainText("hectáreas quemadas");
  expect(errores).toEqual([]);
});

for (const [nombre, boton, panel] of [
  ["simulación de ciudad", "Simular una amenaza", "Datos de la simulación"],
  ["escena de refugio", "Demostración de refugio", "Datos del sitio piloto"],
] as const) {
  test(`${nombre}: en móvil el panel de datos no desborda la pantalla`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/#/entidad/mapa");
    await page.getByRole("link", { name: boton, exact: true }).click();
    const aside = page.getByRole("complementary", { name: panel });
    await expect(aside).toBeVisible({ timeout: 40_000 });
    const [ancho, visible, caja] = await Promise.all([
      page.evaluate(() => document.documentElement.scrollWidth),
      page.evaluate(() => window.innerWidth),
      aside.boundingBox(),
    ]);
    expect(ancho).toBeLessThanOrEqual(visible + 1);
    expect(caja!.x).toBeGreaterThanOrEqual(0);
    expect(caja!.x + caja!.width).toBeLessThanOrEqual(visible + 1);
  });
}

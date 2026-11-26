import { expect, test } from "@playwright/test";

test("inicio superficial, dos puertas y navegación lateral por área", async ({ page }) => {
  const errores: string[] = [];
  page.on("pageerror", (e) => errores.push(String(e)));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Leer el territorio");
  // El inicio no trae las herramientas: solo la explicación y las puertas.
  await expect(page.getByRole("link", { name: "Simular una amenaza", exact: true })).toHaveCount(0);

  await page.getByRole("link", { name: "Entrar como entidad" }).click();
  await expect(page).toHaveURL(/#\/entidad\/ciudad/);
  await expect(page.getByRole("link", { name: "Ficha de ciudad", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("heading", { name: "Cali", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Simular una amenaza", exact: true }).first().click();
  await expect(page.getByRole("complementary", { name: "Datos de la simulación" })).toBeVisible({ timeout: 40_000 });

  // La comunidad no ve las herramientas de la entidad.
  await page.locator(".hoja-salir").getByRole("link", { name: "Comunidad" }).click();
  const com = page.getByRole("navigation", { name: "Secciones de Comunidad" });
  await expect(page.getByRole("link", { name: "Simular una amenaza" })).toHaveCount(0);
  await expect(com.getByRole("link", { name: "Enviar reporte mensual" })).toBeVisible();

  await page.goto("/#/aliados");
  await expect(page.getByText("propuesta de colaboración")).toBeVisible();
  expect(errores).toEqual([]);
});

test("reporte mensual: el formulario valida, agrega a la lista y el archivo marca la fila mala", async ({ page }) => {
  await page.goto("/#/aporta/reportar");
  await page.getByLabel(/Mes del reporte/).fill("2026-10");
  await page.getByLabel(/Código de tu organización/).fill("demo-conjunto-01");
  await page.getByLabel(/Tipo de reporte/).selectOption("necesidad");
  await page.getByLabel(/Personas en total/).fill("10");
  await page.getByLabel(/De 0 a 5 años/).fill("1");
  await page.getByLabel(/De 6 a 17 años/).fill("2");
  await page.getByLabel(/De 18 a 59 años/).fill("5");
  await page.getByLabel(/De 60 años o más/).fill("1"); // suma 9, no 10
  await page.getByRole("button", { name: "Agregar a la lista" }).click();
  await expect(page.getByRole("alert")).toContainText("deben sumar n_total");
  await page.getByLabel(/De 60 años o más/).fill("2");
  await page.getByRole("button", { name: "Agregar a la lista" }).click();
  await expect(page.getByRole("heading", { name: "Tu lista (1)" })).toBeVisible();

  const csv = "ciudad_id,periodo,codigo_organizacion,tipo_reporte,espacio_id,n_total,n_0_5,n_6_17,n_18_59,n_60_mas,n_discapacidad,n_animales_compania,observacion\n" +
    "cali-co,2026-10,demo-jac-01,necesidad,,,,,,,,,llamar 3001234567\n" +
    "cali-co,2026-10,demo-jac-01,necesidad,,,,,,,,,Faltan colchonetas\n";
  await page.locator('input[type="file"]').setInputFiles({ name: "r.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
  await expect(page.getByRole("status")).toContainText("1 de 2 filas válidas");
  await expect(page.getByText("Fila 2:")).toContainText("teléfono");
});

test("guía de datos se genera del esquema y una ciudad sin maqueta explica sus niveles", async ({ page }) => {
  await page.goto("/#/aporta/guia");
  await expect(page.getByRole("heading", { name: /Reportes mensuales/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Descargar plantilla de reportes mensuales/ })).toBeVisible();
  await page.getByLabel("Ciudad", { exact: true }).selectOption("barcelona-es");
  await page.goto("/#/entidad/simular");
  await expect(page.getByRole("heading", { name: /todavía no tiene esta vista/ })).toBeVisible();
});

for (const ruta of ["/", "/#/aporta/reportar", "/#/aporta/guia"]) {
  test(`móvil 390 px sin desbordes: ${ruta}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(ruta);
    await page.waitForTimeout(800);
    const [ancho, visible] = await Promise.all([page.evaluate(() => document.documentElement.scrollWidth), page.evaluate(() => innerWidth)]);
    expect(ancho).toBeLessThanOrEqual(visible + 1);
  });
}

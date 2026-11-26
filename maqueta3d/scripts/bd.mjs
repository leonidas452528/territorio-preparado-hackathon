// Regenera bd/diccionario.csv y las copias públicas no sensibles (public/bd/). Uso: npm run bd
import { copyFileSync, writeFileSync } from "node:fs";
import { diccionarioCsv } from "../src/datos/validar.ts";

writeFileSync("bd/diccionario.csv", diccionarioCsv());
for (const f of ["diccionario.csv", "ciudades.csv"]) {
  if (f === "diccionario.csv") writeFileSync("public/bd/" + f, diccionarioCsv());
  else copyFileSync("bd/" + f, "public/bd/" + f);
}
console.log("bd: diccionario y copias públicas listas");

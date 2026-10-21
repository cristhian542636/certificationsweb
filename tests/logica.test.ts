// Pruebas de la lógica pura (progreso, selección de preguntas y ambientes). Ejecuta: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { calcularProgreso, calcularRacha, siguientePaso, diasEntre, type Resumen } from "../src/lib/progreso";
import { cuotasPorDominio, seleccionarPreguntas, type Historial } from "../src/lib/seleccion";
import { detectarAmbiente, urlDelSitio } from "../src/lib/entorno";
import type { Pregunta, Dominio } from "../src/lib/tipos";
import gratisJson from "../data/preguntas/gratis.json";
import premiumJson from "../data/preguntas/premium.json";

const gratis = gratisJson as Pregunta[];
const todas = [...gratis, ...(premiumJson as Pregunta[])];
const contar = (ps: Pregunta[]) =>
  ps.reduce((a, p) => ({ ...a, [p.dominio]: (a[p.dominio] ?? 0) + 1 }), {} as Partial<Record<Dominio, number>>);
const total = contar(todas);
const disponiblesGratis = contar(gratis);
const HOY = "2026-10-14";

test("sin datos: índice 0 y el siguiente paso es el diagnóstico", () => {
  const vacio: Resumen = { ultimas: [], dias: [], intentos: [] };
  const p = calcularProgreso(vacio, { total, disponibles: disponiblesGratis }, HOY);
  assert.equal(p.indice, 0);
  assert.equal(p.nuevas, 15);
  assert.equal(siguientePaso(p, false).href, "/simulador?modo=diagnostico");
});

test("diagnóstico gratis completo: ofrece premium", () => {
  const diag: Resumen = {
    ultimas: gratis.map((q) => ({ pregunta_id: q.id, dominio: q.dominio, correcta: true, veces: 1 })),
    dias: [HOY],
    intentos: [],
  };
  const p = calcularProgreso(diag, { total, disponibles: disponiblesGratis, idsDisponibles: new Set(gratis.map((q) => q.id)) }, HOY);
  assert.equal(p.nuevas, 0);
  assert.equal(siguientePaso(p, false).tipo, "premium");
});

test("cuotas del simulacro de 45 según los pesos oficiales", () => {
  const q45 = cuotasPorDominio(45, total);
  assert.equal(Object.values(q45).reduce((a, b) => a + b, 0), 45);
  assert.deepEqual(q45, { plataforma: 3, ingesta: 9, transformacion: 10, jobs: 7, cicd: 5, optimizacion: 4, gobierno: 7 });
});

test("simulacros: priorizan preguntas nunca vistas", () => {
  const historial = new Map<string, Historial>();
  const s1 = seleccionarPreguntas(todas, historial, "examen");
  assert.equal(s1.preguntas.length, 45);
  assert.equal(s1.nuevas, 45);
  s1.preguntas.forEach((q, i) => historial.set(q.id, { correcta: i % 3 !== 0, veces: 1 }));
  const s2 = seleccionarPreguntas(todas, historial, "examen");
  assert.ok(s2.nuevas >= 40, `el 2º simulacro debería ser casi todo nuevo (${s2.nuevas})`);
});

test("racha y cuenta regresiva", () => {
  assert.equal(calcularRacha(["2026-10-14", "2026-10-13", "2026-10-12", "2026-10-10"], HOY), 3);
  assert.equal(calcularRacha(["2026-03-01", "2026-02-28"], "2026-03-01"), 2);
  assert.equal(diasEntre(HOY, "2026-11-01"), 18);
});

test("ambientes: main → producción, qa y dev → preview", () => {
  assert.equal(detectarAmbiente("production", "main"), "produccion");
  assert.equal(detectarAmbiente("preview", "qa"), "qa");
  assert.equal(detectarAmbiente("preview", "dev"), "dev");
  assert.equal(detectarAmbiente("preview", "otra-rama"), "preview");
  assert.equal(detectarAmbiente(undefined, undefined), "local");
});

test("URL del sitio: la de la rama en dev/qa, la configurada en producción", () => {
  const urlRama = "certificationsweb-git-dev-datacert.vercel.app";
  assert.equal(urlDelSitio({ vercelEnv: "preview", urlRama }), `https://${urlRama}`);
  // Aunque alguien configure NEXT_PUBLIC_SITE_URL para todos los ambientes, dev/qa no apuntan a producción.
  assert.equal(urlDelSitio({ vercelEnv: "preview", urlRama, explicita: "https://certificationsweb.vercel.app" }), `https://${urlRama}`);
  assert.equal(
    urlDelSitio({ vercelEnv: "production", explicita: "https://certificationsweb.vercel.app/", urlProduccion: "x.vercel.app" }),
    "https://certificationsweb.vercel.app",
  );
  assert.equal(urlDelSitio({ vercelEnv: "production", urlProduccion: "certificationsweb.vercel.app" }), "https://certificationsweb.vercel.app");
  assert.equal(urlDelSitio({}), "http://localhost:3000");
});

test("pases: precio de lanzamiento, descuento de referido y alcance", async () => {
  const { sitio, obtenerPase, pasesPara, precioVigente, precioAnterior, precioConDescuento, alcanceDe, PRECIO_DESDE } = await import(
    "../src/config/sitio"
  );
  const { CERT_ACTUAL } = await import("../src/config/certificaciones");
  const p120 = obtenerPase("associate-120")!;
  assert.deepEqual(pasesPara(CERT_ACTUAL).map((p) => p.id), ["associate-60", "associate-120"]);
  assert.equal(precioVigente(p120), sitio.lanzamiento ? 89 : 119);
  assert.equal(precioAnterior(p120), sitio.lanzamiento ? 119 : null);
  assert.equal(precioConDescuento(p120, true), sitio.lanzamiento ? 80.1 : 107.1);
  assert.equal(precioConDescuento(p120, false), precioVigente(p120));
  assert.equal(alcanceDe(p120, CERT_ACTUAL), CERT_ACTUAL.id);
  assert.equal(alcanceDe(obtenerPase("todo-databricks")!, CERT_ACTUAL), "*");
  assert.equal(PRECIO_DESDE, sitio.lanzamiento ? 59 : 79);
});

test("al pasar a Premium, el siguiente paso es el primer simulacro completo", () => {
  const diag: Resumen = {
    ultimas: gratis.map((q, i) => ({ pregunta_id: q.id, dominio: q.dominio, correcta: i % 2 === 0, veces: 1 })),
    dias: [HOY],
    intentos: [{ modo: "diagnostico", total: 15, correctas: 8, creado_en: `${HOY}T10:00:00Z` }],
  };
  const p = calcularProgreso(diag, { total, disponibles: total }, HOY);
  assert.equal(siguientePaso(p, true).href, "/simulador?modo=examen");
  const conSimulacro = calcularProgreso(
    { ...diag, intentos: [...diag.intentos, { modo: "examen", total: 45, correctas: 30, creado_en: `${HOY}T12:00:00Z` }] },
    { total, disponibles: total },
    HOY,
  );
  assert.equal(siguientePaso(conSimulacro, true).href, "/simulador?modo=repaso");
  assert.notEqual(siguientePaso(p, false).href, "/simulador?modo=examen");
});

test("insignia del alumno: Bronce → Plata → Oro según sus metas", async () => {
  const { calcularRango, subioDeRango } = await import("../src/lib/progreso");
  const vacio = calcularProgreso({ ultimas: [], dias: [], intentos: [] }, { total, disponibles: total }, HOY);
  assert.deepEqual([calcularRango(vacio).actual, calcularRango(vacio).siguiente], ["ninguno", "bronce"]);

  // Diagnóstico completo → Bronce; para Plata falta el simulacro (Premium) y los días.
  const diag = calcularProgreso(
    { ultimas: gratis.map((q) => ({ pregunta_id: q.id, dominio: q.dominio, correcta: true, veces: 1 })), dias: [HOY], intentos: [] },
    { total, disponibles: total },
    HOY,
  );
  const r1 = calcularRango(diag);
  assert.equal(r1.actual, "bronce");
  assert.equal(r1.siguiente, "plata");
  assert.equal(r1.metas.find((m) => m.premium)?.cumplida, false);

  // Todo el banco correcto, 5 días y un simulacro aprobado → Oro.
  const todo = (premiumJson as Pregunta[]).concat(gratis);
  const dias = ["2026-10-14", "2026-10-13", "2026-10-12", "2026-10-11", "2026-10-10"];
  const experto = calcularProgreso(
    {
      ultimas: todo.map((q) => ({ pregunta_id: q.id, dominio: q.dominio, correcta: true, veces: 1 })),
      dias,
      intentos: [{ modo: "examen", total: 45, correctas: 40, creado_en: `${HOY}T10:00:00Z` }],
    },
    { total, disponibles: total },
    HOY,
  );
  const r3 = calcularRango(experto);
  assert.equal(r3.actual, "oro");
  assert.equal(r3.siguiente, null);
  assert.equal(r3.metas.length, 0);

  // Simulacro reprobado (30/45): no llega a Oro aunque el resto se cumpla.
  const casi = calcularProgreso(
    {
      ultimas: todo.map((q) => ({ pregunta_id: q.id, dominio: q.dominio, correcta: true, veces: 1 })),
      dias,
      intentos: [{ modo: "examen", total: 45, correctas: 30, creado_en: `${HOY}T10:00:00Z` }],
    },
    { total, disponibles: total },
    HOY,
  );
  assert.equal(calcularRango(casi).actual, "plata");
  assert.ok(subioDeRango("bronce", "plata") && !subioDeRango("plata", "plata") && !subioDeRango("oro", "bronce"));
});

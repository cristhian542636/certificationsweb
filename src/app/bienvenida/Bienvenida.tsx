"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sitio, obtenerNivel, type NivelAlumno } from "@/config/sitio";
import { Aviso } from "@/components/MarcoAuth";
import SelectorFecha from "@/components/SelectorFecha";
import { hoyLima } from "@/lib/progreso";

function sumarDias(dias: number) {
  const d = new Date(`${hoyLima()}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

const fechaLarga = (iso: string) => {
  const t = new Date(`${iso}T12:00:00Z`).toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
  return t.charAt(0).toUpperCase() + t.slice(1);
};

export default function Bienvenida({
  nombre,
  nivelInicial,
  fechaInicial,
}: {
  nombre: string;
  nivelInicial: string | null;
  fechaInicial: string | null;
}) {
  const router = useRouter();
  const [paso, setPaso] = useState(1);
  const [nivel, setNivel] = useState<NivelAlumno | null>((obtenerNivel(nivelInicial)?.id as NivelAlumno) ?? null);
  const [tieneFecha, setTieneFecha] = useState<boolean | null>(fechaInicial ? true : null);
  const [fecha, setFecha] = useState(fechaInicial ?? "");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(false);

  const datosNivel = obtenerNivel(nivel);
  const sugerida = sumarDias((datosNivel?.semanas ?? 4) * 7);

  async function terminar(destino: string) {
    setGuardando(true);
    setError(false);
    const res = await fetch("/api/perfil", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nivel, fecha_examen: fecha || null }),
    });
    if (!res.ok) {
      setGuardando(false);
      setError(true);
      return;
    }
    router.push(destino);
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        {[1, 2, 3].map((n) => (
          <div key={n} className={`h-1 flex-1 rounded-full ${n <= paso ? "bg-acento" : "bg-borde"}`} />
        ))}
        <span className="font-mono text-xs text-tenue">{paso}/3</span>
      </div>

      {paso === 1 && (
        <section className="mt-10">
          <p className="etiqueta">Hola, {nombre}</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">¿Cuánta experiencia tienes con Databricks?</h1>
          <p className="mt-3 text-tenue">Con esto armamos un plan a tu medida. No hay respuestas incorrectas.</p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2" role="radiogroup">
            {sitio.niveles.map((n) => (
              <button
                key={n.id}
                role="radio"
                aria-checked={nivel === n.id}
                onClick={() => {
                  setNivel(n.id);
                  setPaso(2);
                }}
                className={`tarjeta p-5 text-left transition hover:border-acento/60 ${nivel === n.id ? "border-acento bg-acento/10" : ""}`}
              >
                <p className="font-semibold">{n.nombre}</p>
                <p className="mt-1 text-sm text-tenue">{n.detalle}</p>
              </button>
            ))}
          </div>
        </section>
      )}

      {paso === 2 && datosNivel && (
        <section className="mt-10">
          <p className="etiqueta">Tu meta</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">¿Ya tienes fecha para tu examen?</h1>
          <p className="mt-3 text-tenue">Las metas con fecha se cumplen. La puedes cambiar cuando quieras.</p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => setTieneFecha(true)}
              className={`tarjeta p-5 text-left ${tieneFecha === true ? "border-acento bg-acento/10" : "hover:border-acento/60"}`}
            >
              <p className="font-semibold">Sí, ya la tengo</p>
              <p className="mt-1 text-sm text-tenue">Ya agendé mi examen</p>
            </button>
            <button
              onClick={() => {
                setTieneFecha(false);
                setFecha(sugerida);
              }}
              className={`tarjeta p-5 text-left ${tieneFecha === false ? "border-acento bg-acento/10" : "hover:border-acento/60"}`}
            >
              <p className="font-semibold">Todavía no</p>
              <p className="mt-1 text-sm text-tenue">Ayúdame a elegir una</p>
            </button>
          </div>

          {tieneFecha === true && (
            <div className="mt-6 text-sm">
              <p className="mb-1.5 text-tenue">Fecha de tu examen</p>
              <SelectorFecha valor={fecha} onCambio={setFecha} />
            </div>
          )}

          {tieneFecha === false && (
            <div className="tarjeta mt-6 p-5">
              <p className="text-sm text-tenue">
                Para alguien que <strong className="text-texto">{datosNivel.nombre.toLowerCase()}</strong>, recomendamos unas{" "}
                <strong className="text-texto">{datosNivel.semanas} semanas</strong> de práctica. Te proponemos:
              </p>
              {fecha ? (
                <>
                  <p className="mt-3 text-xl font-semibold">{fechaLarga(sugerida)}</p>
                  <button onClick={() => setFecha("")} className="mt-3 text-xs text-tenue underline hover:text-texto">
                    Prefiero no poner fecha por ahora
                  </button>
                </>
              ) : (
                <>
                  <p className="mt-3 text-sm">Sin fecha por ahora. Podrás definirla desde tu panel cuando quieras.</p>
                  <button onClick={() => setFecha(sugerida)} className="mt-3 text-xs text-acento underline">
                    Mejor usar la fecha sugerida
                  </button>
                </>
              )}
            </div>
          )}

          <div className="mt-8 flex justify-between">
            <button onClick={() => setPaso(1)} className="btn-secundario">← Atrás</button>
            <button
              onClick={() => setPaso(3)}
              disabled={tieneFecha === null || (tieneFecha && !fecha)}
              className="btn-primario"
            >
              Continuar →
            </button>
          </div>
        </section>
      )}

      {paso === 3 && datosNivel && (
        <section className="mt-10">
          <p className="etiqueta">Tu plan</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Así llegarás con confianza al examen</h1>
          <ol className="mt-8 space-y-3">
            {[
              ["Diagnóstico", "15 preguntas que cubren las 7 secciones del examen según su peso. Sabrás exactamente desde dónde partes."],
              ["Práctica guiada", "Tu panel te dirá cada día qué tema reforzar. Con unos 20 minutos diarios basta."],
              ["Repaso de errores", "Volverás sobre lo que fallaste hasta dominarlo: Bronce → Plata → Oro."],
              ["Simulacros", `${sitio.examen.preguntasReales} preguntas en ${sitio.examen.minutosReales} minutos, cuando tu índice pase de 70%.`],
            ].map(([t, d], i) => (
              <li key={t} className="tarjeta flex gap-4 p-5">
                <span className="font-mono text-sm text-acento">0{i + 1}</span>
                <div>
                  <p className="font-semibold">{t}</p>
                  <p className="mt-1 text-sm text-tenue">{d}</p>
                </div>
              </li>
            ))}
          </ol>
          {fecha && (
            <p className="mt-6 text-sm text-tenue">
              Meta: <strong className="text-texto">{fechaLarga(fecha)}</strong>
            </p>
          )}
          {error && (
            <div className="mt-4">
              <Aviso tipo="error">No pudimos guardar tu plan. Inténtalo otra vez.</Aviso>
            </div>
          )}
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
            <button onClick={() => setPaso(2)} className="btn-secundario">← Atrás</button>
            <div className="flex flex-wrap gap-3">
              <button disabled={guardando} onClick={() => terminar("/panel")} className="btn text-tenue hover:text-texto">
                Ir a mi panel
              </button>
              <button disabled={guardando} onClick={() => terminar("/simulador?modo=diagnostico")} className="btn-primario px-5 py-3">
                {guardando ? "Guardando…" : "Empezar mi diagnóstico →"}
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

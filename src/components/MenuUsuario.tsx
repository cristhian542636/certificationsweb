"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { sitio, formatoSoles, PRECIO_DESDE } from "@/config/sitio";

// Menú de la cuenta (arriba a la derecha): pocos accesos, cada uno con una línea que explica para qué sirve.
// Alumno gratis: lo mínimo y el camino a Premium. Premium: lo que usa para practicar.
// Sin sesión (solo en móvil): las secciones de la página.

export interface DatosMenu {
  nombre: string;
  email: string;
  premium: boolean;
  accesoHasta: string | null;
  admin: boolean;
  /** false mientras tiene una garantía por solicitar o pendiente: no se le ofrece comprar. */
  venta: boolean;
}

const SECCIONES = [
  ["/#certificaciones", "Certificaciones"],
  ["/#precio", "Precio"],
  ["/#faq", "Preguntas frecuentes"],
] as const;

function iniciales(nombre: string) {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  return ((partes[0]?.[0] ?? "") + (partes[1]?.[0] ?? "")).toUpperCase() || "?";
}

const fechaCorta = (iso: string) => new Date(iso).toLocaleDateString("es-PE", { day: "numeric", month: "short" });

/** "Extender mi acceso" solo aparece cuando falta poco para que venza. */
const DIAS_AVISO_VENCIMIENTO = 15;

export default function MenuUsuario({ usuario }: { usuario: DatosMenu | null }) {
  const [abierto, setAbierto] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);
  const boton = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const ruta = usePathname();

  // Se cierra al navegar.
  useEffect(() => setAbierto(false), [ruta]);

  useEffect(() => {
    if (!abierto) return;
    menu.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const fuera = (e: MouseEvent) => {
      if (!contenedor.current?.contains(e.target as Node)) setAbierto(false);
    };
    const teclado = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAbierto(false);
        boton.current?.focus();
        return;
      }
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      e.preventDefault();
      const items = [...(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
      const i = items.indexOf(document.activeElement as HTMLElement);
      items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
    };
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", teclado);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", teclado);
    };
  }, [abierto]);

  // Sin sesión: solo hace falta en móvil, donde las secciones no caben en la barra.
  if (!usuario) {
    return (
      <div ref={contenedor} className="relative md:hidden">
        <button
          ref={boton}
          onClick={() => setAbierto((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={abierto}
          aria-label="Abrir menú"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-borde text-tenue hover:text-texto"
        >
          <Icono d="M4 7h16M4 12h16M4 17h16" />
        </button>
        {abierto && (
          <Panel ref={menu}>
            <div className="p-2">
              {SECCIONES.map(([href, texto]) => (
                <Item key={href} href={href} texto={texto} />
              ))}
            </div>
            <div className="border-t border-borde p-3">
              <Link href="/registro" role="menuitem" className="btn-primario w-full">
                Haz tu diagnóstico gratis
              </Link>
            </div>
          </Panel>
        )}
      </div>
    );
  }

  const diasRestantes = usuario.accesoHasta ? (new Date(usuario.accesoHasta).getTime() - Date.now()) / 864e5 : 0;

  return (
    <div ref={contenedor} className="relative">
      <button
        ref={boton}
        onClick={() => setAbierto((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-label={`Menú de tu cuenta: ${usuario.nombre}`}
        className="flex items-center gap-1.5 rounded-full border border-borde p-1 pr-2 transition hover:border-borde-fuerte"
      >
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-full font-mono text-xs font-semibold ${
            usuario.premium ? "bg-acento text-fondo" : "bg-panel-2 text-texto"
          }`}
        >
          {iniciales(usuario.nombre)}
        </span>
        <Icono d="M6 9l6 6 6-6" tamano={14} className={`text-tenue transition ${abierto ? "rotate-180" : ""}`} />
      </button>

      {abierto && (
        <Panel ref={menu}>
          <div className="flex items-center gap-3 border-b border-borde p-4">
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-mono text-sm font-semibold ${
                usuario.premium ? "bg-acento text-fondo" : "bg-panel-2 text-texto"
              }`}
              aria-hidden
            >
              {iniciales(usuario.nombre)}
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold">{usuario.nombre}</p>
              <p className="truncate font-mono text-xs text-tenue">{usuario.email}</p>
              <p className="mt-1 text-xs">
                {usuario.premium ? (
                  <span className="rounded bg-acento/15 px-1.5 py-0.5 font-mono text-acento">
                    PRO{usuario.accesoHasta ? ` · hasta el ${fechaCorta(usuario.accesoHasta)}` : ""}
                  </span>
                ) : (
                  <span className="rounded bg-panel-2 px-1.5 py-0.5 font-mono text-tenue">Plan gratis</span>
                )}
              </p>
            </div>
          </div>

          <div className="p-2">
            <Item href="/panel" texto="Mi panel" detalle="Tu progreso y tu siguiente paso" icono="M4 13h6V4H4v9zm10 7h6v-9h-6v9zM4 20h6v-4H4v4zm10-16v4h6V4h-6z" />
            {usuario.premium && <Item href="/simulador" texto="Simulador" detalle="Practica o haz un simulacro" icono="M8 5v14l11-7L8 5z" />}
            <Item href="/cuenta" texto="Mi cuenta" detalle="Tus intentos, pagos y datos" icono="M12 12a4 4 0 100-8 4 4 0 000 8zm-7 8a7 7 0 0114 0" />
            {usuario.premium && (
              <Item
                href="/cuenta#invitar"
                texto="Invita y gana"
                detalle={`${sitio.referidos.diasInvitador} días gratis por cada colega que compre`}
                icono="M20 12v8H4v-8M2 7h20v5H2V7zm10 13V7m0 0H7.5a2.5 2.5 0 110-5C11 2 12 7 12 7zm0 0h4.5a2.5 2.5 0 100-5C13 2 12 7 12 7z"
              />
            )}
            {usuario.premium && diasRestantes <= DIAS_AVISO_VENCIMIENTO && (
              <Item href="/comprar" texto="Extender mi acceso" detalle="El tiempo se suma al que tienes" icono="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" destacado />
            )}
            {!usuario.premium && usuario.venta && (
              <Item
                href="/comprar"
                texto="Pasar a Premium"
                detalle={`Banco completo y simulacros · desde ${formatoSoles(PRECIO_DESDE)}`}
                icono="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6-4.5-4.2 6.1-.7L12 3z"
                destacado
              />
            )}
            {usuario.admin && <Item href="/admin" texto="Panel admin" detalle="Indicadores del negocio" icono="M4 20V10m6 10V4m6 16v-7m4 7H2" />}
          </div>

          <div className="border-t border-borde p-2">
            <form action="/auth/salir" method="post">
              <button
                role="menuitem"
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-tenue outline-none hover:bg-panel-2 hover:text-texto focus-visible:bg-panel-2 focus-visible:text-texto"
              >
                <Icono d="M15 12H3m0 0l4-4m-4 4l4 4M10 4h9a1 1 0 011 1v14a1 1 0 01-1 1h-9" />
                Cerrar sesión
              </button>
            </form>
          </div>
        </Panel>
      )}
    </div>
  );
}

function Panel({ ref, children }: { ref: React.Ref<HTMLDivElement>; children: React.ReactNode }) {
  return (
    <div
      ref={ref}
      role="menu"
      className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-borde-fuerte bg-panel shadow-2xl shadow-black/50"
    >
      {children}
    </div>
  );
}

function Item({ href, texto, detalle, icono, destacado }: { href: string; texto: string; detalle?: string; icono?: string; destacado?: boolean }) {
  return (
    <Link
      href={href}
      role="menuitem"
      className={`flex items-start gap-3 rounded-lg px-3 py-2 outline-none hover:bg-panel-2 focus-visible:bg-panel-2 ${destacado ? "text-oro" : ""}`}
    >
      {icono && (
        <span className={`mt-0.5 ${destacado ? "text-oro" : "text-tenue"}`}>
          <Icono d={icono} />
        </span>
      )}
      <span className="min-w-0">
        <span className="block text-sm font-medium">{texto}</span>
        {detalle && <span className="block text-xs text-tenue">{detalle}</span>}
      </span>
    </Link>
  );
}

function Icono({ d, tamano = 18, className = "" }: { d: string; tamano?: number; className?: string }) {
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`max-w-none shrink-0 ${className}`}
      aria-hidden
    >
      <path d={d} />
    </svg>
  );
}

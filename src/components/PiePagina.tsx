import Link from "next/link";
import Logo from "./Logo";
import { sitio, enlaceWhatsApp } from "@/config/sitio";

export default function PiePagina() {
  return (
    <footer className="border-t border-borde bg-panel/40">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo />
          <p className="mt-4 max-w-sm text-sm text-tenue">
            Preparación para certificaciones de ingeniería de datos, en español y con casos reales de la industria.
          </p>
        </div>
        <div>
          <p className="etiqueta !text-tenue">Plataforma</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link href="/simulador" className="text-tenue hover:text-texto">Simulador</Link></li>
            <li><Link href="/#precio" className="text-tenue hover:text-texto">Precio</Link></li>
            <li><Link href="/cuenta" className="text-tenue hover:text-texto">Mi cuenta</Link></li>
          </ul>
        </div>
        <div>
          <p className="etiqueta !text-tenue">Legal y soporte</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link href="/terminos" className="text-tenue hover:text-texto">Términos y condiciones</Link></li>
            <li><Link href="/privacidad" className="text-tenue hover:text-texto">Política de privacidad</Link></li>
            <li><Link href={sitio.contacto.libroReclamaciones} className="text-tenue hover:text-texto">Libro de reclamaciones</Link></li>
            <li>
              <a href={enlaceWhatsApp("Hola, tengo una consulta.")} className="text-tenue hover:text-texto">
                Soporte por WhatsApp
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-borde">
        <p className="mx-auto max-w-6xl px-4 py-6 text-xs text-tenue">
          © {new Date().getFullYear()} {sitio.nombre}. Preguntas originales con fines de práctica, no son preguntas reales
          del examen. Sitio independiente, no afiliado ni respaldado por Databricks, Inc.
        </p>
      </div>
    </footer>
  );
}

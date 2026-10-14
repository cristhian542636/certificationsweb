import Link from "next/link";
import { sitio } from "@/config/sitio";

export default function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 font-mono text-[15px] font-semibold tracking-tight">
      <svg viewBox="0 0 28 28" className="h-7 w-7" aria-hidden>
        <rect width="28" height="28" rx="7" fill="#131923" stroke="#2d3846" />
        <rect x="6" y="16" width="16" height="4" rx="1.5" fill="var(--color-bronce)" />
        <rect x="8" y="11" width="12" height="4" rx="1.5" fill="var(--color-plata)" />
        <rect x="10" y="6" width="8" height="4" rx="1.5" fill="var(--color-oro)" />
      </svg>
      <span>
        {sitio.nombre.slice(0, 4).toLowerCase()}
        <span className="text-acento">{sitio.nombre.slice(4).toLowerCase()}</span>
      </span>
    </Link>
  );
}

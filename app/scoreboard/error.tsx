"use client";

import Link from "next/link";
import { LuArrowLeft } from "react-icons/lu";

export default function ScoreboardError() {
  return (
    <main className="relative flex flex-col min-h-screen bg-bg-primary items-center justify-center px-4">
      <div className="scanlines fixed inset-0 z-0 pointer-events-none" />
      <div className="relative z-10 flex flex-col items-center gap-4 text-center">
        <p className="text-accent-orange font-mono text-sm">// error cargando clasificación</p>
        <Link
          href="/"
          className="flex items-center gap-2 text-xs text-content-muted font-mono hover:text-content-primary transition-colors"
        >
          <LuArrowLeft size={12} />
          volver al inicio
        </Link>
      </div>
    </main>
  );
}

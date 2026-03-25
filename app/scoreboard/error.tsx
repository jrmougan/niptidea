"use client";

import { useEffect } from "react";
import Link from "next/link";
import { LuArrowLeft, LuRefreshCw } from "react-icons/lu";

export default function ScoreboardError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="relative flex flex-col min-h-screen bg-bg-primary items-center justify-center px-4">
      <div className="scanlines fixed inset-0 z-0 pointer-events-none" />
      <div className="relative z-10 flex flex-col items-center gap-4 text-center">
        <p className="text-accent-orange font-mono text-sm">// error cargando clasificación</p>
        <button
          onClick={() => unstable_retry()}
          className="flex items-center gap-2 text-xs text-accent-teal font-mono hover:text-content-primary transition-colors"
        >
          <LuRefreshCw size={12} />
          intentar de nuevo
        </button>
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

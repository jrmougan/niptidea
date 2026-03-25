import type { Metadata, Viewport } from "next";
import "./globals.css";
import { MAX_ATTEMPTS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "NiP_taIdea — ¿Puedes adivinar lo que piensa la IA?",
  description: `Juego de adivinanza con IA sarcástica. Tienes ${MAX_ATTEMPTS} preguntas para descubrir el concepto secreto.`,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full">
      <body className="min-h-full flex flex-col bg-[#141414] text-[#f0f0f0] font-mono">
        {children}
      </body>
    </html>
  );
}

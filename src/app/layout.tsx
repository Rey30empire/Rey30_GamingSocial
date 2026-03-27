import type { Metadata } from "next";
import { Orbitron, Rajdhani } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const bodyFont = Rajdhani({
  variable: "--font-rajdhani",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const displayFont = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: "REY30VERSE | Plataforma Social Gaming",
  description:
    "Hub social gaming con chats, salas, streaming, marketplace y mesa competitiva en una sola experiencia.",
  keywords: [
    "REY30VERSE",
    "Rey30",
    "Gaming Social",
    "Card Games",
    "Live Streaming",
    "Torneos",
  ],
  authors: [{ name: "Rey30 Studio" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "REY30VERSE | Donde el juego se vuelve comunidad",
    description:
      "Chats, salas, streaming, cartas y competitividad en una interfaz premium unificada.",
    siteName: "REY30VERSE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "REY30VERSE | Plataforma Social Gaming",
    description: "Donde el juego se vuelve comunidad",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <body
        className={`${bodyFont.variable} ${displayFont.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}

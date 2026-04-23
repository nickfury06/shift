import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Shift — F&B Operations",
  description: "Le compagnon quotidien des bars et restaurants : communication équipe, réservations, tâches, stocks.",
  manifest: "/manifest.json",
  applicationName: "Shift",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Shift",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
  openGraph: {
    title: "Shift — F&B Operations",
    description: "Le compagnon quotidien des bars et restaurants.",
    type: "website",
    locale: "fr_FR",
    siteName: "Shift",
    images: [{ url: "/icons/icon-512.png", width: 512, height: 512, alt: "Shift" }],
  },
  twitter: {
    card: "summary",
    title: "Shift — F&B Operations",
    description: "Le compagnon quotidien des bars et restaurants.",
    images: ["/icons/icon-512.png"],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAFAF7" },
    { media: "(prefers-color-scheme: dark)", color: "#0B0A08" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {
              var theme = localStorage.getItem('shift-theme');
              if (theme === 'dark') document.documentElement.classList.add('dark');
            })();
          `,
        }} />
      </head>
      <body className="min-h-dvh flex flex-col relative z-10">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}

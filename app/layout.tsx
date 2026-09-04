import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://festival-lineup-data-platform.vercel.app"),
  title: {
    default: "Festival Lineup Data Platform",
    template: "%s | Festival Lineup Data Platform",
  },
  description: "Turn festival programs into normalized, linked, quality-scored artist and event data.",
  openGraph: {
    title: "Festival Lineup Data Platform",
    description: "A fixture-backed demonstration of a festival data ingestion, entity-linking, enrichment, and validation pipeline.",
    type: "website",
    url: "/",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "Festival Lineup Data Platform" }],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <style
          dangerouslySetInnerHTML={{
            __html: `
              /* Critical CSS to prevent font flash */
              html, body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
              }
            `,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Force dark mode and prevent flash
              document.documentElement.classList.add('dark');
              document.documentElement.style.colorScheme = 'dark';
            `,
          }}
        />
      </head>
      <body
        className="font-sans antialiased dark bg-background"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://ade-eta.vercel.app"),
  title: {
    default: "LineupBase | Electronic Music Artist Directory",
    template: "%s | LineupBase",
  },
  description: "Find electronic music artists by country, genre, subgenre, event appearances, Spotify data, images, and source metadata.",
  openGraph: {
    title: "LineupBase Artist Directory",
    description: "Electronic music artist directory for people and firms finding artists by country, genre, subgenre, and metadata depth.",
    type: "website",
    url: "/",
  },
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

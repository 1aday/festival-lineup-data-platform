import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ADE Artist Scraper",
  description: "Amsterdam Dance Event artist database scraper with real-time sync",
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

import type { Metadata } from "next";
import Script from "next/script";
import { Inter, Syne, Sora, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Aveno - Deploy with Ease",
  description: "Wallet-gated deployment platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark theme-brutal" suppressHydrationWarning>
      <head>
        <Script id="aveno-theme-init" strategy="beforeInteractive">
          {`
            try {
              var stored = localStorage.getItem('aveno-theme');
              var theme = (stored === 'neon' || stored === 'brutal') ? stored : 'brutal';
              var html = document.documentElement;
              html.classList.remove('theme-neon','theme-brutal');
              html.classList.add('dark', 'theme-' + theme);
              html.setAttribute('data-theme', theme);
            } catch (e) {}
          `}
        </Script>
      </head>
      <body
        className={`${inter.variable} ${syne.variable} ${sora.variable} ${plusJakartaSans.variable} ${jetbrainsMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider>
          <Providers>
            {children}
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}

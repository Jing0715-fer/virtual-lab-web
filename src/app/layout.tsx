import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { PWAWrapper } from "./pwa-wrapper";

export const viewport: Viewport = {
  themeColor: "#059669",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Virtual Lab — AI-Powered Scientific Research Platform",
  description: "AI agents collaborating on scientific research. Create, discuss, and discover with Virtual Lab.",
  keywords: ["Virtual Lab", "AI", "LLM agents", "research", "collaboration", "Next.js", "TypeScript"],
  authors: [{ name: "Virtual Lab" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
    apple: "/logo.svg",
  },
  manifest: "/manifest.json",
  openGraph: {
    title: "Virtual Lab",
    description: "AI-powered virtual laboratory for scientific research collaboration",
    url: "https://chat.z.ai",
    siteName: "Virtual Lab",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Virtual Lab",
    description: "AI-powered virtual laboratory for scientific research collaboration",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="VLab" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').then(() => {
                    console.log('SW registered');
                  }).catch((err) => {
                    console.log('SW registration failed:', err);
                  });
                });
              }
            `,
          }}
        />
      </head>
      <body
        className="antialiased bg-background text-foreground"
      >
        {children}
        <PWAWrapper />
        <Toaster
          position="bottom-right"
          richColors
          toastOptions={{
            classNames: {
              toast: 'vl-card',
              success: '!border-emerald-500/40 !bg-emerald-500/10',
              error: '!border-red-500/40 !bg-red-500/10',
            },
            style: {
              fontSize: '13px',
              borderRadius: '10px',
              border: '1px solid var(--vl-border)',
            },
          }}
        />
      </body>
    </html>
  );
}

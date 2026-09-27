import type { Metadata } from "next";
import { Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { inter } from "@/lib/fonts";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sync Hub Resto",
  description: "QR table ordering, kitchen display, cashier and multi-branch restaurant management.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistMono.variable} ${jakarta.variable} ${inter.variable}`}>
      <head>
        {/* Only the weight + fill axes the UI uses; the full variable font is several times larger */}
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      {/* One design everywhere: the warm Sync Hub Resto theme from the landing and login pages */}
      <body className="theme-resto bg-background font-body-md text-on-surface antialiased min-h-screen">{children}</body>
    </html>
  );
}

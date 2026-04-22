import type { Metadata } from "next";
import { Inter, Maven_Pro } from "next/font/google";
import { Providers } from "../components/Providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const mavenPro = Maven_Pro({ subsets: ["latin"], variable: "--font-maven", display: "swap" });

export const metadata: Metadata = {
  title: "ThreeZinc SEO Dashboard",
  description: "Next.js frontend for the ThreeZinc SEO strategy platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${mavenPro.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

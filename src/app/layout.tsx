import type { Metadata } from "next";
import { Poppins, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ConfirmProvider } from "@/components/confirm-provider";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kelatos — Dashboard",
  description: "Panel de gestión de reparaciones Kelatos",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ConfirmProvider>
          {children}
        </ConfirmProvider>
        <Toaster richColors position="top-right" offset={{ top: "72px" }} />
      </body>
    </html>
  );
}

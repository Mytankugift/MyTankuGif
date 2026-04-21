import type { Metadata } from "next";
import { Poppins, Plus_Jakarta_Sans } from "next/font/google";
import { QueryProvider } from "@/lib/providers/query-provider";
import { ToastProvider } from "@/lib/contexts/toast-context";
import { ToastContainer } from "@/components/ui/toast-container";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-plus-jakarta",
});

export const metadata: Metadata = {
  title: "TANKU",
  description: "TANKU",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${poppins.variable} ${plusJakartaSans.variable} antialiased`}
        style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}
      >
        <QueryProvider>
          <ToastProvider>
            {children}
            <ToastContainer />
          </ToastProvider>
        </QueryProvider>
      </body>
    </html>
  );
}

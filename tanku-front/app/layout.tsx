import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { QueryProvider } from "@/lib/providers/query-provider";
import { ToastProvider } from "@/lib/contexts/toast-context";
import { ToastContainer } from "@/components/ui/toast-container";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
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
      <body className={`${poppins.variable} antialiased`} style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
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

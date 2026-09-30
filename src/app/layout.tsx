import type { Metadata, Viewport } from "next";
import { galponFontVars } from "@/lib/galpon-fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gestión Avícola — MAC",
  description:
    "MAC — gestión de ventas, compras, clientes y proveedores de pollo en pie.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1e3a5f",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${galponFontVars} h-full`} suppressHydrationWarning>
      <body className="min-h-full antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}

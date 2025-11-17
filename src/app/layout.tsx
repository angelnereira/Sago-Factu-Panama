import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SAGO-FACTU Panamá",
  description: "SaaS de Facturación Electrónica Multi-Tenant para Panamá",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}

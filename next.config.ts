import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hide the floating Next.js "N" / turbopack badge in local/dev.
  devIndicators: false,
  // Cursor's preview talks to the dev server as 127.0.0.1.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  async redirects() {
    return [
      {
        source: "/pagos",
        destination: "/ventas",
        permanent: false,
      },
      {
        source: "/ventas/clientes",
        destination: "/clientes",
        permanent: false,
      },
      {
        source: "/proveedores/compras",
        destination: "/compras",
        permanent: false,
      },
      {
        source: "/proveedores/compras/:id",
        destination: "/compras/:id",
        permanent: false,
      },
      {
        source: "/proveedores/compras/:id/editar",
        destination: "/compras/:id/editar",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;

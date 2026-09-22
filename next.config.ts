import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hide the floating Next.js "N" / turbopack badge in local/dev.
  devIndicators: false,
  async redirects() {
    return [
      {
        source: "/compras",
        destination: "/proveedores/compras",
        permanent: false,
      },
      {
        source: "/pagos",
        destination: "/ventas",
        permanent: false,
      },
      {
        source: "/clientes",
        destination: "/ventas/clientes",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;

import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // ✅ Compresión habilitada
  compress: true,
  
  // Configuración de webpack para resolver módulos desde el directorio correcto
  webpack: (config, { isServer }) => {
    // Resolver módulos solo desde el directorio del proyecto
    config.resolve.modules = [
      path.resolve(__dirname, 'node_modules'),
      'node_modules',
    ];
    // Asegurar que Tailwind se resuelva desde el directorio correcto
    config.resolve.alias = {
      ...config.resolve.alias,
      'tailwindcss': path.resolve(__dirname, 'node_modules', 'tailwindcss'),
    };
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'd39ru7awumhhs2.cloudfront.net',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.cloudfront.net',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.s3.amazonaws.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.s3.*.amazonaws.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        pathname: '/**',
      },
    ],
    // Configuración para manejar errores de imágenes
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    unoptimized: false,
    // ✅ Configuración optimizada de imágenes
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    qualities: [75, 85],
  },
  // ✅ Headers optimizados para performance
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
        ],
      },
      {
        source: '/_next/image',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
  // ✅ Optimizaciones experimentales
  experimental: {
    optimizeCss: true,
  },
};

export default nextConfig;

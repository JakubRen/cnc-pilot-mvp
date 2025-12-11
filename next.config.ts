import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";
import createMDX from "@next/mdx";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  // Wyłączamy PWA tymczasowo - next-pwa nie wspiera Turbopack
  // TODO: Dodaj PWA po migracji na webpack lub użyj alternatywnego rozwiązania
  turbopack: {}, // Wyłącza warning Turbopack
  pageExtensions: ['js', 'jsx', 'mdx', 'ts', 'tsx'], // Dodaj support dla MDX

  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          }
        ]
      }
    ]
  }
}

// Najprostsza konfiguracja MDX - Turbopack nie wspiera pluginów z serializacją
const withMDX = createMDX({
  extension: /\.mdx?$/,
});

export default withMDX(withBundleAnalyzer(nextConfig));

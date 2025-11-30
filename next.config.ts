import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  // Wyłączamy PWA tymczasowo - next-pwa nie wspiera Turbopack
  // TODO: Dodaj PWA po migracji na webpack lub użyj alternatywnego rozwiązania
  turbopack: {}, // Wyłącza warning Turbopack
}

export default withBundleAnalyzer(nextConfig);

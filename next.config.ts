import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Wyłączamy PWA tymczasowo - next-pwa nie wspiera Turbopack
  // TODO: Dodaj PWA po migracji na webpack lub użyj alternatywnego rozwiązania
  turbopack: {}, // Wyłącza warning Turbopack
}

export default nextConfig;

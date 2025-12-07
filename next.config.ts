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
}

const withMDX = createMDX({
  // Opcjonalnie: Dodaj remark/rehype plugins tutaj
  extension: /\.mdx?$/,
  options: {
    remarkPlugins: [],
    rehypePlugins: [],
  },
});

export default withMDX(withBundleAnalyzer(nextConfig));

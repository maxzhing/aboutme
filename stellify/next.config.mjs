/**
 * Stellify build configuration.
 *
 * Two build targets, both free:
 *  - default (`npm run build`): Node/Vercel build. Includes the optional /api/tutor route
 *    that proxies the Gemini free tier with a server-side key.
 *  - static (`npm run build:static`): fully static export for GitHub Pages / any static host.
 *    API routes use the `.server.ts` extension, so they are simply not part of a static build;
 *    the AI tutor then runs in its deterministic offline mode.
 */
const isStatic = process.env.STATIC_EXPORT === '1';
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  pageExtensions: isStatic ? ['tsx', 'ts'] : ['tsx', 'ts', 'server.ts'],
  eslint: { ignoreDuringBuilds: true },
  ...(isStatic
    ? { output: 'export', trailingSlash: true, images: { unoptimized: true }, basePath: basePath || undefined }
    : {}),
};

export default nextConfig;

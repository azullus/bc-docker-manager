/** @type {import('next').NextConfig} */

// Use static export only for Electron builds (set ELECTRON_BUILD=1)
const isElectronBuild = process.env.ELECTRON_BUILD === '1';

const nextConfig = {
  // Enable static export only for Electron production builds
  // For dev/web mode, we need API routes which require server-side rendering
  ...(isElectronBuild && { output: 'export' }),

  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns'],
    ...(isElectronBuild && {
      missingSuspenseWithCSRBailout: false,
    }),
  },

  // Disable image optimization for static export (Electron needs unoptimized)
  images: {
    unoptimized: true,
  },

  // Allow connecting to Docker socket (for dev server mode)
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('dockerode');
    }
    return config;
  },

  // Trailing slash for proper file:// navigation in Electron
  trailingSlash: true,

  // Security headers for web mode
  ...(!isElectronBuild && {
    async headers() {
      return [
        {
          source: '/:path*',
          headers: [
            { key: 'X-Content-Type-Options', value: 'nosniff' },
            { key: 'X-Frame-Options', value: 'DENY' },
            { key: 'X-XSS-Protection', value: '1; mode=block' },
            { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
            { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
            { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
            { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' ws://localhost:* wss://localhost:*; font-src 'self'; frame-ancestors 'none'" },
          ],
        },
      ];
    },
  }),
};

module.exports = nextConfig;

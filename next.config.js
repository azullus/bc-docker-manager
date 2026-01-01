/** @type {import('next').NextConfig} */

// Use static export only for Electron builds (set ELECTRON_BUILD=1)
const isElectronBuild = process.env.ELECTRON_BUILD === '1';

const nextConfig = {
  // Enable static export only for Electron production builds
  // For dev/web mode, we need API routes which require server-side rendering
  ...(isElectronBuild && { output: 'export' }),

  // Disable image optimization for static export
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

  // Exclude API routes from static export (they're handled by Electron IPC)
  ...(isElectronBuild && {
    experimental: {
      // Skip generating API routes in static export
      missingSuspenseWithCSRBailout: false,
    },
  }),
};

module.exports = nextConfig;

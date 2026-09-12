import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@turnero/shared'],
  async headers() {
    const security = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-Frame-Options', value: 'DENY' },
    ];
    if (process.env.NODE_ENV === 'production') {
      security.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=15552000; includeSubDomains',
      });
    }

    return [
      // Assets con hash: cache largo (si cambia el build, cambia el nombre)
      {
        source: '/_next/static/:path*',
        headers: [
          ...security,
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // HTML y resto: nunca cachear → el browser siempre pide la versión nueva
      {
        source: '/:path*',
        headers: [
          ...security,
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, max-age=0',
          },
        ],
      },
    ];
  },
};

export default nextConfig;

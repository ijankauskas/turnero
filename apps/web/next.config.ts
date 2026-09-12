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
    return [{ source: '/:path*', headers: security }];
  },
};

export default nextConfig;

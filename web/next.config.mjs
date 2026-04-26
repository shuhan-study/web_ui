/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingIncludes: {
    '/**/*': ['./prisma/dev.db'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex' }],
      },
    ];
  },
};

export default nextConfig;

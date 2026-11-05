import type { NextConfig } from 'next';

const config: NextConfig = {
  devIndicators: false,
  // shared y design-system se consumen como código fuente del monorepo.
  transpilePackages: ['@red-clinica/shared', '@red-clinica/design-system'],
  // La API (NestJS) corre aparte; el proxy deja la cookie de sesión en el mismo origen.
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${process.env.API_URL ?? 'http://localhost:3000'}/api/:path*` }];
  },
  webpack(cfg) {
    // shared importa './x.js' apuntando a archivos .ts (ESM de TypeScript).
    cfg.resolve.extensionAlias = { '.js': ['.ts', '.tsx', '.js'] };
    return cfg;
  },
};

export default config;

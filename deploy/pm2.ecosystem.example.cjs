/**
 * Ejemplo PM2: Boxlybot en modo standalone en el mismo server que Hermes.
 *
 * 1) npm ci && npm run build   (postbuild copia estáticos al standalone)
 * 2) Copiar este archivo y editar rutas / variables.
 * 3) pm2 start deploy/pm2.ecosystem.example.cjs
 *
 * cwd debe ser .next/standalone (donde está server.js).
 */

module.exports = {
  apps: [
    {
      name: "boxlybot-next",
      cwd: "/ruta/al/repo/boxlybot/.next/standalone",
      script: "server.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        HOSTNAME: "127.0.0.1",
        HERMES_DATA_DIR: "/ruta/compartida/hermes-data",
      },
    },
  ],
};

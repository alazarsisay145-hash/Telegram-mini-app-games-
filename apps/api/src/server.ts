import { createApp } from './app';
import { getEnv } from '@nexus/security';

const env = getEnv();
const app = createApp();

app
  .listen({ port: env.API_PORT, host: '0.0.0.0' })
  .then(() => app.log.info(`API running on port ${env.API_PORT}`))
  .catch((error) => {
    app.log.error(error);
    process.exit(1);
  });

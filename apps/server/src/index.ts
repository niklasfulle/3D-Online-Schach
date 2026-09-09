import cors from '@fastify/cors';
import Fastify from 'fastify';

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });

app.get('/health', async () => ({ status: 'ok', service: 'chess3d-server' }));

const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? '127.0.0.1';

try {
  await app.listen({ host, port });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}

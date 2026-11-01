import 'dotenv/config';
import { createApp } from './app';
import { Store } from './store';
const store = new Store(process.env.DATABASE_PATH || './data/realms.sqlite');
const host = process.env.HOST || '127.0.0.1',
  port = Number(process.env.PORT) || 3001;
const server = createApp(store).listen(port, host, () =>
  console.log(`Живые миры: http://${host}:${port}`),
);
function shutdown() {
  server.close(() => {
    store.close();
    process.exit(0);
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

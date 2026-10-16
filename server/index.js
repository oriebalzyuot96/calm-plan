import { createServer } from './app.js';
import { loadConfig } from './config.js';

const config = loadConfig();
const server = createServer(config);

server.listen(config.port, () => {
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : config.port;
  console.log(`Calm Plan is running on http://localhost:${port}`);
  if (config.anthropicApiKey) console.log('Chat: Anthropic API enabled, with local fallback.');
  else console.log('Chat: local responder only (set ANTHROPIC_API_KEY to enable the API).');
});

function shutdown() {
  server.close(() => process.exit(0));
  server.closeAllConnections();
  setTimeout(() => process.exit(0), 2000).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { ENV } from './server/src/config/env.js';
import { connectDB, getDBStatus } from './server/src/config/db.js';
import apiRouter from './server/src/routes/api.js';
import { errorHandler } from './server/src/middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = parseInt(ENV.PORT, 10) || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  // Middlewares
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Connect to MongoDB Atlas (graceful connection state tracking)
  await connectDB();

  // Health and Diagnostic endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'Saylani HCM Lite Full-Stack AI Server',
      db: getDBStatus(),
      timestamp: new Date().toISOString(),
    });
  });

  // Mount API Router
  app.use('/api', apiRouter);

  // Centralized Error Handler
  app.use(errorHandler);

  // Vite integration: development middlewares or production static files
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 [Saylani HCM Lite] Server running at http://localhost:${PORT}`);
    console.log(`📊 API endpoints available at http://localhost:${PORT}/api`);
  });
}

startServer().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});

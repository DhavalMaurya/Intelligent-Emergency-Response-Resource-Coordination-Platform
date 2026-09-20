import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './routes/auth.routes.js';
import incidentsRoutes from './routes/incidents.routes.js';
import resourcesRoutes from './routes/resources.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import systemRoutes from './routes/system.routes.js';
import intakeRoutes from './routes/intake.routes.js';
import aiRoutes from './routes/ai.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import hospitalRoutes from './routes/hospital.routes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { env } from './config/env.js';

export const createApp = () => {
  const app = express();

  // Security & Utility Middleware
  app.use(helmet());
  app.use(
    cors({
      origin: [env.CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Root Health Check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      system: 'SENTINEL — Smart Emergency Network & Triage Ingestion Layer',
      timestamp: new Date().toISOString(),
    });
  });

  // API v1 Routing Architecture
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/incidents', incidentsRoutes);
  app.use('/api/v1/resources', resourcesRoutes);
  app.use('/api/v1/analytics', analyticsRoutes);
  app.use('/api/v1/hospitals', hospitalRoutes);
  app.use('/api/v1/system', systemRoutes);
  app.use('/api/v1/intake', intakeRoutes);
  app.use('/api/v1/ai', aiRoutes);
  app.use('/api/v1/notifications', notificationRoutes);

  // 404 Handler
  app.use('*', (req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Endpoint ${req.originalUrl} not found on this server.`,
      },
    });
  });

  // Global Error Handler
  app.use(errorHandler);

  return app;
};

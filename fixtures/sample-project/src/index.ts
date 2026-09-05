import express from 'express';
import { UserController } from './controllers/user.controller.js';
import { AuthService } from './services/auth.service.js';
import { DatabaseService } from './services/database.service.js';
import { errorHandler } from './middleware/error-handler.js';
import type { AppConfig } from './types/config.js';

const config: AppConfig = {
  port: Number(process.env.PORT) || 3000,
  databaseUrl: process.env.DATABASE_URL || 'sqlite://data.db',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret',
};

const app = express();
app.use(express.json());

// Initialize services
const db = new DatabaseService(config.databaseUrl);
const authService = new AuthService(config.jwtSecret);
const userController = new UserController(db, authService);

// Routes
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/users', (req, res, next) => userController.create(req, res).catch(next));
app.get('/api/users/:id', (req, res, next) => userController.getById(req, res).catch(next));
app.put('/api/users/:id', (req, res, next) => userController.update(req, res).catch(next));
app.delete('/api/users/:id', (req, res, next) => userController.delete(req, res).catch(next));
app.post('/api/auth/login', (req, res, next) => userController.login(req, res).catch(next));

app.use(errorHandler);

export function startServer(): void {
  app.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
  });
}

export { app };

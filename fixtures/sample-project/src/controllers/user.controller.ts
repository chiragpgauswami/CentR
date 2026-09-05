import type { Request, Response } from 'express';
import type { DatabaseService } from '../services/database.service.js';
import type { AuthService } from '../services/auth.service.js';
import type { CreateUserRequest, UpdateUserRequest, LoginRequest } from '../types/config.js';

export class UserController {
  constructor(
    private readonly db: DatabaseService,
    private readonly auth: AuthService,
  ) {}

  async create(req: Request, res: Response): Promise<void> {
    const data: CreateUserRequest = req.body;

    if (!data.email || !data.name || !data.password) {
      res.status(400).json({ success: false, error: 'Missing required fields' });
      return;
    }

    const existing = await this.db.findUserByEmail(data.email);
    if (existing) {
      res.status(409).json({ success: false, error: 'Email already exists' });
      return;
    }

    const passwordHash = await this.auth.hashPassword(data.password);
    const user = await this.db.createUser({
      ...data,
      password: passwordHash,
    });

    res.status(201).json({
      success: true,
      data: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  }

  async getById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const user = await this.db.findUserById(id);

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    res.json({
      success: true,
      data: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  }

  async update(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const data: UpdateUserRequest = req.body;

    const user = await this.db.updateUser(id, data);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    res.json({
      success: true,
      data: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  }

  async delete(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const deleted = await this.db.deleteUser(id);

    if (!deleted) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    res.json({ success: true });
  }

  async login(req: Request, res: Response): Promise<void> {
    const data: LoginRequest = req.body;

    if (!data.email || !data.password) {
      res.status(400).json({ success: false, error: 'Missing credentials' });
      return;
    }

    const user = await this.db.findUserByEmail(data.email);
    if (!user) {
      res.status(401).json({ success: false, error: 'Invalid credentials' });
      return;
    }

    const valid = await this.auth.verifyPassword(data.password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ success: false, error: 'Invalid credentials' });
      return;
    }

    const token = this.auth.generateToken(user.id);
    res.json({ success: true, data: token });
  }
}

import type { User, CreateUserRequest, UpdateUserRequest } from '../types/config.js';

export class DatabaseService {
  private users: Map<string, User> = new Map();
  private nextId = 1;

  constructor(private readonly connectionUrl: string) {
    console.log(`Database initialized with: ${connectionUrl}`);
  }

  async createUser(data: CreateUserRequest & { password: string }): Promise<User> {
    const id = String(this.nextId++);
    const user: User = {
      id,
      email: data.email,
      name: data.name,
      passwordHash: data.password,
      role: data.role || 'user',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async findUserById(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async findUserByEmail(email: string): Promise<User | undefined> {
    for (const user of this.users.values()) {
      if (user.email === email) return user;
    }
    return undefined;
  }

  async updateUser(id: string, data: UpdateUserRequest): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;

    const updated: User = {
      ...user,
      ...data,
      updatedAt: new Date(),
    };
    this.users.set(id, updated);
    return updated;
  }

  async deleteUser(id: string): Promise<boolean> {
    return this.users.delete(id);
  }

  async listUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }
}

import type { AuthToken } from '../types/config.js';

export class AuthService {
  constructor(private readonly secret: string) {}

  async hashPassword(password: string): Promise<string> {
    // Simple hash for demo - in production use bcrypt
    const encoder = new TextEncoder();
    const data = encoder.encode(password + this.secret);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    const computed = await this.hashPassword(password);
    return computed === hash;
  }

  generateToken(userId: string): AuthToken {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const payload = JSON.stringify({ userId, exp: expiresAt.getTime() });
    const encoder = new TextEncoder();
    const token = Buffer.from(encoder.encode(payload + this.secret)).toString('base64url');
    return { token, expiresAt };
  }

  verifyToken(token: string): string | null {
    try {
      const decoded = Buffer.from(token, 'base64url').toString('utf-8');
      const payload = JSON.parse(decoded.slice(0, decoded.length - this.secret.length));
      if (payload.exp < Date.now()) return null;
      return payload.userId;
    } catch {
      return null;
    }
  }
}

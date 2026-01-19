import { User } from '@prisma/client';

declare global {
  namespace Express {
    interface User extends Omit<import('@prisma/client').User, 'createdAt' | 'updatedAt'> {
      createdAt: Date;
      updatedAt: Date;
    }

    interface Request {
      user?: User;
    }
  }
}

export {};

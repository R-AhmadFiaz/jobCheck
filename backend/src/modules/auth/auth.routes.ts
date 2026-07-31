import { Router } from 'express';
import { authenticate } from '@/shared/middlewares/auth.middleware';
import { validate } from '@/shared/middlewares/validate.middleware';
import { registerSchema, loginSchema } from '@/modules/auth/auth.validation';
import { register, login, refresh, logout, me } from '@/modules/auth/auth.controller';

export const authRouter = Router();

authRouter.post('/auth/register', validate(registerSchema), register);
authRouter.post('/auth/login', validate(loginSchema), login);
authRouter.post('/auth/refresh', refresh);
authRouter.post('/auth/logout', logout);
authRouter.get('/auth/me', authenticate, me);

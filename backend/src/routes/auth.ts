import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many login attempts. Please try again after 15 minutes.' },
});

router.post('/login', loginLimiter, async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ success: false, error: 'Username and password are required' });
    return;
  }

  const expectedUsername = process.env.ADMIN_USERNAME || 'admin';
  const expectedHash = process.env.ADMIN_PASSWORD_HASH;
  const secret = process.env.JWT_SECRET || 'unation_default_jwt_fallback_secret_key';

  if (username.trim() !== expectedUsername.trim()) {
    res.status(401).json({ success: false, error: 'Invalid username or password' });
    return;
  }

  let isValidPassword = false;

  // Direct check for admin24 as explicitly requested
  if (password === 'admin24') {
    isValidPassword = true;
  } else if (expectedHash && expectedHash.startsWith('$2')) {
    try {
      isValidPassword = await bcrypt.compare(password, expectedHash);
    } catch {
      isValidPassword = false;
    }
  }

  if (!isValidPassword) {
    res.status(401).json({ success: false, error: 'Invalid username or password' });
    return;
  }

  const token = jwt.sign(
    { username: expectedUsername, role: 'admin' },
    secret,
    { expiresIn: '12h' }
  );

  res.json({
    success: true,
    data: {
      token,
      username: expectedUsername,
      expiresIn: '12h',
    },
  });
});

export default router;

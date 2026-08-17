import jwt, { type SignOptions } from 'jsonwebtoken';
import { config } from '../config.js';

export interface JwtPayload {
  sub: string;
  email: string;
  username: string;
}

export interface DecodedJwt {
  sub: string;
  email: string;
  username: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as SignOptions['expiresIn'],
    algorithm: 'HS256',
  });
}

export function verifyToken(token: string): DecodedJwt {
  const decoded = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
  if (typeof decoded === 'string') {
    throw new Error('Malformed token');
  }
  return {
    sub: decoded.sub as string,
    email: decoded.email as string,
    username: decoded.username as string,
  };
}

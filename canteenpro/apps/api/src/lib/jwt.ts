import jwt from "jsonwebtoken";
import { env } from "../config/env";

export type TokenType = "platform" | "staff" | "employee";
export interface TokenPayload {
  sub: string;
  typ: TokenType;
  tid?: string; // tenant id
  role?: string;
}

export const signToken = (p: TokenPayload, expiresIn: string | number = "7d") =>
  jwt.sign(p, env.JWT_SECRET, { expiresIn } as jwt.SignOptions);

export const verifyToken = (token: string) =>
  jwt.verify(token, env.JWT_SECRET) as TokenPayload & {
    iat: number;
    exp: number;
  };

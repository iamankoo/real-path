import crypto from "node:crypto";
import { promisify } from "node:util";
import bcrypt from "bcryptjs";

const scrypt = promisify(crypto.scrypt);
const keyLength = 64;

const getSecret = () =>
  process.env.REAL_PATH_SESSION_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  (process.env.NODE_ENV === "production" ? "" : "real-path-dev-secret");

export class ServerConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ServerConfigError";
  }
}

export const getRequiredSecret = () => {
  const secret = getSecret();

  if (!secret) {
    throw new ServerConfigError(
      "REAL_PATH_SESSION_SECRET must be configured before authentication can run in production.",
    );
  }

  return secret;
};

export const hashPassword = async (password: string) => {
  return bcrypt.hash(password, 12);
};

export const verifyPassword = async (password: string, storedHash: string) => {
  if (storedHash.startsWith("$2")) {
    return bcrypt.compare(password, storedHash);
  }

  const [, salt, hash] = storedHash.split("$");

  if (!salt || !hash) {
    return false;
  }

  const derived = (await scrypt(password, salt, keyLength)) as Buffer;
  const stored = Buffer.from(hash, "base64url");

  return stored.length === derived.length && crypto.timingSafeEqual(stored, derived);
};

export const signValue = (value: string) =>
  crypto.createHmac("sha256", getRequiredSecret()).update(value).digest("base64url");

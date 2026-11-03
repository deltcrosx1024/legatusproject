import crypto from "node:crypto";

export const DISCORD_OAUTH_STATE_TTL_SECONDS = 10 * 60;

export const createOAuthState = () =>
  crypto.randomBytes(32).toString("base64url");

export const hashOAuthState = (state) =>
  crypto.createHash("sha256").update(state).digest("hex");

export function getOAuthEncryptionKey() {
  const configuredKey = process.env.OAUTH_TOKEN_ENCRYPTION_KEY;

  if (!configuredKey) {
    throw new Error("OAUTH_TOKEN_ENCRYPTION_KEY must be configured.");
  }

  const base64Key = configuredKey.trim();

  if (!/^[\da-zA-Z+/]{43}=$/.test(base64Key)) {
    throw new Error(
      "OAUTH_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key.",
    );
  }

  const key = Buffer.from(base64Key, "base64");

  if (key.length !== 32) {
    throw new Error(
      "OAUTH_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key.",
    );
  }

  return key;
}

export function encryptOAuthToken(token) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(
    "aes-256-gcm",
    getOAuthEncryptionKey(),
    iv,
  );
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(token), "utf8"),
    cipher.final(),
  ]);

  return [
    "v1",
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(":");
}

export function decryptOAuthToken(encryptedToken) {
  const [version, encodedIv, encodedTag, encodedCiphertext] =
    encryptedToken.split(":");

  if (version !== "v1" || !encodedIv || !encodedTag || !encodedCiphertext) {
    throw new Error("The stored OAuth token has an unsupported format.");
  }

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getOAuthEncryptionKey(),
    Buffer.from(encodedIv, "base64url"),
  );

  decipher.setAuthTag(Buffer.from(encodedTag, "base64url"));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(encodedCiphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");

  return JSON.parse(plaintext);
}

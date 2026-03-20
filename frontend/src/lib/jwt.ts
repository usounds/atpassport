import { SignJWT, importPKCS8 } from "jose";

const PRIVATE_KEY = process.env.JWT_PRIVATE_KEY; // Base64 encoded PKCS8 or literal
const ALG = "RS256";

export async function signPassportToken(payload: any): Promise<string> {
  if (!PRIVATE_KEY) {
    // Development fallback or throw error
    throw new Error("JWT_PRIVATE_KEY is not defined");
  }

  const pkcs8 = PRIVATE_KEY.includes("BEGIN PRIVATE KEY") 
    ? PRIVATE_KEY 
    : Buffer.from(PRIVATE_KEY, 'base64').toString();

  const key = await importPKCS8(pkcs8, ALG);

  return await new SignJWT(payload)
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime("1h")
    .setIssuer("atpassport")
    .sign(key);
}

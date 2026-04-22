import * as jose from "jose";

const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const ISSUER = "https://accounts.google.com";

// Cache for the JWK set to avoid fetching it every time
let jwks: ReturnType<typeof jose.createRemoteJWKSet> | null = null;

export async function verifyGoogleIdToken(token: string, clientId: string): Promise<string | null> {
  try {
    if (!jwks) {
      jwks = jose.createRemoteJWKSet(new URL(GOOGLE_JWKS_URL));
    }

    const { payload } = await jose.jwtVerify(token, jwks, {
      issuer: ISSUER,
      audience: clientId,
    });

    // The 'sub' field is the unique Google User ID
    return payload.sub || null;
  } catch (error) {
    console.error("[AUTH] Verification failed:", error);
    return null;
  }
}

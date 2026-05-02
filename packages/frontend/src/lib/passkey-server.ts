import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type VerifiedRegistrationResponse,
  type VerifiedAuthenticationResponse,
  type RegistrationResponseJSON,
  type AuthenticationResponseJSON,
} from '@simplewebauthn/server';
import { addPasskey, getPasskey, updatePasskeyCounter, getPasskeysByUuid, type PasskeyDevice } from './models';

// RP = Relying Party (your website)
const rpName = 'AtPassport';
const rpID = process.env.NODE_ENV === 'production' ? 'atpassport.net' : 'localhost';
const origin = process.env.NODE_ENV === 'production' ? `https://${rpID}` : `http://${rpID}:3001`;

/**
 * Registration: Step 1 - Generate options for the browser
 */
export async function getRegistrationOptions(uuid: string) {
  const userPasskeys = await getPasskeysByUuid(uuid);

  return await generateRegistrationOptions({
    rpName,
    rpID,
    userID: uuid,
    userName: `user-${uuid.slice(0, 8)}`,
    attestationType: 'none',
    excludeCredentials: userPasskeys.map(pk => ({
      id: pk.credentialID,
      type: 'public-key',
      transports: pk.transports as AuthenticatorTransport[],
    })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
  });
}

/**
 * Registration: Step 2 - Verify the response from the browser
 */
export async function verifyRegistration(uuid: string, body: RegistrationResponseJSON, expectedChallenge: string) {
  let verification: VerifiedRegistrationResponse;
  try {
    verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });
  } catch (error) {
    console.error('Registration verification failed:', error);
    throw error;
  }

  const { verified, registrationInfo } = verification;

  if (verified && registrationInfo) {
    const { credentialID, publicKey, counter } = registrationInfo;

    const newPasskey: PasskeyDevice = {
      credentialID: Buffer.from(credentialID).toString('base64url'),
      publicKey: Buffer.from(publicKey).toString('base64url'),
      counter,
      uuid,
      transports: body.response.transports,
      createdAt: new Date().toISOString(),
    };

    await addPasskey(newPasskey);
    return { success: true };
  }

  return { success: false };
}

/**
 * Authentication: Step 1 - Generate options for the browser
 */
export async function getAuthenticationOptions() {
  return await generateAuthenticationOptions({
    rpID,
    userVerification: 'preferred',
  });
}

/**
 * Authentication: Step 2 - Verify the response from the browser
 */
export async function verifyAuthentication(body: AuthenticationResponseJSON, expectedChallenge: string) {
  const credentialID = body.id;
  const passkey = await getPasskey(credentialID);

  if (!passkey) {
    throw new Error('Passkey not found');
  }

  let verification: VerifiedAuthenticationResponse;
  try {
    verification = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      authenticator: {
        credentialID: Buffer.from(passkey.credentialID, 'base64url'),
        credentialPublicKey: Buffer.from(passkey.publicKey, 'base64url'),
        counter: passkey.counter,
        transports: passkey.transports as AuthenticatorTransport[],
      },
    });
  } catch (error) {
    console.error('Authentication verification failed:', error);
    throw error;
  }

  const { verified, authenticationInfo } = verification;

  if (verified) {
    // Update counter in DB
    await updatePasskeyCounter(passkey.credentialID, authenticationInfo.newCounter);
    return { success: true, uuid: passkey.uuid };
  }

  return { success: false };
}

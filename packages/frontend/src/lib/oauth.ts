'use client';

import type { DidDocument } from '@atcute/identity';
import {
  LocalActorResolver
} from '@atcute/identity-resolver';
import type { AtprotoDid } from '@atcute/lexicons/syntax';
import { configureOAuth } from '@atcute/oauth-browser-client';

import { resolveDidDoc, resolveHandle } from './actions';

let initialized = false;
let lastRedirectUri = '';

class ProxyHandleResolver {
  async resolve(handle: string): Promise<AtprotoDid> {
    const result = await resolveHandle(handle);
    if (!result?.did) {
      throw new Error('Handle not found');
    }
    return result.did as AtprotoDid;
  }
}

class ProxyDidDocumentResolver {
  async resolve(did: string): Promise<DidDocument> {
    const doc = await resolveDidDoc(did);
    if (!doc) {
      throw new Error('DID document not found');
    }
    return doc as DidDocument;
  }
}

export function initOAuth(customRedirectUri?: string) {
  if (typeof window === 'undefined') return;

  const origin = window.location.origin;
  const redirectUri = customRedirectUri || (window.location.origin + window.location.pathname);

  // Already initialized with the same redirect_uri
  if (initialized && lastRedirectUri === redirectUri) return;

  configureOAuth({
    metadata: {
      client_id: `${origin}/oauth-client-metadata.json`,
      redirect_uri: redirectUri,
    },
    identityResolver: new LocalActorResolver({
      handleResolver: new ProxyHandleResolver(),
      didDocumentResolver: new ProxyDidDocumentResolver(),
    }),
  });

  initialized = true;
  lastRedirectUri = redirectUri;
}

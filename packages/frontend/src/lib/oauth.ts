'use client';

import type { DidDocument } from '@atcute/identity';
import {
  LocalActorResolver
} from '@atcute/identity-resolver';
import type { AtprotoDid } from '@atcute/lexicons/syntax';
import { configureOAuth } from '@atcute/oauth-browser-client';

import { resolveDidDoc, resolveHandle } from './actions';

let initialized = false;

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

export function initOAuth() {
  if (initialized || typeof window === 'undefined') return;

  const origin = window.location.origin;
  // 認証完了後にこのページに必ず戻るように、現在のパスを redirect_uri とする
  const redirectUri = window.location.origin + window.location.pathname;

  configureOAuth({
    // atcute 3.0.0 では、metadata は object で client_id と redirect_uri を指定する必要がある
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
}

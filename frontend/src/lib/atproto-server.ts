import { 
  CompositeHandleResolver, 
  WellKnownHandleResolver, 
  CompositeDidDocumentResolver, 
  PlcDidDocumentResolver, 
  WebDidDocumentResolver, 
  LocalActorResolver,
  type DidDocumentResolver
} from "@atcute/identity-resolver";
import { NodeDnsHandleResolver } from "@atcute/identity-resolver-node";

// Setup handle resolver with DNS and HTTP methods
const handleResolver = new CompositeHandleResolver({
  methods: {
    dns: new NodeDnsHandleResolver(),
    http: new WellKnownHandleResolver(),
  },
});

/**
 * Custom PLC resolver that tries plc.wtf first, then falls back to plc.directory
 */
class FallbackPlcResolver implements DidDocumentResolver {
  private primary = new PlcDidDocumentResolver({ apiUrl: 'https://plc.wtf' });
  private fallback = new PlcDidDocumentResolver(); // Default is https://plc.directory

  async resolve(did: `did:${string}`) {
    console.log(`[FallbackPlcResolver] Resolving ${did}`);
    try {
      console.log(`[FallbackPlcResolver] Attempting primary (plc.wtf)...`);
      const result = await this.primary.resolve(did as `did:plc:${string}`);
      console.log(`[FallbackPlcResolver] Primary (plc.wtf) success!`);
      return result;
    } catch (e: unknown) {
      const error = e as { message?: string };
      console.warn(`[FallbackPlcResolver] Primary (plc.wtf) failed, trying fallback (plc.directory). Error: ${error?.message || e}`);
      try {
        const fallbackResult = await this.fallback.resolve(did as `did:plc:${string}`);
        console.log(`[FallbackPlcResolver] Fallback (plc.directory) success!`);
        return fallbackResult;
      } catch (e2: unknown) {
        const error2 = e2 as { message?: string };
        console.error(`[FallbackPlcResolver] Both resolvers failed for ${did}. Secondary error: ${error2?.message || e2}`);
        throw e2;
      }
    }
  }
}

// Setup DID document resolver for did:plc and did:web
const didResolver = new CompositeDidDocumentResolver({
  methods: {
    plc: new FallbackPlcResolver(),
    web: new WebDidDocumentResolver(),
  },
});

// Setup actor resolver that combines handle and DID resolution
const actorResolver = new LocalActorResolver({
  handleResolver,
  didDocumentResolver: didResolver,
});

export async function resolveIdentity(handleOrDid: string) {
  try {
    const actor = await actorResolver.resolve(handleOrDid);
    
    if (!actor.did || !actor.pds) {
      return null;
    }

    return { 
      did: actor.did, 
      handle: actor.handle,
      pdsUrl: actor.pds 
    };
  } catch (e: unknown) {
    // 存在しないハンドルなどの「見つからない」系エラーは警告レベルに留める
    const error = e as { name?: string; cause?: { name?: string } };
    if (error?.name === 'ActorResolutionError' || error?.cause?.name === 'DidNotFoundError') {
      console.warn(`[resolveIdentity] Identity not found for ${handleOrDid}`);
    } else {
      console.error(`[resolveIdentity] Unexpected error for ${handleOrDid}:`, e);
    }
    return null;
  }
}

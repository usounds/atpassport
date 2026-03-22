import { 
  CompositeHandleResolver, 
  WellKnownHandleResolver, 
  CompositeDidDocumentResolver, 
  PlcDidDocumentResolver, 
  WebDidDocumentResolver, 
  LocalActorResolver 
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
class FallbackPlcResolver {
  private primary = new PlcDidDocumentResolver({ apiUrl: 'https://plc.wtf' });
  private fallback = new PlcDidDocumentResolver(); // Default is https://plc.directory

  async resolve(did: string) {
    console.log(`[FallbackPlcResolver] Resolving ${did}`);
    try {
      console.log(`[FallbackPlcResolver] Attempting primary (plc.wtf)...`);
      const result = await this.primary.resolve(did as `did:plc:${string}`);
      console.log(`[FallbackPlcResolver] Primary (plc.wtf) success!`);
      return result;
    } catch (e: any) {
      console.warn(`[FallbackPlcResolver] Primary (plc.wtf) failed, trying fallback (plc.directory). Error: ${e?.message || e}`);
      try {
        const fallbackResult = await this.fallback.resolve(did as `did:plc:${string}`);
        console.log(`[FallbackPlcResolver] Fallback (plc.directory) success!`);
        return fallbackResult;
      } catch (e2: any) {
        console.error(`[FallbackPlcResolver] Both resolvers failed for ${did}. Secondary error: ${e2?.message || e2}`);
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
    const actor = await actorResolver.resolve(handleOrDid as any);
    
    if (!actor.did || !actor.pds) {
      return null;
    }

    return { 
      did: actor.did, 
      handle: actor.handle,
      pdsUrl: actor.pds 
    };
  } catch (e) {
    console.error(`Failed to resolve identity for ${handleOrDid}:`, e);
    return null;
  }
}

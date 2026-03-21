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

// Setup DID document resolver for did:plc and did:web
const didResolver = new CompositeDidDocumentResolver({
  methods: {
    plc: new PlcDidDocumentResolver(),
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
      pdsUrl: actor.pds 
    };
  } catch (e) {
    console.error(`Failed to resolve identity for ${handleOrDid}:`, e);
    return null;
  }
}

/**
 * Options for initializing the AtPassport client.
 */
export interface AtPassportOptions {
  /**
   * The URL of your application where AtPassport will redirect back after handle selection.
   * This URL will receive parameters like `handle`, `did`, and `pdsurl`.
   */
  callbackUrl: string;

  /**
   * The base URL of the AtPassport service. 
   * Defaults to "https://atpassport.net" if not provided.
   */
  baseUrl?: string;

  /**
   * Preferred language for the AtPassport UI ('en', 'ja', 'pt', 'de', 'fr', 'es').
   * If not specified, the service will use its default (usually 'en').
   */
  lang?: 'en' | 'ja' | 'pt' | 'de' | 'fr' | 'es';
}

/**
 * AtPassport Client
 * Facilitates the integration of AtPassport authentication and handle management 
 * into atproto-compatible applications.
 * 
 * @template T The shape of required custom parameters, inferred from the constructor.
 */
export class AtPassport<T extends Record<string, any> = {}> {
  private readonly baseUrl: string;
  private readonly callbackUrl: string;
  private readonly lang?: 'en' | 'ja' | 'pt' | 'de' | 'fr' | 'es';
  private readonly requiredKeys: string[];

  /**
   * Creates a new instance of the AtPassport client.
   * @param options Configuration options for the client.
   * @param options.requiredParams An object defining required custom parameters. 
   *                               The keys of this object will be enforced at compile time 
   *                               and runtime.
   */
  constructor(options: AtPassportOptions & { requiredParams?: T }) {
    this.baseUrl = (options.baseUrl || "https://atpassport.net").replace(/\/$/, "");
    this.callbackUrl = options.callbackUrl;
    this.lang = options.lang;
    this.requiredKeys = options.requiredParams ? Object.keys(options.requiredParams) : [];
  }

  /**
   * Validates that all required custom parameters are present.
   * @param customParams The parameters to validate at runtime.
   * @throws {Error} If any required parameter is missing or empty.
   */
  private _validateCustomParams(customParams?: Record<string, string>) {
    if (this.requiredKeys.length === 0) return;
    
    const missing = this.requiredKeys.filter(
      key => !customParams || !customParams[key] || customParams[key].trim() === ""
    );

    if (missing.length > 0) {
      throw new Error(`Missing required custom parameters: ${missing.join(", ")}`);
    }
  }

  /**
   * Generates a URL to redirect the user to the AtPassport handle selection screen.
   * 
   * @param customParams Key-value pairs to be passed through the callback.
   *                     If `requiredParams` were defined in the constructor, 
   *                     TypeScript will enforce those keys here.
   * @param options Additional options for generating the URL.
   * 
   * @returns An object containing:
   *          - `url`: The full AtPassport authentication URL.
   *          - `atpstate`: A unique CSRF state token prefixed with `atpstate-`.
   */
  generateAuthUrl(
    ...args: [keyof T] extends [never] 
      ? [customParams?: Record<string, string>, options?: { handle?: string }] 
      : [customParams: Record<keyof T, string> & Record<string, string>, options?: { handle?: string }]
  ): { url: string; atpstate: string } {
    const [customParams, options] = args;
    this._validateCustomParams(customParams as Record<string, string> | undefined);

    const atpstate = `atpstate-${crypto.randomUUID()}`; // Prefixed as per user request
    const authPath = this.lang ? `${this.lang}/authentication` : 'authentication';
    const url = new URL(`${this.baseUrl}/${authPath}`);
    
    const callback = new URL(this.callbackUrl);
    if (customParams) {
      for (const [key, value] of Object.entries(customParams)) {
        callback.searchParams.set(key, value as string);
      }
    }

    url.searchParams.set("callback", callback.toString());
    url.searchParams.set("atpstate", atpstate);

    if (options?.handle) {
      url.searchParams.set("handle", options.handle);
    }

    return { url: url.toString(), atpstate };
  }

  /**
   * Generates a URL to redirect the user directly to the AtPassport handle registration screen.
   * 
   * @param handle The handle to register or update.
   * @param customParams Key-value pairs to be passed through the callback.
   */
  generateAddUrl(
    handle: string, 
    ...args: [keyof T] extends [never] 
      ? [customParams?: Record<string, string>] 
      : [customParams: Record<keyof T, string> & Record<string, string>]
  ): { url: string; atpstate: string } {
    const [customParams] = args;
    this._validateCustomParams(customParams as Record<string, string> | undefined);

    const atpstate = `atpstate-${crypto.randomUUID()}`; // Prefixed as per user request
    const addPath = this.lang ? `${this.lang}/add` : 'add';
    const url = new URL(`${this.baseUrl}/${addPath}`);
    
    const callback = new URL(this.callbackUrl);
    if (customParams) {
      for (const [key, value] of Object.entries(customParams)) {
        callback.searchParams.set(key, value as string);
      }
    }

    url.searchParams.set("handle", handle);
    url.searchParams.set("callback", callback.toString());
    url.searchParams.set("atpstate", atpstate);

    return { url: url.toString(), atpstate };
  }

  /**
   * Parses the callback parameters from the URL.
   * It validates the URL matches the configured callback URL, verifies the CSRF state, 
   * and ensures all required custom parameters are present.
   * 
   * @param currentUrl The full callback URL received by the application.
   * @param expectedState The CSRF state token to verify.
   * 
   * @throws {Error} If the URL doesn't match the configuration, CSRF validation fails, 
   *                 or required custom parameters are missing.
   */
  parseCallback(currentUrl: string, expectedState?: string | null): {
    handle: string | null;
    did: string | null;
    pdsUrl: string | null;
    atpstate: string | null;
    customParams: Record<string, string>;
  } {
    const url = new URL(currentUrl);
    
    // Verify callback URL matches configuration (pathname must match)
    const expectedBase = new URL(this.callbackUrl);
    if (url.pathname !== expectedBase.pathname) {
      throw new Error(`Callback URL pathname mismatch. Expected: ${expectedBase.pathname}, Got: ${url.pathname}`);
    }

    const handle = url.searchParams.get("handle");
    const did = url.searchParams.get("did");
    const pdsUrl = url.searchParams.get("pdsurl");
    const atpstate = url.searchParams.get("atpstate");

    if (expectedState && atpstate !== expectedState) {
      throw new Error("Invalid atpstate: CSRF validation failed.");
    }

    const customParams: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
      if (!["handle", "did", "pdsurl", "atpstate"].includes(key)) {
        customParams[key] = value;
      }
    });

    // Validate that required custom parameters are present
    this._validateCustomParams(customParams);

    return { handle, did, pdsUrl, atpstate, customParams };
  }

  /**
   * Opens the handle picker popup.
   */
  async pick(): Promise<string> {
    return new Promise((resolve) => {
      const width = 400;
      const height = 500;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const pickerPath = this.lang ? `${this.lang}/picker` : 'picker';
      const pickerUrl = `${this.baseUrl}/${pickerPath}`;
      const popup = window.open(
        pickerUrl,
        'atpassport:picker',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      const handler = (event: MessageEvent) => {
        if (event.origin !== new URL(this.baseUrl).origin) return;
        if (event.data?.type === 'atpassport:pick') {
          window.removeEventListener('message', handler);
          resolve(event.data.handle);
        }
      };

      window.addEventListener('message', handler);

      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
        }
      }, 1000);
    });
  }

  /**
   * Attaches the picker to an input element.
   */
  decorate(input: HTMLInputElement) {
    input.addEventListener('focus', async () => {
      if (input.value) return;
      const handle = await this.pick();
      if (handle) {
        input.value = handle;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  }
}

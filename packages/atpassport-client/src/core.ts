export interface AtPassportOptions {
  callbackUrl: string;
  baseUrl?: string;
  lang?: 'en' | 'ja';
}

/**
 * AtPassport Client
 */
export class AtPassport {
  private readonly baseUrl: string;
  private readonly callbackUrl: string;
  private readonly lang?: 'en' | 'ja';

  constructor(options: AtPassportOptions) {
    this.baseUrl = (options.baseUrl || "https://atpassport.net").replace(/\/$/, "");
    this.callbackUrl = options.callbackUrl;
    this.lang = options.lang;
  }


  /**
   * Generates the authentication URL and state.
   * By saving the state on the app side and verifying it in parseCallback,
   * you can prevent CSRF attacks. Custom parameters will be attached to the callback.
   */
  generateAuthUrl(customParams?: Record<string, string>): { url: string; atpstate: string } {
    const atpstate = crypto.randomUUID(); // Requires browser context or Node.js 19+
    const authPath = this.lang ? `${this.lang}/authentication` : 'authentication';
    const url = new URL(`${this.baseUrl}/${authPath}`);
    
    const callback = new URL(this.callbackUrl);
    if (customParams) {
      for (const [key, value] of Object.entries(customParams)) {
        callback.searchParams.set(key, value);
      }
    }

    url.searchParams.set("callback", callback.toString());
    url.searchParams.set("atpstate", atpstate);

    return { url: url.toString(), atpstate };
  }

  /**
   * Parses the callback URL returned from AtPassport and extracts parameters.
   * If `expectedState` is provided, it throws an error if the returned state does not match.
   */
  parseCallback(currentUrl: string, expectedState?: string | null): {
    handle: string | null;
    did: string | null;
    pdsUrl: string | null;
    atpstate: string | null;
    customParams: Record<string, string>;
  } {
    const url = new URL(currentUrl);
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

    return { handle, did, pdsUrl, atpstate, customParams };
  }

  /**
   * Opens a popup to let user pick a handle.
   * Returns a promise that resolves with the selected handle.
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

      // Optional: Check if popup is closed without picking
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          // resolve empty if closed?
        }
      }, 1000);
    });
  }

  /**
   * Attaches the picker to an input element.
   * Automatically fills the input when a handle is picked on focus.
   */
  decorate(input: HTMLInputElement) {
    input.addEventListener('focus', async () => {
      if (input.value) return; // Don't interrupt if already filled
      const handle = await this.pick();
      if (handle) {
        input.value = handle;
        // Trigger change events
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  }
}

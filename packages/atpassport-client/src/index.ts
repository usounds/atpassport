import { jwtVerify, importSPKI } from "jose";

export interface AtPassportSession {
  did: string;
  handle: string;
  uuid: string;
}

/**
 * AtPassport Client
 */
export class AtPassport {
  private readonly baseUrl: string;
  private readonly publicKey?: string;

  constructor(baseUrl: string, publicKey?: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.publicKey = publicKey;
  }

  /**
   * Generates the URL for handle registration.
   */
  registerUrl(handle: string, callback: string): string {
    const url = new URL(`${this.baseUrl}/api/register`);
    url.searchParams.set("handle", handle);
    url.searchParams.set("callbackUrl", callback);
    return url.toString();
  }

  /**
   * Generates the URL for identity resolution.
   */
  resolveUrl(callback: string): string {
    const url = new URL(`${this.baseUrl}/api/resolve`);
    url.searchParams.set("callbackUrl", callback);
    return url.toString();
  }

  /**
   * Verifies the token and returns the session.
   */
  async get(token: string): Promise<AtPassportSession> {
    if (!this.publicKey) {
      throw new Error("Public key is required for verification");
    }
    const spki = this.publicKey.includes("BEGIN")
      ? this.publicKey
      : Buffer.from(this.publicKey, 'base64').toString();
    const key = await importSPKI(spki, "RS256");
    const { payload } = await jwtVerify(token, key, { issuer: "atpassport" });
    return payload as unknown as AtPassportSession;
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
      
      const pickerUrl = `${this.baseUrl}/picker`;
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

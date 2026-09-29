import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Execute the actual bridge bodies in both entrypoints, without patching the test navigator.
function bridge(file: string, bus: EventTarget) {
  const source = readFileSync(`${process.cwd()}/src/entrypoints/${file}`, 'utf8');
  const inline = file === 'fedcm.content.ts';
  const start = source.indexOf(inline ? "var requestId = 'status_'" : 'const requestId = `status_');
  const end = source.indexOf(inline ? 'return savePromise.then' : 'await savePromise;', start);
  const body = source.slice(start, end) + 'return savePromise;';
  const js = ts.transpileModule(body, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return (status: string, options: unknown) => new Function('window', 'status', 'options', 'setTimeout', 'clearTimeout', 'CustomEvent', js)(bus, status, options, setTimeout, clearTimeout, CustomEvent) as Promise<void>;
}
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe.each(['fedcm.content.ts', 'injected.ts'])('storage ACK %s', file => {
  it('waits for a matching successful storage response', async () => {
    const bus = new EventTarget(); let requestId = '';
    bus.addEventListener('atpassport-fedcm-setstatus', event => { requestId = JSON.parse((event as CustomEvent).detail).requestId; });
    const pending = bridge(file, bus)('logged-in', { accounts: [] });
    const done = vi.fn(); void pending.then(done);
    await Promise.resolve(); expect(done).not.toHaveBeenCalled();
    bus.dispatchEvent(new CustomEvent('atpassport-fedcm-setstatus-response', { detail: JSON.stringify({ requestId: 'other', success: true }) }));
    await Promise.resolve(); expect(done).not.toHaveBeenCalled();
    bus.dispatchEvent(new CustomEvent('atpassport-fedcm-setstatus-response', { detail: JSON.stringify({ requestId, success: true }) }));
    await pending; expect(done).toHaveBeenCalledOnce();
  });
  it('rejects timeout instead of reporting unconfirmed storage as success', async () => {
    const pending = bridge(file, new EventTarget())('logged-in', { accounts: [] });
    const assertion = expect(pending).rejects.toThrow('timed out');
    await vi.advanceTimersByTimeAsync(3000); await assertion;
  });
  it('rejects storage and dispatch failures', async () => {
    const bus = new EventTarget();
    bus.addEventListener('atpassport-fedcm-setstatus', event => {
      const { requestId } = JSON.parse((event as CustomEvent).detail);
      bus.dispatchEvent(new CustomEvent('atpassport-fedcm-setstatus-response', { detail: JSON.stringify({ requestId, success: false, error: 'quota exceeded' }) }));
    });
    await expect(bridge(file, bus)('logged-in', {})).rejects.toThrow('quota exceeded');
    vi.spyOn(bus, 'dispatchEvent').mockImplementation(() => { throw new Error('closed'); });
    await expect(bridge(file, bus)('logged-in', {})).rejects.toThrow('dispatch');
  });
});

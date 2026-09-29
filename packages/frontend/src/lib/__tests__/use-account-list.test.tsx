// @vitest-environment jsdom
import { act, renderHook, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAccountList } from '../use-account-list';
import { type AssociationWithProfile } from '../models';
import { moveAssociation, removeAssociation } from '../actions';
import { syncAccountsPush } from '../fedcm-session-client';
const fetchProfiles = vi.hoisted(() => vi.fn());
vi.mock('../actions', () => ({ moveAssociation: vi.fn(), removeAssociation: vi.fn(), refreshAssociation: vi.fn() }));
vi.mock('../profile-store', () => ({ useProfileStore: { getState: () => ({ fetchProfiles }) } }));
vi.mock('../fedcm-session-client', () => ({ syncAccountsPush: vi.fn().mockResolvedValue(undefined), toFedCmAccount: (item: unknown) => item }));
const a = { uuid: 'u', did: 'did:plc:a', handle: 'a.example', pdsUrl: 'https://pds.example', createdAt: '' } as AssociationWithProfile;
const b = { ...a, did: 'did:plc:b', handle: 'b.example' } as AssociationWithProfile;
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; }
beforeEach(() => { vi.clearAllMocks(); fetchProfiles.mockReturnValue(new Promise(() => {})); });
afterEach(cleanup);

describe('confirmed account synchronization', () => {
  it('drops old profile responses after the server removes all accounts', async () => {
    const profiles = deferred<Record<string, never>>(); fetchProfiles.mockReturnValue(profiles.promise);
    const { result, rerender } = renderHook(({ items }) => useAccountList(items), { initialProps: { items: [a] } });
    rerender({ items: [] });
    await act(async () => { profiles.resolve({}); });
    expect(result.current.items).toEqual([]);
    expect(vi.mocked(syncAccountsPush).mock.calls.map(([items]) => items)).toEqual([[a], []]);
  });
  it('does not push optimistic deletion, and rolls back explicit server failure', async () => {
    const mutation = deferred<Awaited<ReturnType<typeof removeAssociation>>>();
    vi.mocked(removeAssociation).mockReturnValue(mutation.promise);
    const initial = [a, b];
    const { result } = renderHook(() => useAccountList(initial));
    act(() => { void result.current.handleDelete(a.did); });
    expect(result.current.items).toEqual([b]);
    expect(syncAccountsPush).toHaveBeenCalledTimes(1);
    await act(async () => { mutation.resolve({ success: false, error: 'No session found' }); });
    expect(result.current.items).toEqual(initial);
    expect(syncAccountsPush).toHaveBeenCalledTimes(1);
  });
  it('publishes the server result, not the local predicted deletion, and ignores late profiles', async () => {
    const profiles = deferred<Record<string, never>>(); fetchProfiles.mockReturnValue(profiles.promise);
    vi.mocked(removeAssociation).mockResolvedValue({ success: true, associations: [] });
    const initial = [a, b];
    const { result } = renderHook(() => useAccountList(initial));
    await act(async () => { await result.current.handleDelete(a.did); profiles.resolve({}); });
    expect(result.current.items).toEqual([]);
    expect(syncAccountsPush).toHaveBeenLastCalledWith([]);
    expect(syncAccountsPush).toHaveBeenCalledTimes(2);
  });
  it('serializes mutations and uses authoritative ordering', async () => {
    const mutation = deferred<Awaited<ReturnType<typeof moveAssociation>>>();
    vi.mocked(moveAssociation).mockReturnValue(mutation.promise);
    const initial = [a, b]; const { result } = renderHook(() => useAccountList(initial));
    act(() => { void result.current.handleMove(b.did, 'up'); void result.current.handleDelete(a.did); });
    expect(removeAssociation).not.toHaveBeenCalled();
    await act(async () => { mutation.resolve({ success: true, associations: [a, b] }); });
    await waitFor(() => expect(syncAccountsPush).toHaveBeenLastCalledWith([a, b]));
  });
});

'use client';

import { Stack, Title, Text, Button, Group, Box, Paper, Avatar, Loader, Divider, Tabs, TextInput, Center } from '@mantine/core';
import { IconPlus, IconLayoutDashboard, IconLogin, IconInfoCircle, IconExternalLink, IconLogout, IconShieldCheck } from '@tabler/icons-react';
import { useState, useEffect, useCallback, ChangeEvent, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { initOAuth } from '@/lib/oauth';
import { createAuthorizationUrl, getSession, listStoredSessions, deleteStoredSession, OAuthUserAgent, Session } from '@atcute/oauth-browser-client';
import { resolveHandle, updateDomainSettings } from '@/lib/actions';
import { DomainList } from './DomainList';
import { VerifyDomainStepper } from './VerifyDomainStepper';
import Link from 'next/link';
import { notifications } from '@mantine/notifications';
import { AtPassport } from '@atpassport/client/core';
import { AtPassportIcon } from '@atpassport/client/ui';
import { getProfile } from '@/lib/atproto';
import { Client } from '@atcute/client';
import { isActorIdentifier } from '@atcute/lexicons/syntax';
import { NetAtpassportVerifyList, NetAtpassportVerifySubmit, NetAtpassportVerifyWithdraw } from '@/lexicons/index';

export function DeveloperPortal({ 
  locale
}: { 
  locale: string;
}) {
  const t = useTranslations('Developers');
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<{
    handle: string;
    did: string;
    displayName: string;
    avatar?: string;
    pdsUrl: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [domains, setDomains] = useState<NetAtpassportVerifyList.Domain[]>([]);
  const [handleInput, setHandleInput] = useState('');
  const [activeTab, setActiveTab] = useState<string | null>('dashboard');
  const [showManualInput, setShowManualInput] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Proxy client setup
  const getProxyClient = useCallback((s?: Session) => {
    const activeSession = s || session;
    if (!activeSession) return null;
    
    // For E2E Mock, we don't need a real agent that might crash
    if (activeSession.info.sub === 'did:plc:mock') {
      return new Client({
        handler: async (pathname: string, init?: RequestInit) => {
           // This will be intercepted by Playwright route mocks
           return await fetch(pathname, init);
        },
        proxy: {
          did: 'did:plc:mock',
          serviceId: '#mock-verify',
        },
      });
    }

    const agent = new OAuthUserAgent(activeSession);
    return new Client({
      handler: agent,
      proxy: {
        did: `did:web:${window.location.host}`,
        serviceId: '#atpassport_appview',
      },
    });
  }, [session]);

  const handleLogout = useCallback(async () => {
    if (session) {
      await deleteStoredSession(session.info.sub);
      setSession(null);
      setProfile(null);
      setDomains([]);
    }
  }, [session]);

  const fetchData = useCallback(async (s: Session, options: { skipProfile?: boolean } = {}) => {
    try {
      const { skipProfile = false } = options;
      
      // 1. すべてのリクエストを並列で開始
      const proxyClient = getProxyClient(s);
      const listPromise = proxyClient 
        ? proxyClient.get('net.atpassport.verify.list', { params: {} }) 
        : Promise.resolve(null);
      
      const identityPromise = !skipProfile ? resolveHandle(s.info.sub) : Promise.resolve(null);
      const bskyProfilePromise = !skipProfile ? getProfile(s.info.sub) : Promise.resolve(null);

      // 2. プロフィールの処理
      if (!skipProfile) {
        // identity (handle解決) を優先的に待機して表示を更新（通常これが一番早い）
        const identity = await identityPromise;
        setProfile({
          handle: identity?.handle || s.info.sub,
          did: s.info.sub,
          displayName: identity?.handle || s.info.sub,
          avatar: undefined,
          pdsUrl: identity?.pdsUrl || (s.info.aud as string) || ''
        });

        // ユーザーにコンテンツを表示開始
        setLoading(false);

        // bskyProfile (アバターなど) は準備ができ次第、背景で更新
        bskyProfilePromise.then(bskyProfile => {
          if (bskyProfile) {
            setProfile(prev => prev ? {
              ...prev,
              displayName: bskyProfile.displayName || prev.displayName,
              avatar: bskyProfile.avatar
            } : null);
          }
        });
      }

      // 3. ドメインリスト（list）の処理
      if (listPromise) {
        try {
          const res = await listPromise;
          if (res && res.data) {
            const data = res.data as NetAtpassportVerifyList.Output;
            if (data && data.domains) {
              setDomains(data.domains);
            }
          }
        } catch (err: unknown) {
          const error = err as { status?: number; name?: string; message?: string };
          // セッション切れのチェック
          if (error?.status === 401 || error?.name === 'TokenRefreshError' || error?.message?.includes('expired')) {
            console.warn('Session expired or unauthorized, logging out...');
            await handleLogout();
            return;
          }

          notifications.show({
            title: t('error_title'),
            message: t('list_failed'),
            color: 'red'
          });
        }
      }
    } catch (error: unknown) {
      console.error('Failed to fetch data:', error);
      setLoading(false);
    }
  }, [getProxyClient, handleLogout, t]);

  const handleLogin = useCallback(async (handleOverride?: string) => {
    const handle = handleOverride || handleInput;
    if (!handle) return;

    if (!isActorIdentifier(handle)) {
      notifications.show({ title: t('error_title'), message: t('invalid_handle_format'), color: 'red' });
      return;
    }

    setLoading(true);

    try {
      const scope = 'atproto include:net.atpassport.permissionSet';
      const authUrl = await createAuthorizationUrl({
        target: { 
          type: 'account', 
          identifier: handle
        },
        scope: scope,
        prompt: 'consent'
      });
      window.location.assign(authUrl);
    } catch (error: unknown) {
      console.error('OAuth start failed:', error);
      setLoading(false);
      
      const isFetchError = error instanceof Error && 
        (error.message.includes('fetch') || error.message.includes('NetworkError') || error.message.includes('DID'));
      
      notifications.show({ 
        title: t('error_title'), 
        message: isFetchError ? `${t('login_failed')} (${t('check_cors_hint')})` : t('login_failed'), 
        color: 'red' 
      });
    }
  }, [handleInput, t]);

  const handleMockLogin = useCallback(() => {
    setLoading(true);
    // Simulate a successful login with mock data
    const mockSession: Session = {
      info: {
        sub: 'did:plc:mock',
        aud: 'http://localhost:3001',
      },
      // Minimal required structure for OAuthUserAgent if it's ever instantiated
      token: {
        access_token: 'mock',
        token_type: 'Bearer',
        expires_at: Date.now() + 3600000,
      },
    } as unknown as Session;

    setSession(mockSession);
    setProfile({
      handle: 'test.bsky.social',
      did: 'did:plc:mock',
      displayName: 'Test User',
      avatar: 'https://placehold.jp/150x150.png',
      pdsUrl: 'http://localhost:3001'
    });

    // Mock fetch data behavior
    setDomains([
      {
        domain: 'test.bsky.social',
        status: 'verified',
        verifiedAt: new Date().toISOString(),
        isPublic: true,
        method: 'oauth'
      } as NetAtpassportVerifyList.Domain
    ]);

    setLoading(false);
    setActiveTab('dashboard');
  }, []);

  const fetchDataRef = useRef(fetchData);
  useEffect(() => {
    fetchDataRef.current = fetchData;
  }, [fetchData]);

  useEffect(() => {
    setTimeout(() => setMounted(true), 0);
    const callbackUri = `${window.location.origin}/${locale}/developers/verify/callback`;
    initOAuth(callbackUri);

    const checkState = async () => {
      try {
        // セッション復元のみ行う（OAuthコールバックは /callback ページで処理済み）
        const storedDids = listStoredSessions();
        if (storedDids.length > 0) {
          try {
            const existingSession = await getSession(storedDids[0], { allowStale: true });
            if (existingSession) {
              setSession(existingSession);
              await fetchDataRef.current(existingSession);
            }
          } catch (e) {
            console.warn('Failed to restore session:', e);
          }
        }
      } catch (err) {
        console.error('checkState error:', err);
      } finally {
        setLoading(false);
      }
    };

    checkState();
  }, [locale]); // Run on mount and locale change



  useEffect(() => {
    // Reset action loading when switching tabs to prevent spinners from sticking
    setTimeout(() => setActionLoading(false), 0);
  }, [activeTab]);
  const handlePassportLogin = () => {
    setActionLoading(true);
    const atp = new AtPassport({
      callbackUrl: window.location.origin + `/${locale}/developers/verify/callback`,
      baseUrl: window.location.origin,
      lang: locale as 'en' | 'ja' | 'pt' | 'de' | 'fr' | 'es'
    });
    const { url } = atp.generateAuthUrl();
    window.location.href = url;
  };

  const handleVerifyOAuth = useCallback(async (isPublic: boolean) => {
    if (!session) return;
    setActionLoading(true);
    const id = notifications.show({ title: t('processing'), message: '', loading: true, autoClose: false, withCloseButton: false });
    try {
      const proxyClient = getProxyClient();
      if (!proxyClient) {
        notifications.update({ id, title: t('error_title'), message: 'Client setup failed', color: 'red', loading: false, autoClose: true, withCloseButton: true });
        return;
      }

      if (!profile?.handle) {
        notifications.update({ id, title: t('error_title'), message: t('invalid_domain_format'), color: 'red', loading: false, autoClose: true, withCloseButton: true });
        return;
      }

      const input: NetAtpassportVerifySubmit.Input = { 
        domain: profile?.handle || '',
        isPublic 
      };
      const { data } = await proxyClient.post('net.atpassport.verify.submit', { input }) as { data: NetAtpassportVerifySubmit.Output };
      
      if (!data.success) {
        throw { kind: data.error, message: data.error };
      }

      await fetchData(session, { skipProfile: true });
      notifications.update({ id, title: t('success_title'), message: t('success_message', { domain: profile?.handle || '' }), color: 'green', loading: false, autoClose: true, withCloseButton: true });
      setActiveTab('dashboard');
    } catch (error: unknown) {
      console.error('[Verify Proxy] Error:', error);
      const err = error as { message?: string; kind?: string; error?: string };
      
      // Extract error key - handle both XRPCError and our custom error throw above
      let errorKey = err?.kind || err?.error;
      
      // Handle qualified error names like 'net.atpassport.verify.submit#unreachable_url'
      if (errorKey?.includes('#')) {
        errorKey = errorKey.split('#')[1];
      }

      let displayMessage = (err?.message !== 'Invalid Request' && err?.message && err.message !== errorKey) 
        ? err.message 
        : t('failed');

      if (errorKey) {
        try {
          // Try to translate the key directly
          const translated = t(errorKey as Parameters<typeof t>[0]);
          if (translated && translated !== errorKey) {
            displayMessage = translated;
          } else {
            // Fallback for specific keys if t() returns the key itself
            if (errorKey === 'verification_mismatch') displayMessage = t('verification_mismatch');
            else if (errorKey === 'unreachable_url') displayMessage = t('unreachable_url');
            else if (errorKey === 'connection_failed') displayMessage = t('connection_failed');
          }
        } catch {
          // Final fallbacks
          if (errorKey === 'verification_mismatch') displayMessage = t('verification_mismatch');
          else if (errorKey === 'unreachable_url') displayMessage = t('unreachable_url');
          else if (errorKey === 'connection_failed') displayMessage = t('connection_failed');
          else if (errorKey.includes('_')) displayMessage = errorKey; // Show key if it looks like one
        }
      }
      
      notifications.update({ id, title: t('error_title'), message: displayMessage, color: 'red', loading: false, autoClose: true, withCloseButton: true });
    } finally {
      setActionLoading(false);
    }
  }, [session, profile, getProxyClient, fetchData, t]);

  const handleVerifyFile = useCallback(async (domain: string, isPublic: boolean) => {
    if (!session) return;
    setActionLoading(true);
    const id = notifications.show({ title: t('processing'), message: '', loading: true, autoClose: false, withCloseButton: false });
    try {
      const proxyClient = getProxyClient();
      if (!proxyClient) {
        notifications.update({ id, title: t('error_title'), message: 'Client setup failed', color: 'red', loading: false, autoClose: true, withCloseButton: true });
        return;
      }

      // Simplified regex for local testing
      const domainRegex = /^([a-zA-Z0-9.-]+)(:[0-9]+)?$/;
      if (!domainRegex.test(domain.trim().toLowerCase())) {
        notifications.update({ id, title: t('error_title'), message: `${t('invalid_domain_format')} (client)`, color: 'red', loading: false, autoClose: true, withCloseButton: true });
        return;
      }

      const input: NetAtpassportVerifySubmit.Input = { domain, isPublic };
      const { data } = await proxyClient.post('net.atpassport.verify.submit', { input }) as { data: NetAtpassportVerifySubmit.Output };
      
      if (!data.success) {
        throw { kind: data.error, message: data.error };
      }

      await fetchData(session, { skipProfile: true });
      notifications.update({ id, title: t('success_title'), message: t('success_message', { domain }), color: 'green', loading: false, autoClose: true, withCloseButton: true });
      setActiveTab('dashboard');
    } catch (error: unknown) {
      console.error('[Verify File] Error:', error);
      const err = error as { message?: string; kind?: string; error?: string };
      
      let errorKey = err?.kind || err?.error;
      if (errorKey?.includes('#')) {
        errorKey = errorKey.split('#')[1];
      }

      let displayMessage = (err?.message !== 'Invalid Request' && err?.message && err.message !== errorKey) 
        ? err.message 
        : t('failed');

      if (errorKey) {
        try {
          const translated = t(errorKey as Parameters<typeof t>[0]);
          if (translated && translated !== errorKey) {
            displayMessage = translated;
          } else {
            if (errorKey === 'verification_mismatch') displayMessage = t('verification_mismatch');
            else if (errorKey === 'unreachable_url') displayMessage = t('unreachable_url');
            else if (errorKey === 'connection_failed') displayMessage = t('connection_failed');
          }
        } catch {
          if (errorKey === 'verification_mismatch') displayMessage = t('verification_mismatch');
          else if (errorKey === 'unreachable_url') displayMessage = t('unreachable_url');
          else if (errorKey === 'connection_failed') displayMessage = t('connection_failed');
          else if (errorKey.includes('_')) displayMessage = errorKey;
        }
      }
      
      notifications.update({ id, title: t('error_title'), message: displayMessage, color: 'red', loading: false, autoClose: true, withCloseButton: true });
    } finally {
      setActionLoading(false);
    }
  }, [session, getProxyClient, fetchData, t]);

  const handleWithdraw = async (domain: string) => {
    if (!session) return;
    setActionLoading(true);
    const id = notifications.show({ title: t('processing'), message: '', loading: true, autoClose: false, withCloseButton: false });
    try {
      const proxyClient = getProxyClient();
      if (!proxyClient) throw new Error('Client setup failed');

      const input: NetAtpassportVerifyWithdraw.Input = { domain };
      await proxyClient.post('net.atpassport.verify.withdraw', { input });
      await fetchData(session, { skipProfile: true });
      notifications.update({ id, title: t('success_title'), message: t('withdraw_success'), color: 'blue', loading: false, autoClose: true, withCloseButton: true });
    } catch (error: unknown) {
      console.error('[Withdraw Proxy] Error:', error);
      const err = error as { message?: string; kind?: string; error?: string };
      
      let errorKey = err?.kind || err?.error;
      if (errorKey?.includes('#')) {
        errorKey = errorKey.split('#')[1];
      }

      let displayMessage = (err?.message !== 'Invalid Request' && err?.message && err.message !== errorKey) 
        ? err.message 
        : t('failed');

      if (errorKey) {
        try {
          const translated = t(errorKey as Parameters<typeof t>[0]);
          if (translated && translated !== errorKey) {
            displayMessage = translated;
          }
        } catch {
          if (errorKey.includes('_')) displayMessage = errorKey;
        }
      }
      
      notifications.update({ id, title: t('error_title'), message: displayMessage, color: 'red', loading: false, autoClose: true, withCloseButton: true });
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdatePublic = async (domain: string, isPublic: boolean) => {
    if (!session) return;
    setActionLoading(true);
    const id = notifications.show({ title: t('processing'), message: '', loading: true, autoClose: false, withCloseButton: false });
    try {
      await updateDomainSettings(domain, session.info.sub, isPublic);
      await fetchData(session, { skipProfile: true });
      notifications.update({ id, title: t('success_title'), message: t('update_success'), color: 'green', loading: false, autoClose: true, withCloseButton: true });
    } catch {
      notifications.update({ id, title: t('error_title'), message: t('failed_to_update_settings'), color: 'red', loading: false, autoClose: true, withCloseButton: true });
    } finally {
      setActionLoading(false);
    }
  };

  // Only apply animation classes once mounted to avoid SSR double animation
  const animationClass = mounted ? 'animate-fade-in' : '';

  // Show full-page loader during initial loading
  const isFullLoading = loading;

  if (isFullLoading) {
    return (
      <Center style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'var(--mantine-color-body)',
        zIndex: 1000,
        textAlign: 'center'
      }}>
        <Stack align="center" gap="md">
          <Loader size={50} variant="bars" color="blue" />
          <Text fw={600} size="xl">{t('authenticating_title')}</Text>
          <Text size="sm" c="dimmed">
            {t('authenticating_message', { domain: 'atproto', pds: 'PDS' })}
          </Text>
        </Stack>
      </Center>
    );
  }

  if (!session) {
    return (
      <Stack gap="xl" align="center" py="xl" className={animationClass}>
        <header style={{ textAlign: 'center' }}>
          <Title order={2}>{t('title')}</Title>
          <Text c="dimmed" size="sm" mt="xs">{t('description')}</Text>
        </header>

        <Paper withBorder p="xl" radius="lg" shadow="sm" style={{ width: '100%', maxWidth: 500 }}>
          <Stack gap="md">
            <Group gap="sm" justify="center">
              <IconInfoCircle size={24} color="var(--mantine-color-blue-filled)" />
              <Title order={3}>{t('auth_required')}</Title>
            </Group>
            <Text size="sm" c="dimmed" ta="center">{t('auth_required_description')}</Text>

            <Divider my="sm" />

            <Box mx="auto" style={{ width: '100%', maxWidth: 400 }}>
              {!showManualInput ? (
                <Stack gap="md">
                  <Button
                    onClick={handlePassportLogin}
                    loading={actionLoading}
                    disabled={actionLoading}
                    leftSection={<AtPassportIcon size={24} />}
                    color="blue"
                    size="md"
                    radius="md"
                    fullWidth
                  >
                    {t('passport_login')}
                  </Button>

                  <Button
                    variant="subtle"
                    color="gray"
                    size="xs"
                    onClick={() => setShowManualInput(true)}
                  >
                    {t('manual_handle_input')}
                  </Button>
                </Stack>
              ) : (
                <Stack gap="sm">
                  <TextInput
                    label={t('login_handle')}
                    placeholder="example.bsky.social"
                    value={handleInput}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setHandleInput(e.currentTarget.value)}
                    size="md"
                    radius="md"
                    autoFocus
                  />
                  <Button
                    onClick={() => handleLogin()}
                    loading={loading}
                    leftSection={<IconLogin size={20} />}
                    color="blue"
                    size="md"
                    radius="md"
                    fullWidth
                  >
                    {t('login_button')}
                  </Button>
                  
                  {/* E2E / Development only button */}
                  {(typeof window !== 'undefined' && (window.location.port === '3001' || window.location.hostname === 'localhost')) && (
                    <Button
                      variant="outline"
                      color="orange"
                      size="sm"
                      onClick={() => handleLogin('test.bsky.social')}
                      leftSection={<IconShieldCheck size={18} />}
                    >
                      Mock Login (E2E)
                    </Button>
                  )}

                  {/* Even simpler mock for UI testing */}
                  {(typeof window !== 'undefined' && (window.location.port === '3001' || window.location.hostname === 'localhost')) && (
                    <Button
                      variant="light"
                      color="violet"
                      size="sm"
                      onClick={handleMockLogin}
                      leftSection={<IconShieldCheck size={18} />}
                    >
                      Skip Login (E2E Mock)
                    </Button>
                  )}

                  <Button
                    variant="subtle"
                    color="gray"
                    size="xs"
                    onClick={() => setShowManualInput(false)}
                  >
                    {t('go_back')}
                  </Button>
                </Stack>
              )}
            </Box>
          </Stack>
        </Paper>
      </Stack>
    );
  }

  return (
    <Stack gap="xl" className={animationClass}>
      <header>
        <Group justify="space-between" align="flex-start">
          <Box>
            <Title order={2}>{t('title')}</Title>
            <Text c="dimmed" size="sm" mt="xs">{t('description')}</Text>
          </Box>
          <Group>
            <Button
              variant="light"
              component={Link}
              href={`/${locale}/directory`}
              rightSection={<IconExternalLink size={16} />}
              radius="md"
            >
              {t('view_directory')}
            </Button>
          </Group>
        </Group>
      </header>

      <Paper withBorder radius="lg" shadow="sm" style={{ overflow: 'hidden' }}>
        <Box py="sm" px="md" bg="light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-7))" style={{ borderBottom: '1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-4))' }}>
          <Group justify="space-between" align="center" wrap="nowrap" gap="md">
            <Group wrap="nowrap" gap="md" align="center" style={{ flex: 1, minWidth: 0 }}>
              <Avatar src={profile?.avatar} radius="xl" size="md" />
              <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
                <Text fw={600} size="sm" truncate>{profile?.displayName || profile?.handle || session.info.sub}</Text>
                <Text size="xs" c="dimmed" truncate>
                  @{profile?.handle || session.info.sub}
                </Text>
                <Text size="10px" c="dimmed" truncate style={{ opacity: 0.8 }}>
                  PDS:{profile?.pdsUrl ? new URL(profile.pdsUrl).hostname : ''}
                </Text>
              </Stack>
            </Group>
            <Button
              variant="subtle"
              color="gray"
              size="xs"
              onClick={handleLogout}
              leftSection={<IconLogout size={14} />}
            >
              {t('logout')}
            </Button>
          </Group>
        </Box>

        <Tabs value={activeTab} onChange={setActiveTab} variant="outline" styles={{
          tab: { padding: '12px 20px', fontWeight: 600 },
          panel: { padding: '24px' }
        }}>
          <Tabs.List>
            <Tabs.Tab value="dashboard" leftSection={<IconLayoutDashboard size={18} />}>
              {t('dashboard_tab')}
            </Tabs.Tab>
            <Tabs.Tab value="add" leftSection={<IconPlus size={18} />}>
              {t('new_domain_tab')}
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="dashboard">
            <DomainList
              domains={domains}
              onWithdraw={handleWithdraw}
              onUpdatePublic={handleUpdatePublic}
              loading={actionLoading}
            />
          </Tabs.Panel>

          <Tabs.Panel value="add">
            <Stack gap="lg">
              <VerifyDomainStepper
                key={activeTab === 'add' ? 'active-add' : 'inactive-add'}
                did={session.info.sub}
                handle={profile?.handle || undefined}
                isHandleVerified={domains.some(d => d.domain === profile?.handle)}
                onVerifyOAuth={handleVerifyOAuth}
                onVerifyFile={handleVerifyFile}
                loading={actionLoading}
              />
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Paper>
    </Stack>
  );
}

'use client';

import { Stack, Title, Text, Button, Group, Box, Paper, Avatar, Loader, Divider, Tabs, TextInput, Center } from '@mantine/core';
import { IconPlus, IconLayoutDashboard, IconLogin, IconInfoCircle, IconExternalLink, IconLogout } from '@tabler/icons-react';
import { useState, useEffect, useCallback, ChangeEvent } from 'react';
import { useTranslations } from 'next-intl';
import { initOAuth } from '@/lib/oauth';
import { createAuthorizationUrl, finalizeAuthorization, getSession, listStoredSessions, deleteStoredSession, OAuthUserAgent, Session } from '@atcute/oauth-browser-client';
import { verifyDomainByFile, resolveHandle, updateDomainSettings } from '@/lib/actions';
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
  locale, 
  initialResult 
}: { 
  locale: string; 
  initialResult?: { handle?: string | null; [key: string]: unknown } 
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
    const agent = new OAuthUserAgent(activeSession);
    return new Client({
      handler: agent,
      proxy: {
        did: `did:web:${window.location.host}`,
        serviceId: '#atpassport_appview',
      },
    });
  }, [session]);

  const fetchData = useCallback(async (s: Session) => {
    try {
      const identity = await resolveHandle(s.info.sub);
      const bskyProfile = await getProfile(s.info.sub);

      setProfile({
        handle: identity?.handle || s.info.sub,
        did: s.info.sub,
        displayName: bskyProfile?.displayName || identity?.handle || s.info.sub,
        avatar: bskyProfile?.avatar,
        pdsUrl: identity?.pdsUrl || (s.info.aud as string) || ''
      });

      const proxyClient = getProxyClient(s);
      if (proxyClient) {
        const { data } = await proxyClient.get('net.atpassport.verify.list', { params: {} }) as { data: NetAtpassportVerifyList.Output };
        if (data && data.domains) {
          setDomains(data.domains);
        }
      }
    } catch (error: unknown) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }, [getProxyClient]);

  const handleLogin = useCallback(async (manualHandle?: string) => {
    const handle = manualHandle || handleInput;
    if (!handle) return;

    if (!isActorIdentifier(handle)) {
      notifications.show({ title: 'Error', message: 'Invalid handle format', color: 'red' });
      return;
    }

    setActionLoading(true);
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
      // Clear params to prevent re-login loop
      if (window.location.search) {
        window.history.replaceState(null, '', window.location.pathname);
      }
      await new Promise(resolve => setTimeout(resolve, 200));
      window.location.assign(authUrl);
    } catch (error: unknown) {
      console.error('OAuth start failed:', error);
      setActionLoading(false);
      notifications.show({ title: 'Error', message: t('login_failed'), color: 'red' });
    }
  }, [handleInput, t]);

  useEffect(() => {
    setMounted(true);
    initOAuth();

    const checkState = async () => {
      if (typeof window !== 'undefined' && window.location.hash) {
        const params = new URLSearchParams(window.location.hash.slice(1));
        if (params.has('state')) {
          setLoading(true);
          try {
            const { session: newSession } = await finalizeAuthorization(params);
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
            setSession(newSession);
            await fetchData(newSession);
            return;
          } catch (error: unknown) {
            console.error('OAuth callback failed:', error);
          }
        }
      }

      try {
        const storedDids = listStoredSessions();
        if (storedDids.length > 0) {
          const existingSession = await getSession(storedDids[0], { allowStale: true });
          if (existingSession) {
            setSession(existingSession);
            await fetchData(existingSession);
          }
        }
      } catch {
        // No session
      } finally {
        setLoading(false);
      }
    };

    checkState();
  }, [fetchData]);

  // Handle library callback
  useEffect(() => {
    // Only start auto-login when not already loading/in session and handle param exists
    if (initialResult && initialResult.handle && !session && !loading && !actionLoading) {
      handleLogin(initialResult.handle);
    }
  }, [initialResult, session, loading, actionLoading, handleLogin]);

  const handlePassportLogin = () => {
    const atp = new AtPassport({
      callbackUrl: window.location.origin + window.location.pathname,
      baseUrl: window.location.origin,
      lang: locale as 'en' | 'ja' | 'pt' | 'de' | 'fr' | 'es'
    });
    const { url } = atp.generateAuthUrl();
    window.location.href = url;
  };

  const handleLogout = async () => {
    if (session) {
      await deleteStoredSession(session.info.sub);
      setSession(null);
      setProfile(null);
      setDomains([]);
    }
  };


  const handleVerifyOAuth = async (isPublic: boolean) => {
    if (!session) return;
    setActionLoading(true);
    const id = notifications.show({ title: t('processing'), message: '', loading: true, autoClose: false, withCloseButton: false });
    try {
      const proxyClient = getProxyClient();
      if (!proxyClient) throw new Error('Client setup failed');

      const input: NetAtpassportVerifySubmit.Input = { isPublic };
      await proxyClient.post('net.atpassport.verify.submit', { input });
      await fetchData(session);
      notifications.update({ id, title: t('success_title'), message: t('success_message', { domain: profile?.handle || '' }), color: 'green', loading: false, autoClose: true, withCloseButton: true });
      setActiveTab('dashboard');
    } catch (error: unknown) {
      const err = error as Error;
      console.error('[Verify Proxy] Error:', err);
      notifications.update({ id, title: 'Error', message: err.message || 'Failed', color: 'red', loading: false, autoClose: true, withCloseButton: true });
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyFile = async (domain: string, isPublic: boolean) => {
    if (!session) return;
    setActionLoading(true);
    const id = notifications.show({ title: t('processing'), message: '', loading: true, autoClose: false, withCloseButton: false });
    try {
      const res = await verifyDomainByFile(domain, session.info.sub, isPublic);
      if (res.success) {
        await fetchData(session);
        notifications.update({ id, title: t('success_title'), message: t('success_message', { domain }), color: 'green', loading: false, autoClose: true, withCloseButton: true });
        setActiveTab('dashboard');
      } else {
        notifications.update({ id, title: 'Error', message: res.error || 'Failed', color: 'red', loading: false, autoClose: true, withCloseButton: true });
      }
    } catch (error: unknown) {
      console.error('[Verify File] Error:', error);
      notifications.update({ id, title: 'Error', message: 'Unexpected failure', color: 'red', loading: false, autoClose: true, withCloseButton: true });
    } finally {
      setActionLoading(false);
    }
  };

  const handleWithdraw = async (domain: string) => {
    if (!session) return;
    setActionLoading(true);
    const id = notifications.show({ title: t('processing'), message: '', loading: true, autoClose: false, withCloseButton: false });
    try {
      const proxyClient = getProxyClient();
      if (!proxyClient) throw new Error('Client setup failed');

      const input: NetAtpassportVerifyWithdraw.Input = { domain };
      await proxyClient.post('net.atpassport.verify.withdraw', { input });
      await fetchData(session);
      notifications.update({ id, title: t('success_title'), message: t('withdraw_success'), color: 'blue', loading: false, autoClose: true, withCloseButton: true });
    } catch (error: unknown) {
      const err = error as Error;
      console.error('[Withdraw Proxy] Error:', err);
      notifications.update({ id, title: 'Error', message: err.message || 'Failed', color: 'red', loading: false, autoClose: true, withCloseButton: true });
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
      await fetchData(session);
      notifications.update({ id, title: t('success_title'), message: t('update_success'), color: 'green', loading: false, autoClose: true, withCloseButton: true });
    } catch {
      notifications.update({ id, title: 'Error', message: 'Failed to update settings', color: 'red', loading: false, autoClose: true, withCloseButton: true });
    } finally {
      setActionLoading(false);
    }
  };

  // Only apply animation classes once mounted to avoid SSR double animation
  const animationClass = mounted ? 'animate-fade-in' : '';

  // Show full-page loader only during initial loading or OAuth redirection (not for background actions)
  const isFullLoading = loading || (initialResult && initialResult.handle && !session);

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
                    loading={actionLoading}
                    leftSection={<IconLogin size={20} />}
                    color="blue"
                    size="md"
                    radius="md"
                    fullWidth
                  >
                    {t('login_button')}
                  </Button>
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
            <Group wrap="nowrap" gap="md" align="center">
              <Avatar src={profile?.avatar} radius="xl" size="md" />
              <Stack gap={0}>
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

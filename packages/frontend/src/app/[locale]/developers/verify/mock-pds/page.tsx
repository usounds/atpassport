'use client';

import { Container, Paper, Title, Text, Button, Stack, Group, Box, Code, Divider, Alert } from '@mantine/core';
import { useSearchParams, useRouter, notFound } from 'next/navigation';
import { IconShieldCheck, IconArrowRight, IconAlertTriangle } from '@tabler/icons-react';
import { Suspense, useMemo } from 'react';

function isAllowedRedirectUri(uri: string | null): boolean {
  if (!uri) return false;
  try {
    const parsed = new URL(uri);
    if (parsed.protocol === 'https:') {
      return true;
    }
    if (
      parsed.protocol === 'http:' &&
      (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1' || parsed.hostname === '[::1]')
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function MockPDSContent() {
  if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_ENABLE_MOCK_PDS !== 'true') {
    notFound();
  }

  const searchParams = useSearchParams();
  const router = useRouter();

  const clientId = searchParams.get('client_id');
  const redirectUri = searchParams.get('redirect_uri');
  const state = searchParams.get('state');
  const scope = searchParams.get('scope');
  const loginHint = searchParams.get('login_hint');

  const isValidRedirect = useMemo(() => isAllowedRedirectUri(redirectUri), [redirectUri]);

  const handleApprove = () => {
    if (!redirectUri || !isValidRedirect) return;

    try {
      const callbackUrl = new URL(redirectUri);
      // AT Protocol OAuth typically uses query parameters for the authorization response
      callbackUrl.searchParams.set('code', 'mock-auth-code-12345');
      callbackUrl.searchParams.set('state', state || '');
      
      window.location.href = callbackUrl.toString();
    } catch (e) {
      console.error('Invalid redirect URI', e);
    }
  };

  return (
    <Container size="xs" py="xl">
      <Paper withBorder p="xl" radius="md" shadow="sm">
        <Stack gap="md">
          <Group justify="center" gap="xs">
            <IconShieldCheck size={32} color="var(--mantine-color-blue-filled)" />
            <Title order={3}>Mock PDS (E2E Test)</Title>
          </Group>
          
          <Text size="sm" ta="center" c="dimmed">
            This is a mock OAuth provider for testing purposes.
          </Text>

          <Divider />

          <Box>
            <Text fw={700} size="sm">Client ID:</Text>
            <Code block>{clientId}</Code>
          </Box>

          <Box>
            <Text fw={700} size="sm">Redirect URI:</Text>
            <Code block>{redirectUri}</Code>
          </Box>

          {redirectUri && !isValidRedirect && (
            <Alert icon={<IconAlertTriangle size={16} />} title="Security Warning" color="red">
              The provided redirect URI is invalid or insecure. Only https:// schemes or http://localhost are permitted.
            </Alert>
          )}

          <Box>
            <Text fw={700} size="sm">Requested Scopes:</Text>
            <Text size="xs">{scope}</Text>
          </Box>

          {loginHint && (
            <Box>
              <Text fw={700} size="sm">Login Hint (Handle):</Text>
              <Text size="sm">{loginHint}</Text>
            </Box>
          )}

          <Group grow mt="xl">
            <Button variant="outline" color="gray" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button 
              color="blue" 
              rightSection={<IconArrowRight size={18} />}
              onClick={handleApprove}
              disabled={!isValidRedirect}
            >
              Approve
            </Button>
          </Group>
        </Stack>
      </Paper>
    </Container>
  );
}

export default function MockPDSPage() {
  return (
    <Suspense fallback={<div>Loading Mock PDS...</div>}>
      <MockPDSContent />
    </Suspense>
  );
}

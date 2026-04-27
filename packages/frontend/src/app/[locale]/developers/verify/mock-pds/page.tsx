'use client';

import { Container, Paper, Title, Text, Button, Stack, Group, Box, Code, Divider } from '@mantine/core';
import { useSearchParams, useRouter } from 'next/navigation';
import { IconShieldCheck, IconArrowRight } from '@tabler/icons-react';
import { Suspense } from 'react';

function MockPDSContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const clientId = searchParams.get('client_id');
  const redirectUri = searchParams.get('redirect_uri');
  const state = searchParams.get('state');
  const scope = searchParams.get('scope');
  const loginHint = searchParams.get('login_hint');

  const handleApprove = () => {
    if (!redirectUri) return;

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

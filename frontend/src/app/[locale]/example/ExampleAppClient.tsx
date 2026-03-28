'use client';

import { useState } from 'react';
import { Container, Title, Text, Stack, TextInput, ActionIcon, Group, Button, Paper, Divider, Table, Box, Tabs, Badge } from '@mantine/core';
import { IconPlus, IconTrash, IconUserCircle, IconUserPlus, IconSettings, IconRefresh } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { AtPassport } from '@atpassport/client/core';
import { AtPassportIcon, AtPassportUI } from '@atpassport/client/ui';

interface AuthResult {
  handle: string | null;
  did: string | null;
  pdsUrl: string | null;
  atpstate?: string | null;
  customParams: Record<string, string>;
}

type SupportedLang = 'en' | 'ja' | 'pt' | 'de' | 'fr' | 'es';

interface ExampleAppClientProps {
  locale: string;
  initialResult?: AuthResult | null;
}

export function ExampleAppClient({ locale, initialResult }: ExampleAppClientProps) {
  const t = useTranslations('Example');
  const router = useRouter();
  const pathname = usePathname();

  const [customParams, setCustomParams] = useState<{ key: string; value: string }[]>([
    { key: 'sample', value: 'hello' }
  ]);

  const [suggestHandle, setSuggestHandle] = useState('');
  const [result, setResult] = useState<AuthResult | null>(initialResult || null);

  const addParam = () => setCustomParams([...customParams, { key: '', value: '' }]);
  const removeParam = (index: number) => setCustomParams(customParams.filter((_, i) => i !== index));
  const updateParam = (index: number, field: 'key' | 'value', val: string) => {
    const next = [...customParams];
    next[index][field] = val;
    setCustomParams(next);
  };

  const getParamsObj = () => {
    const paramsObj: Record<string, string> = {};
    customParams.forEach(p => {
      if (p.key.trim()) paramsObj[p.key.trim()] = p.value;
    });
    return paramsObj;
  };

  const handleLogin = () => {
    const atp = new AtPassport({
      callbackUrl: window.location.origin + window.location.pathname,
      baseUrl: window.location.origin,
      lang: locale as SupportedLang
    });
    const { url } = atp.generateAuthUrl(getParamsObj());
    if (url.startsWith('https://')) {
      window.location.href = url;
    } else {
      console.error('Invalid redirect URL (HTTPS required):', url);
    }
  };

  const handleAdd = () => {
    if (!suggestHandle) return;
    const atp = new AtPassport({
      callbackUrl: window.location.origin + window.location.pathname,
      baseUrl: window.location.origin,
      lang: locale as SupportedLang
    });
    const { url } = atp.generateAddUrl(suggestHandle, getParamsObj());
    if (url.startsWith('https://')) {
      window.location.href = url;
    } else {
      console.error('Invalid redirect URL (HTTPS required):', url);
    }
  };

  const handleReset = () => {
    setResult(null);
    router.replace(pathname);
  };

  const uiTexts = AtPassportUI[locale as SupportedLang] || AtPassportUI.en;

  const CustomParamsEditor = (
    <Stack gap="sm">
      <Group gap="xs">
        <IconSettings size={16} color="var(--mantine-color-gray-6)" />
        <Text size="sm" fw={600} c="gray.7">{t('custom_params')}</Text>
      </Group>
      
      <Stack gap="xs">
        {customParams.map((p, i) => (
          <Group key={i} gap="xs" align="flex-start">
            <TextInput
              placeholder={t('param_key')}
              value={p.key}
              onChange={(e) => updateParam(i, 'key', e.currentTarget.value)}
              style={{ flex: 1 }}
              radius="md"
              size="xs"
            />
            <TextInput
              placeholder={t('param_value')}
              value={p.value}
              onChange={(e) => updateParam(i, 'value', e.currentTarget.value)}
              style={{ flex: 1 }}
              radius="md"
              size="xs"
            />
            <ActionIcon
              color="red"
              variant="light"
              onClick={() => removeParam(i)}
              size="sm"
              radius="md"
              mt={4}
            >
              <IconTrash size={14} />
            </ActionIcon>
          </Group>
        ))}
      </Stack>
 
      <Button
        variant="subtle"
        leftSection={<IconPlus size={14} />}
        onClick={addParam}
        size="xs"
        radius="md"
        w="fit-content"
      >
        {t('add_param')}
      </Button>
    </Stack>
  );

  return (
    <Container size="sm" py="xl" style={{ maxWidth: 600 }}>
      <Stack gap="xl">
        <header>
          <Box mb="md">
            <Title order={2} mb={4}>{t('title')}</Title>
            <Text c="dimmed" size="sm">{t('description')}</Text>
          </Box>
        </header>

        {!result ? (
          <Tabs variant="pills" defaultValue="auth" radius="md">
            <Tabs.List grow mb="md">
              <Tabs.Tab value="auth" leftSection={<IconUserCircle size={16} />}>
                {t('tab_auth')}
              </Tabs.Tab>
              <Tabs.Tab value="add" leftSection={<IconUserPlus size={16} />}>
                {t('tab_add')}
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="auth">
              <Paper withBorder p="xl" radius="lg" shadow="sm">
                <Stack gap="xl">
                  <Stack gap="md">
                    <Box>
                      <Text fw={600} size="sm" mb={4}>{t('auth_flow_title')}</Text>
                      <Text size="xs" c="dimmed">{t('auth_flow_description')}</Text>
                    </Box>
                    
                    <Button
                      variant="filled"
                      color="blue"
                      onClick={handleLogin}
                      leftSection={<AtPassportIcon size={24} />}
                      fullWidth
                      radius="md"
                      size="md"
                    >
                      {uiTexts.title}
                    </Button>
                  </Stack>

                  <Divider variant="dashed" />
                  {CustomParamsEditor}
                </Stack>
              </Paper>
            </Tabs.Panel>

            <Tabs.Panel value="add">
              <Paper withBorder p="xl" radius="lg" shadow="sm">
                <Stack gap="xl">
                  <Stack gap="md">
                    <Box>
                      <Text fw={600} size="sm" mb={4}>{t('add_flow_title')}</Text>
                      <Text size="xs" c="dimmed">{t('add_flow_description')}</Text>
                    </Box>

                    <TextInput
                      label={t('register_handle')}
                      placeholder="example.bsky.social"
                      value={suggestHandle}
                      onChange={(e) => setSuggestHandle(e.currentTarget.value)}
                      radius="md"
                    />

                    <Button
                      variant="outline"
                      color="blue"
                      onClick={handleAdd}
                      disabled={!suggestHandle}
                      fullWidth
                      radius="md"
                      size="md"
                    >
                      {uiTexts.add}
                    </Button>
                  </Stack>

                  <Divider variant="dashed" />
                  {CustomParamsEditor}
                </Stack>
              </Paper>
            </Tabs.Panel>
          </Tabs>
        ) : (
          <Paper withBorder p="xl" radius="lg" shadow="sm">
            <Stack gap="lg">
              <Group justify="space-between">
                <Title order={4}>{t('result')}</Title>
                <Badge color="blue" variant="light">{t('callback_received')}</Badge>
              </Group>
              
              <Divider />

              <Box>
                <Table verticalSpacing="sm">
                  <Table.Tbody>
                    <Table.Tr>
                      <Table.Td fw={600} w={140}>handle</Table.Td>
                      <Table.Td><Text span ff="monospace" size="sm">{result.handle}</Text></Table.Td>
                    </Table.Tr>
                    <Table.Tr>
                      <Table.Td fw={600}>did</Table.Td>
                      <Table.Td><Text span ff="monospace" size="sm" style={{ wordBreak: 'break-all' }}>{result.did}</Text></Table.Td>
                    </Table.Tr>
                    <Table.Tr>
                      <Table.Td fw={600}>pdsurl</Table.Td>
                      <Table.Td><Text span ff="monospace" size="sm" style={{ wordBreak: 'break-all' }}>{result.pdsUrl}</Text></Table.Td>
                    </Table.Tr>
                    <Table.Tr>
                      <Table.Td fw={600}>atpstate</Table.Td>
                      <Table.Td><Text span ff="monospace" size="sm" style={{ wordBreak: 'break-all' }}>{result.atpstate}</Text></Table.Td>
                    </Table.Tr>
                  </Table.Tbody>
                </Table>
              </Box>

              {Object.keys(result.customParams).length > 0 && (
                <Box>
                  <Text size="sm" fw={700} mb="sm" c="gray.7">{t('returned_params')}</Text>
                  <Table withTableBorder withColumnBorders>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>{t('param_key')}</Table.Th>
                        <Table.Th>{t('param_value')}</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {Object.entries(result.customParams).map(([k, v]) => (
                        <Table.Tr key={k}>
                          <Table.Td><Text size="sm" fw={500}>{k}</Text></Table.Td>
                          <Table.Td><Text span ff="monospace" size="sm">{v}</Text></Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </Box>
              )}

              <Divider />
              <Button 
                variant="light" 
                color="gray" 
                leftSection={<IconRefresh size={16} />} 
                onClick={handleReset}
                fullWidth
                radius="md"
              >
                {t('try_another')}
              </Button>
            </Stack>
          </Paper>
        )}
      </Stack>
    </Container>
  );
}

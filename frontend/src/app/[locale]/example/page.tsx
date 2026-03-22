'use client';

import { useState, useEffect } from 'react';
import { Container, Title, Text, Stack, TextInput, ActionIcon, Group, Button, Paper, Divider, Code, Table, Box } from '@mantine/core';
import { IconPlus, IconTrash, IconExternalLink } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import { useSearchParams, useParams } from 'next/navigation';
import { AtPassport } from '@atpassport/client/core';
import { AtPassportIcon, AtPassportUI } from '@atpassport/client/ui';

export default function ExamplePage() {
  const t = useTranslations('Example');
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = params.locale as string;

  const [customParams, setCustomParams] = useState<{ key: string; value: string }[]>([
    { key: 'sample', value: 'hello' }
  ]);

  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    // Client-side only initialization
    const atp = new AtPassport({
      callbackUrl: window.location.origin + window.location.pathname,
      baseUrl: window.location.origin,
      lang: locale as 'en' | 'ja'
    });

    const currentUrl = window.location.href;
    if (searchParams.get('handle')) {
      try {
        const parsed = atp.parseCallback(currentUrl);
        setResult(parsed);
      } catch (e) {
        console.error('Failed to parse callback:', e);
      }
    }
  }, [searchParams, locale]);

  const addParam = () => setCustomParams([...customParams, { key: '', value: '' }]);
  const removeParam = (index: number) => setCustomParams(customParams.filter((_, i) => i !== index));
  const updateParam = (index: number, field: 'key' | 'value', val: string) => {
    const next = [...customParams];
    next[index][field] = val;
    setCustomParams(next);
  };

  const handleLogin = () => {
    const atp = new AtPassport({
      callbackUrl: window.location.origin + window.location.pathname,
      baseUrl: window.location.origin,
      lang: locale as 'en' | 'ja'
    });

    const paramsObj: Record<string, string> = {};
    customParams.forEach(p => {
      if (p.key.trim()) paramsObj[p.key.trim()] = p.value;
    });

    const { url } = atp.generateAuthUrl(paramsObj);
    window.location.href = url;
  };

  return (
    <Container size="sm" py="xl" style={{ maxWidth: 600 }}>
      <Stack gap="xl">
        <header>
          <Box mb="md">
            <Title order={2} mb={4}>{t('title')}</Title>
            <Text c="dimmed" size="sm">{t('description')}</Text>
          </Box>
        </header>

        <Paper withBorder p="xl" radius="lg" shadow="sm">
          <Stack gap="md">
            <Text size="sm" fw={600} c="gray.7">{t('custom_params')}</Text>

            <Stack gap="xs">
              {customParams.map((p, i) => (
                <Group key={i} gap="xs" align="flex-start">
                  <TextInput
                    placeholder={t('param_key')}
                    value={p.key}
                    onChange={(e) => updateParam(i, 'key', e.currentTarget.value)}
                    style={{ flex: 1 }}
                    radius="md"
                  />
                  <TextInput
                    placeholder={t('param_value')}
                    value={p.value}
                    onChange={(e) => updateParam(i, 'value', e.currentTarget.value)}
                    style={{ flex: 1 }}
                    radius="md"
                  />
                  <ActionIcon
                    color="red"
                    variant="light"
                    onClick={() => removeParam(i)}
                    size="lg"
                    radius="md"
                    mt={2}
                  >
                    <IconTrash size={18} />
                  </ActionIcon>
                </Group>
              ))}
            </Stack>

            <Button
              variant="subtle"
              leftSection={<IconPlus size={16} />}
              onClick={addParam}
              size="sm"
              radius="md"
              w="fit-content"
            >
              {t('add_param')}
            </Button>

            <Divider my="md" />

            <Button
              variant="filled"
              color="blue"
              onClick={handleLogin}
              leftSection={<AtPassportIcon size={24} />}
              fullWidth
              radius="md"
            >
              {AtPassportUI[locale as 'ja' | 'en']?.title || AtPassportUI.en.title}
            </Button>

            {result && (
              <>
                <Divider my="lg" />
                <Stack gap="lg">
                  <Box>
                    <Table verticalSpacing="sm">
                      <Table.Tbody>
                        <Table.Tr>
                          <Table.Td fw={600} w={140}>handle</Table.Td>
                          <Table.Td><Code p="xs" style={{ fontSize: 13 }}>{result.handle}</Code></Table.Td>
                        </Table.Tr>
                        <Table.Tr>
                          <Table.Td fw={600}>did</Table.Td>
                          <Table.Td><Code p="xs" style={{ fontSize: 12, wordBreak: 'break-all' }}>{result.did}</Code></Table.Td>
                        </Table.Tr>
                        <Table.Tr>
                          <Table.Td fw={600}>pdsurl</Table.Td>
                          <Table.Td><Code p="xs" style={{ fontSize: 12 }}>{result.pdsUrl}</Code></Table.Td>
                        </Table.Tr>
                        <Table.Tr>
                          <Table.Td fw={600}>atpstate</Table.Td>
                          <Table.Td><Code p="xs" style={{ fontSize: 12, wordBreak: 'break-all' }}>{result.atpstate}</Code></Table.Td>
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
                              <Table.Td><Code p="xs" style={{ fontSize: 13 }}>{v as string}</Code></Table.Td>
                            </Table.Tr>
                          ))}
                        </Table.Tbody>
                      </Table>
                    </Box>
                  )}
                </Stack>
              </>
            )}
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}

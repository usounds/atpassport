'use client';

import { useState } from 'react';
import { Autocomplete, Avatar, Group, Text, Button, Modal, Stack, Checkbox, Box } from '@mantine/core';
import { useTranslations } from 'next-intl';
import { useDebouncedCallback, useDisclosure } from '@mantine/hooks';
import { registerHandle } from '@/lib/actions';
import { IconPlus } from '@tabler/icons-react';
import { publicAgent } from '@/lib/atproto';

export function RegisterForm({ handleCount = 0 }: { handleCount?: number }) {
  const [handle, setHandle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<{ value: string; label: string; avatar?: string }[]>([]);
  const [agreed, setAgreed] = useState(false);
  const [opened, { open, close }] = useDisclosure(false);
  const t = useTranslations('Home');

  const needsConsent = handleCount === 0;

  const handleRegister = async () => {
    const formattedHandle = handle.trim().replace(/@/g, '').toLowerCase();
    const finalHandle = formattedHandle && !formattedHandle.includes('.')
      ? `${formattedHandle}.bsky.social`
      : formattedHandle;

    if (!finalHandle) return;
    if (needsConsent && !agreed) return;
    setLoading(true);
    setError(null);

    try {
      const res = await registerHandle(finalHandle);
      if (res && !res.success) {
        if (res.error === "Handle not found or missing PDS") {
          setError(t('handle_not_found'));
        } else if (res.error === "already_registered") {
          setError(t('already_registered'));
        } else {
          setError(res.error || t('invalid_handle'));
        }
        return;
      }
      setHandle('');
      setAgreed(false);
      close();
    } catch (e: any) {
      console.error('Registration failed:', e);
      setError(e.message || 'Failed to register');
    } finally {
      setLoading(false);
    }
  };

  const handleInput = useDebouncedCallback(async (val: string) => {
    if (!val) {
      setSuggestions([]);
      return;
    }

    try {
      const res = await publicAgent.get("app.bsky.actor.searchActorsTypeahead", {
        params: {
          q: val,
          limit: 5,
        },
      });

      if (res.ok && res.data) {
        setSuggestions(res.data.actors.map((a: any) => ({
          value: a.handle,
          label: a.handle,
          avatar: a.avatar
        })));
      }
    } catch (err) {
      // console.error("searchActorsTypeahead error", err);
    }
  }, 300);

  const handleClose = () => {
    setHandle('');
    setError(null);
    setAgreed(false);
    close();
  };

  return (
    <>
      <Box className="animate-slide-in">
        <Button
          fullWidth
          variant="filled"
          color="blue"
          leftSection={<IconPlus size={16} />}
          onClick={open}
          radius="md"
          style={{
            boxShadow: '0 4px 12px rgba(0, 133, 255, 0.2)',
          }}
        >
          {t('add_handle')}
        </Button>
      </Box>

      <Modal opened={opened} onClose={handleClose} title={t('add_handle')} centered radius="lg">
        <Stack gap="md">
          <Autocomplete
            label={t('handle')}
            name="handle"
            placeholder={t('placeholder_handle')}
            required
            radius="md"
            autoCapitalize={"none"}
            autoCorrect={"off"}
            autoComplete={"off"}
            spellCheck={false}
            value={handle}
            data={suggestions}
            leftSection={
              <Text size="sm">@</Text>
            }
            renderOption={({ option }: { option: any }) => (
              <Group gap="sm">
                <Avatar src={option.avatar} size={24} radius="xl" />
                <Text size="sm">{option.value}</Text>
              </Group>
            )}
            onInput={(event) => handleInput(event.currentTarget.value)}
            onChange={(value) => {
              const val = value.replace(/@/g, '').toLowerCase();
              setHandle(val);
              setSuggestions([]);
              setError(null);
            }}
            onBlur={() => {
              if (handle && !handle.includes('.')) {
                setHandle(`${handle}.bsky.social`);
              }
            }}
            error={error}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleRegister();
              }
            }}
            styles={{
              input: {
                fontSize: 16,
              },
            }}
          />
          {needsConsent && (
            <Checkbox
              checked={agreed}
              onChange={(e) => setAgreed(e.currentTarget.checked)}
              label={t.rich('agree_to_terms', {
                terms: (chunks) => (
                  <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--mantine-color-blue-6)' }}>
                    {chunks}
                  </a>
                ),
                privacy: (chunks) => (
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--mantine-color-blue-6)' }}>
                    {chunks}
                  </a>
                ),
              })}
              size="sm"
            />
          )}
          <Button
            onClick={handleRegister}
            loading={loading}
            fullWidth
            disabled={needsConsent && !agreed}
          >
            {t('register')}
          </Button>
        </Stack>
      </Modal>
    </>
  );
}

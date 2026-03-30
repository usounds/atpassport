'use client';

import { useState, useEffect } from 'react';
import { Autocomplete, Avatar, Group, Text, Button, Modal, Stack, Checkbox, Box, type ComboboxItem } from '@mantine/core';
import { useTranslations } from 'next-intl';
import { useDebouncedCallback, useDisclosure } from '@mantine/hooks';
import { registerHandle, initializeSession } from '@/lib/actions';
import { IconPlus } from '@tabler/icons-react';
import { publicAgent } from '@/lib/atproto';
import { Link } from '@/i18n/routing';
import { IconAlertCircle } from '@tabler/icons-react';
import { ok } from '@atcute/client';

const MAX_HANDLES = 15;

interface SuggestionItem extends ComboboxItem {
  avatar?: string;
}

export function RegisterForm({ handleCount = 0 }: { handleCount?: number }) {
  const [handle, setHandle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [agreed, setAgreed] = useState(false);
  const [opened, { open, close }] = useDisclosure(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);
  const t = useTranslations('Home');
  const isLimitReached = handleCount >= MAX_HANDLES;
  const needsConsent = handleCount === 0;
  
  const normalize = (v: string) => {
    const f = v.trim().replace(/@/g, '').toLowerCase();
    if (f && !f.includes('.')) {
      return `${f}.bsky.social`;
    }
    return f;
  };

  const handleRegister = async () => {
    if (isLimitReached) return;
    const currentHandle = normalize(handle);
    if (!currentHandle) return;

    // UI表示を同期させる（ユーザーの要望通り、即時に反映する）
    setHandle(currentHandle);
    
    if (needsConsent && !agreed) return;
    setLoading(true);
    setError(null);

    try {
      const res = await registerHandle(currentHandle);
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
    } catch (e) {
      console.error('Registration failed:', e);
      setError(e instanceof Error ? e.message : 'Failed to register');
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
      const res = await ok(publicAgent.get("app.bsky.actor.searchActorsTypeahead", {
        params: {
          q: val,
          limit: 5,
        },
      }));

      if (res.actors) {
        setSuggestions(res.actors.map((a) => ({
          value: a.handle,
          label: a.handle,
          avatar: a.avatar
        })));
      }
    } catch {
      // console.error("searchActorsTypeahead error");
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
      <Box 
        className={isMounted ? "animate-slide-in" : ""}
        style={{ opacity: isMounted ? 1 : 0 }}
      >
        {isLimitReached ? (
          <Group 
            gap="xs" 
            p="sm" 
            style={{ 
              borderRadius: 'var(--mantine-radius-md)', 
              background: 'var(--mantine-color-orange-light)',
              border: '1px solid var(--mantine-color-orange-light-hover)'
            }}
          >
            <IconAlertCircle size={18} color="var(--mantine-color-orange-filled)" />
            <Text size="sm" fw={500} c="orange.9">
              {t('handle_limit_reached')}
            </Text>
          </Group>
        ) : (
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
        )}
      </Box>

      <Modal 
        opened={opened} 
        onClose={handleClose} 
        title={t('add_handle')} 
        radius="lg"
        closeOnClickOutside={false}
      >
        <Stack gap="md">
          <Autocomplete
            id="handle"
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
            renderOption={({ option }) => {
              const item = option as SuggestionItem;
              return (
                <Group gap="sm">
                  <Avatar src={item.avatar} size={24} radius="xl" />
                  <Text size="sm">{item.value}</Text>
                </Group>
              );
            }}
            onChange={(value) => {
              const val = value.replace(/@/g, '').toLowerCase();
              setHandle(val);
              handleInput(val);
              setSuggestions([]);
              setError(null);
            }}
            onBlur={() => {
              setHandle(prev => normalize(prev));
            }}
            error={error}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                e.preventDefault();
                e.stopPropagation();
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
              onChange={async (e) => {
                const isChecked = e.currentTarget.checked;
                setAgreed(isChecked);
                if (isChecked) {
                  await initializeSession();
                }
              }}
              label={t.rich('agree_to_terms', {
                terms: (chunks: React.ReactNode) => (
                  <Link href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--mantine-color-blue-6)' }}>
                    {chunks}
                  </Link>
                ),
                privacy: (chunks: React.ReactNode) => (
                  <Link href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--mantine-color-blue-6)' }}>
                    {chunks}
                  </Link>
                ),
              })}
              size="sm"
            />
          )}
          <Button
            onClick={handleRegister}
            loading={loading}
            fullWidth
            disabled={(needsConsent && !agreed) || isLimitReached}
          >
            {t('register')}
          </Button>
        </Stack>
      </Modal>
    </>
  );
}

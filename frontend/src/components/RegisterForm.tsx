'use client';

import { useState } from 'react';
import { TextInput, Button, Modal, Stack, Checkbox, Box } from '@mantine/core';
import { useTranslations } from 'next-intl';
import { useDisclosure } from '@mantine/hooks';
import { registerHandle } from '@/lib/actions';
import { IconPlus } from '@tabler/icons-react';

export function RegisterForm({ handleCount = 0 }: { handleCount?: number }) {
  const [handle, setHandle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
          <TextInput
            label={t('handle')}
            placeholder={t('placeholder_handle')}
            value={handle}
            onChange={(e) => {
              const val = e.currentTarget.value.replace(/@/g, '').toLowerCase();
              setHandle(val);
              setError(null);
            }}
            onBlur={() => {
              if (handle && !handle.includes('.')) {
                setHandle(`${handle}.bsky.social`);
              }
            }}
            error={error}
            required
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleRegister();
              }
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

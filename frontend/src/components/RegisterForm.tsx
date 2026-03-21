'use client';

import { useState } from 'react';
import { TextInput, Button, Modal, Stack, Checkbox } from '@mantine/core';
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
    if (!handle) return;
    if (needsConsent && !agreed) return;
    setLoading(true);
    setError(null);

    try {
      await registerHandle(handle);
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
      <Button
        fullWidth
        variant="light"
        leftSection={<IconPlus size={16} />}
        onClick={open}
      >
        {t('add_handle')}
      </Button>

      <Modal opened={opened} onClose={handleClose} title={t('add_handle')} centered>
        <Stack gap="md">
          <TextInput
            label={t('handle')}
            placeholder={t('placeholder_handle')}
            value={handle}
            onChange={(e) => {
              setHandle(e.currentTarget.value);
              setError(null);
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

'use client';

import { useState } from 'react';
import { TextInput, Button, Modal, Stack } from '@mantine/core';
import { useTranslations } from 'next-intl';
import { useDisclosure } from '@mantine/hooks';
import { registerHandle } from '@/lib/actions';
import { IconPlus } from '@tabler/icons-react';

export function RegisterForm() {
  const [handle, setHandle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [opened, { open, close }] = useDisclosure(false);
  const t = useTranslations('Home');

  const handleRegister = async () => {
    if (!handle) return;
    setLoading(true);
    setError(null);

    try {
      await registerHandle(handle);
      setHandle('');
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
          <Button onClick={handleRegister} loading={loading} fullWidth>
            {t('register')}
          </Button>
        </Stack>
      </Modal>
    </>
  );
}

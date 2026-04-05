'use client';

import { Stepper, Button, Group, TextInput, Text, Stack, Paper, Box, Alert, Code, CopyButton, ActionIcon, Tooltip, Checkbox } from '@mantine/core';
import { IconCircleCheck, IconFileCheck, IconCopy, IconCheck, IconInfoCircle } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { CustomBadge } from '@/components/CustomBadge';

interface VerifyDomainStepperProps {
  did: string;
  handle?: string;
  isHandleVerified?: boolean;
  onVerifyOAuth: (isPublic: boolean) => void;
  onVerifyFile: (domain: string, isPublic: boolean) => void;
  loading?: boolean;
}

export function VerifyDomainStepper({ did, handle, isHandleVerified, onVerifyOAuth, onVerifyFile, loading }: VerifyDomainStepperProps) {
  const t = useTranslations('Developers');
  const [active, setActive] = useState(0);
  const [method, setMethod] = useState<'oauth' | 'file' | null>(null);
  const [domain, setDomain] = useState('');
  const [isPublic, setIsPublic] = useState(true);

  const nextStep = () => setActive((current) => (current < 2 ? current + 1 : current));
  const prevStep = () => setActive((current) => (current > 0 ? current - 1 : current));

  const handleSelectMethod = (m: 'oauth' | 'file') => {
    setMethod(m);
    if (m === 'oauth' && handle) {
      setDomain(handle);
    }
    nextStep();
  };

  const verificationString = `atpassport-verification: ${did}`;

  return (
    <Box>
      <Stepper active={active} onStepClick={setActive} allowNextStepsSelect={false}>
        <Stepper.Step label={t('step_method')} description={t('method_label')} icon={<IconInfoCircle size={18} />}>
          <Stack gap="md" mt="xl">
            <Group grow align="stretch">
              <Paper 
                withBorder 
                p="lg" 
                radius="md" 
                onClick={() => !isHandleVerified && handleSelectMethod('oauth')}
                style={{ 
                  cursor: isHandleVerified ? 'not-allowed' : 'pointer', 
                  borderColor: method === 'oauth' ? 'var(--mantine-color-blue-filled)' : undefined,
                  opacity: isHandleVerified ? 0.6 : 1,
                  backgroundColor: isHandleVerified ? 'light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-6))' : undefined,
                  position: 'relative'
                }}
              >
                {isHandleVerified && (
                  <CustomBadge 
                    variant="filled" 
                    color="green" 
                    style={{ position: 'absolute', top: 10, right: 10 }}
                  >
                    {t('already_verified_badge')}
                  </CustomBadge>
                )}
                <Stack align="center" gap="sm">
                  <IconCircleCheck size={32} color={isHandleVerified ? 'var(--mantine-color-gray-5)' : 'var(--mantine-color-blue-filled)'} />
                  <Text fw={600} c={isHandleVerified ? 'dimmed' : undefined}>{t('method_oauth')}</Text>
                  <Text size="xs" c="dimmed" ta="center">{t('oauth_description')}</Text>
                </Stack>
              </Paper>

              <Paper 
                withBorder 
                p="lg" 
                radius="md" 
                onClick={() => handleSelectMethod('file')}
                style={{ 
                  cursor: 'pointer', 
                  borderColor: method === 'file' ? 'var(--mantine-color-blue-filled)' : undefined,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center'
                }}
              >
                <Stack align="center" gap="sm">
                  <IconFileCheck size={32} color="var(--mantine-color-orange-filled)" />
                  <Text fw={600}>{t('method_file')}</Text>
                  <Text size="xs" c="dimmed" ta="center">{t('file_description')}</Text>
                </Stack>
              </Paper>
            </Group>
          </Stack>
        </Stepper.Step>

        <Stepper.Step label={t('step_verify')} description={t('verify_now')} icon={<IconCircleCheck size={18} />}>
          <Stack gap="lg" mt="xl">
            {method === 'file' ? (
              <>
                <TextInput
                  label={t('domain_input_label')}
                  placeholder={t('domain_placeholder')}
                  value={domain}
                  onChange={(e) => setDomain(e.currentTarget.value)}
                  required
                />
                
                <Alert color="blue" icon={<IconInfoCircle size={16} />}>
                  <Text size="sm">{t('file_verify_instruction')}</Text>
                </Alert>

                <Box>
                  <Text size="xs" fw={700} mb={4}>{t('file_content_label')}</Text>
                  <Group gap={0} align="stretch">
                    <Code block style={{ flex: 1, padding: '12px', borderTopRightRadius: 0, borderBottomRightRadius: 0 }}>
                      {verificationString}
                    </Code>
                    <CopyButton value={verificationString} timeout={2000}>
                      {({ copied, copy }) => (
                        <Tooltip label={copied ? t('copied') : t('copy')} withArrow position="right">
                          <ActionIcon 
                            color={copied ? 'teal' : 'gray'} 
                            variant="light" 
                            onClick={copy} 
                            size={42}
                            style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
                          >
                            {copied ? <IconCheck size={20} /> : <IconCopy size={20} />}
                          </ActionIcon>
                        </Tooltip>
                      )}
                    </CopyButton>
                  </Group>
                </Box>
              </>
            ) : (
              <Box>
                <Text size="sm" mb="md">
                  {t.rich('oauth_verify_intro', { 
                    handle: handle || '', 
                    strong: (chunks) => <strong>{chunks}</strong> 
                  })}
                </Text>
                {isHandleVerified && (
                  <Text size="xs" c="green" fw={500} mb="md">
                    {t('already_verified_message')}
                  </Text>
                )}
              </Box>
            )}

            <Checkbox
              label={t('list_in_directory')}
              checked={isPublic}
              onChange={(e) => setIsPublic(e.currentTarget.checked)}
            />

            <Group justify="flex-end">
              <Button variant="subtle" onClick={prevStep}>{t('cancel')}</Button>
              <Button 
                onClick={() => method === 'oauth' ? onVerifyOAuth(isPublic) : onVerifyFile(domain, isPublic)}
                loading={loading}
                disabled={
                  (method === 'oauth' && isHandleVerified) || 
                  (method === 'file' && !domain.trim())
                }
                leftSection={<IconCircleCheck size={16} />}
              >
                {t('verify_now')}
              </Button>
            </Group>
          </Stack>
        </Stepper.Step>

        <Stepper.Completed>
          <Stack align="center" py="xl" gap="md">
            <IconCircleCheck size={48} color="var(--mantine-color-green-filled)" />
            <Text fw={700} size="lg">{t('success_title')}</Text>
            <Text size="sm" c="dimmed">
               {t('success_message', { domain })}
            </Text>
          </Stack>
        </Stepper.Completed>
      </Stepper>
    </Box>
  );
}

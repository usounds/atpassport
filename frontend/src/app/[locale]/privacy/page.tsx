import { Container, Title, Text, Stack, Paper, List, ListItem } from '@mantine/core';
import { getTranslations } from 'next-intl/server';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Privacy' });

  return (
    <>
      <Header />
      <Container size="sm" py="xl">
        <Stack gap="xl">
          <Paper withBorder p="xl" radius="md">
            <Stack gap="lg">
              <div>
                <Title order={2}>{t('title')}</Title>
                <Text size="sm" c="dimmed" mt="xs">{t('last_updated')}</Text>
              </div>

              <div>
                <Title order={4} mb="xs">{t('section1_title')}</Title>
                <Text size="sm" mb="xs">{t('section1_text')}</Text>
                <List size="sm" withPadding>
                  <ListItem>{t('section1_item1')}</ListItem>
                  <ListItem>{t('section1_item2')}</ListItem>
                  <ListItem>{t('section1_item3')}</ListItem>
                  <ListItem>{t('section1_item4')}</ListItem>
                </List>
              </div>

              <div>
                <Title order={4} mb="xs">{t('section2_title')}</Title>
                <Text size="sm" mb="xs">{t('section2_text')}</Text>
                <List size="sm" withPadding>
                  <ListItem>{t('section2_item1')}</ListItem>
                  <ListItem>{t('section2_item2')}</ListItem>
                  <ListItem>{t('section2_item3')}</ListItem>
                </List>
              </div>

              <div>
                <Title order={4} mb="xs">{t('section3_title')}</Title>
                <Text size="sm">{t('section3_text')}</Text>
              </div>

              <div>
                <Title order={4} mb="xs">{t('section4_title')}</Title>
                <Text size="sm">{t('section4_text')}</Text>
              </div>

              <div>
                <Title order={4} mb="xs">{t('section5_title')}</Title>
                <Text size="sm">{t('section5_text')}</Text>
              </div>

              <div>
                <Title order={4} mb="xs">{t('section6_title')}</Title>
                <Text size="sm">{t('section6_text')}</Text>
              </div>

              <div>
                <Title order={4} mb="xs">{t('section7_title')}</Title>
                <Text size="sm">{t('section7_text')}</Text>
              </div>
            </Stack>
          </Paper>

          <Footer />
        </Stack>
      </Container>
    </>
  );
}

import { getAssociations } from "@/lib/models";
import { getProfiles } from "@/lib/atproto";
import { getSessionUuid } from "@/lib/session";
import { Text } from '@mantine/core';
import { AssociationListClient } from "./AssociationListClient";
import { getTranslations } from "next-intl/server";

export async function AssociationList() {
  const uuid = await getSessionUuid();
  const t = await getTranslations('Home');
  
  if (!uuid) {
    return (
      <Text c="dimmed" ta="center" py="xl">
        {t('no_session')}
      </Text>
    );
  }

  const associations = await getAssociations(uuid);
  console.log(`[AssociationList] Found ${associations.length} associations for UUID: ${uuid}`);

  const items = associations.map((assoc) => ({
    ...assoc,
    profile: null, // Initial state, profiles will be fetched on the client
  }));

  if (items.length === 0) {
    return (
      <Text c="dimmed" ta="center" py="xl">
        {t('no_handles')}
      </Text>
    );
  }

  return <AssociationListClient initialItems={items} />;
}

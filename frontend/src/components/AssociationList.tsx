import { getAssociations } from "@/lib/models";
import { getProfile } from "@/lib/atproto";
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
        No active session
      </Text>
    );
  }

  const associations = await getAssociations(uuid);

  // Fetch profiles for each association
  const items = await Promise.all(
    associations.map(async (assoc) => {
      const profile = await getProfile(assoc.did);
      return { ...assoc, profile };
    })
  );

  if (items.length === 0) {
    return (
      <Text c="dimmed" ta="center" py="xl">
        {t('no_handles')}
      </Text>
    );
  }

  return <AssociationListClient initialItems={items} />;
}

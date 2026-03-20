import { getAssociations } from "@/lib/models";
import { getProfile } from "@/lib/atproto";
import { getSessionUuid } from "@/lib/session";
import { Text, Stack } from '@mantine/core';
import { PickerItem } from "./PickerItem";

export async function PickerList() {
  const uuid = await getSessionUuid();
  
  if (!uuid) {
    return (
      <Text c="dimmed" ta="center" py="xl">
        No active session
      </Text>
    );
  }

  const associations = await getAssociations(uuid);

  const items = await Promise.all(
    associations.map(async (assoc) => {
      const profile = await getProfile(assoc.did);
      return { ...assoc, profile };
    })
  );

  if (items.length === 0) {
    return (
      <Text c="dimmed" ta="center" py="xl">
        No registered handles
      </Text>
    );
  }

  return (
    <Stack gap="sm">
      {items.map((item, index) => (
        <PickerItem key={`${item.did}-${index}`} item={item} />
      ))}
    </Stack>
  );
}

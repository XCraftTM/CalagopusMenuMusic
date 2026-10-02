import { axiosInstance } from '@/api/axios.ts';
import { parseFromApi, serializeForApi } from '@/lib/serialization/api-transform.ts';
import { type MenuMusicConfig, menuMusicConfigSchema, PACKAGE_NAME } from '../lib/schemas.ts';

export default async (settings: MenuMusicConfig): Promise<MenuMusicConfig> => {
  const { data } = await axiosInstance.put(
    `/api/admin/extensions/${PACKAGE_NAME}/settings`,
    serializeForApi(menuMusicConfigSchema, settings),
  );
  return parseFromApi(menuMusicConfigSchema, data.settings);
};

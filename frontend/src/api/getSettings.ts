import { axiosInstance } from '@/api/axios.ts';
import { parseFromApi } from '@/lib/serialization/api-transform.ts';
import { type MenuMusicConfig, menuMusicConfigSchema, PACKAGE_NAME } from '../lib/schemas.ts';

export default async (): Promise<MenuMusicConfig> => {
  const { data } = await axiosInstance.get(`/api/admin/extensions/${PACKAGE_NAME}/settings`);
  return parseFromApi(menuMusicConfigSchema, data.settings);
};

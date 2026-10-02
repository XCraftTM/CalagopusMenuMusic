import { axiosInstance } from '@/api/axios.ts';
import { parseFromApi } from '@/lib/serialization/api-transform.ts';
import { type MenuMusicConfig, menuMusicConfigSchema, PACKAGE_NAME } from '../lib/schemas.ts';

// public endpoint, also works on the login and register pages
export default async (): Promise<MenuMusicConfig> => {
  const { data } = await axiosInstance.get(`/api/extensions/${PACKAGE_NAME}/config`);
  return parseFromApi(menuMusicConfigSchema, data.config);
};

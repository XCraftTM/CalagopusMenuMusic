import { useQuery } from '@tanstack/react-query';
import getConfig from '../api/getConfig.ts';
import { configQueryKey } from './schemas.ts';

/** The public track configuration, shared by the player and the account card. */
export function useMenuMusicConfig() {
  return useQuery({
    queryKey: configQueryKey,
    queryFn: getConfig,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 2,
  });
}

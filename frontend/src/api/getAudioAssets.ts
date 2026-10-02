import { z } from 'zod';
import { axiosInstance } from '@/api/axios.ts';
import { storageAssetSchema } from '@/lib/schemas/admin/assets.ts';
import { parsePaginationFromApi } from '@/lib/serialization/api-transform.ts';
import { TRACK_ASSET_DIRECTORY } from './uploadTrack.ts';

export type StorageAsset = z.infer<typeof storageAssetSchema>;

const AUDIO_EXTENSIONS = ['mp3', 'ogg', 'oga', 'opus', 'wav', 'flac', 'm4a', 'aac', 'weba', 'webm'];

export function isAudioAsset(asset: StorageAsset): boolean {
  if (asset.isDirectory) return false;

  const extension = asset.name.split('.').pop()?.toLowerCase() ?? '';
  return AUDIO_EXTENSIONS.includes(extension);
}

async function listDirectory(directory: string): Promise<StorageAsset[]> {
  try {
    const { data } = await axiosInstance.get('/api/admin/assets', {
      params: { page: 1, per_page: 100, directory },
    });
    return parsePaginationFromApi(storageAssetSchema, data.assets).data;
  } catch {
    // the upload directory does not exist until the first track is uploaded
    return [];
  }
}

/**
 * Audio files from the panel's Assets tab, the same source the admin settings icon field
 * autocompletes from, plus the directory tracks uploaded through this extension land in.
 */
export default async (): Promise<StorageAsset[]> => {
  const [root, uploads] = await Promise.all([listDirectory(''), listDirectory(TRACK_ASSET_DIRECTORY)]);

  const seen = new Set<string>();
  return [...uploads, ...root].filter((asset) => {
    if (!isAudioAsset(asset) || seen.has(asset.url)) return false;
    seen.add(asset.url);
    return true;
  });
};

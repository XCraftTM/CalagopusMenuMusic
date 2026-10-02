import { axiosInstance } from '@/api/axios.ts';

export const TRACK_ASSET_DIRECTORY = 'menu-music';

/**
 * Uploads an audio file through the panel's own asset storage (Admin > Assets),
 * so it works with both the filesystem and the S3 storage driver.
 * Requires the `assets.upload` admin permission.
 */
export default async (file: File, onProgress?: (progress: number) => void): Promise<string> => {
  const form = new FormData();
  form.append('files', file, file.name.replace(/[^\w.-]+/g, '_'));

  const { data } = await axiosInstance.putForm('/api/admin/assets', form, {
    params: { directory: TRACK_ASSET_DIRECTORY },
    onUploadProgress: (event) => {
      if (onProgress && event.total) onProgress(event.loaded / event.total);
    },
  });

  const url = data.assets?.[0]?.url;
  if (typeof url !== 'string') {
    throw new Error('Upload succeeded but no asset URL was returned.');
  }

  return url;
};

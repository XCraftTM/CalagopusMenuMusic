import { z } from 'zod';

export const PACKAGE_NAME = 'dev.xcrafttm.menumusic';

export const DEFAULT_PAGE = 'default';

// keep in sync with `PAGES` in the backend settings.rs
export const PAGES = ['login', 'register', 'password_reset', 'server_list', 'account', 'server', 'admin'] as const;

export const pageKeySchema = z.enum([DEFAULT_PAGE, ...PAGES]);
/** A built-in page. */
export type PageKey = z.infer<typeof pageKeySchema>;

// admin-defined pages matched by URL pattern, keep in sync with the backend settings.rs
export const CUSTOM_PAGE_PREFIX = 'custom-';
export const MAX_CUSTOM_NAME_LENGTH = 64;
export const MAX_CUSTOM_PATH_LENGTH = 256;

export function isBuiltinPage(page: string): page is PageKey {
  return pageKeySchema.safeParse(page).success;
}

export function isCustomPage(page: string): boolean {
  return /^custom-[a-z0-9]{1,32}$/.test(page);
}

export function isValidPathPattern(path: string): boolean {
  return path.startsWith('/') && path.length <= MAX_CUSTOM_PATH_LENGTH && !/[\s\p{Cc}]/u.test(path);
}

export function newCustomPageKey(): string {
  return `${CUSTOM_PAGE_PREFIX}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export const playModeSchema = z.enum(['always', 'idle', 'off']);
export type PlayMode = z.infer<typeof playModeSchema>;

export const trackConfigSchema = z
  .object({
    page: z.string().refine((page) => isBuiltinPage(page) || isCustomPage(page), { message: 'Unknown page' }),
    name: z.string(),
    path: z.string(),
    mode: playModeSchema,
    url: z
      .string()
      .max(2048)
      .refine((url) => url === '' || /^https?:\/\//.test(url) || (url.startsWith('/') && !url.startsWith('//')), {
        message: 'Must start with http://, https:// or /',
      }),
    volume: z.number().int().min(0).max(100),
  })
  .superRefine((track, ctx) => {
    if (!isCustomPage(track.page)) return;

    const name = track.name.trim();
    if (name.length === 0 || name.length > MAX_CUSTOM_NAME_LENGTH) {
      ctx.addIssue({ code: 'custom', path: ['name'], message: `Must be 1 to ${MAX_CUSTOM_NAME_LENGTH} characters` });
    }
    if (!isValidPathPattern(track.path)) {
      ctx.addIssue({ code: 'custom', path: ['path'], message: 'Must start with / and contain no spaces' });
    }
  });
export type TrackConfig = z.infer<typeof trackConfigSchema>;

export const menuMusicConfigSchema = z.object({
  enabled: z.boolean(),
  tracks: z.array(trackConfigSchema),
  idleTimeoutSeconds: z.number().int().min(1).max(86400),
  fadeDurationMs: z.number().int().min(0).max(30000),
  defaultVolume: z.number().int().min(0).max(100),
});
export type MenuMusicConfig = z.infer<typeof menuMusicConfigSchema>;

export const configQueryKey = ['extensions', PACKAGE_NAME, 'config'] as const;

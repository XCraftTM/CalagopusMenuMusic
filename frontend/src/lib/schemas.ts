import { z } from 'zod';

export const PACKAGE_NAME = 'dev.xcrafttm.menumusic';

export const DEFAULT_PAGE = 'default';

// keep in sync with `PAGES` in the backend settings.rs
export const PAGES = ['login', 'register', 'password_reset', 'server_list', 'account', 'server', 'admin'] as const;

export const pageKeySchema = z.enum([DEFAULT_PAGE, ...PAGES]);
export type PageKey = z.infer<typeof pageKeySchema>;

export const playModeSchema = z.enum(['always', 'idle', 'off']);
export type PlayMode = z.infer<typeof playModeSchema>;

export const buttonPositionSchema = z.enum(['top_left', 'top_right', 'bottom_left', 'bottom_right']);
export type ButtonPosition = z.infer<typeof buttonPositionSchema>;

export const trackConfigSchema = z.object({
  page: pageKeySchema,
  mode: playModeSchema,
  url: z
    .string()
    .max(2048)
    .refine((url) => url === '' || /^https?:\/\//.test(url) || (url.startsWith('/') && !url.startsWith('//')), {
      message: 'Must start with http://, https:// or /',
    }),
  volume: z.number().int().min(0).max(100),
});
export type TrackConfig = z.infer<typeof trackConfigSchema>;

export const menuMusicConfigSchema = z.object({
  enabled: z.boolean(),
  tracks: z.array(trackConfigSchema),
  idleTimeoutSeconds: z.number().int().min(1).max(86400),
  fadeDurationMs: z.number().int().min(0).max(30000),
  defaultVolume: z.number().int().min(0).max(100),
  showFloatingButton: z.boolean(),
  floatingButtonPosition: buttonPositionSchema,
});
export type MenuMusicConfig = z.infer<typeof menuMusicConfigSchema>;

export const configQueryKey = ['extensions', PACKAGE_NAME, 'config'] as const;

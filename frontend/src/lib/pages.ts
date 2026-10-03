import { DEFAULT_PAGE, isCustomPage, type MenuMusicConfig, type PageKey, type TrackConfig } from './schemas.ts';

/** The URLs each built-in page covers, shown as the subtitle on the configuration page. */
export const BUILTIN_PAGE_PATHS: Record<PageKey, string> = {
  default: '*',
  login: '/auth/login/*',
  register: '/auth/register',
  password_reset: '/auth/forgot-password, /auth/reset-password, /auth/verify-email',
  server_list: '/, /grouped, /all',
  account: '/account/*',
  server: '/server/*',
  admin: '/admin/*',
};

function normalizePath(pathname: string): string {
  return pathname.replace(/\/+$/, '') || '/';
}

/**
 * Maps a panel URL path onto the built-in page a track can be configured for.
 * Anything that is not recognised falls back to the default track.
 */
export function pageFromPath(pathname: string): PageKey {
  const path = normalizePath(pathname);

  if (path === '/auth/login' || path.startsWith('/auth/login/')) return 'login';
  if (path === '/auth/register' || path.startsWith('/auth/register/')) return 'register';
  if (
    path.startsWith('/auth/forgot-password') ||
    path.startsWith('/auth/reset-password') ||
    path.startsWith('/auth/verify-email')
  ) {
    return 'password_reset';
  }
  if (path === '/auth' || path.startsWith('/auth/')) return 'login';

  if (path.startsWith('/server/')) return 'server';
  if (path === '/admin' || path.startsWith('/admin/')) return 'admin';
  if (path === '/account' || path.startsWith('/account/')) return 'account';
  if (path === '/' || path === '/all' || path === '/grouped') return 'server_list';

  return DEFAULT_PAGE;
}

const patternCache = new Map<string, RegExp>();

/**
 * Turns a custom page pattern into a regex. `*` matches anything (including `/`),
 * and a trailing `/*` also matches the path itself, so `/admin/*` matches `/admin` too.
 */
function patternToRegex(pattern: string): RegExp {
  const cached = patternCache.get(pattern);
  if (cached) return cached;

  const toRegex = (part: string) =>
    part
      .split('*')
      .map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
      .join('.*');

  const normalized = normalizePath(pattern);
  const regex = normalized.endsWith('/*')
    ? new RegExp(`^${toRegex(normalized.slice(0, -2))}(?:/.*)?$`)
    : new RegExp(`^${toRegex(normalized)}$`);

  patternCache.set(pattern, regex);
  return regex;
}

export function pathMatchesPattern(pathname: string, pattern: string): boolean {
  return patternToRegex(pattern).test(normalizePath(pathname));
}

/** The more literal characters a pattern has, the more specific it is. */
export function patternSpecificity(pattern: string): number {
  return pattern.replaceAll('*', '').length;
}

/**
 * The track that applies to a URL: the most specific matching custom page,
 * then the built-in page's own track, then the default track.
 */
export function resolveTrack(config: MenuMusicConfig, pathname: string): TrackConfig | null {
  let custom: TrackConfig | null = null;
  for (const track of config.tracks) {
    if (!isCustomPage(track.page) || !track.path || !pathMatchesPattern(pathname, track.path)) continue;
    if (!custom || patternSpecificity(track.path) > patternSpecificity(custom.path)) custom = track;
  }
  if (custom) return custom;

  const page = pageFromPath(pathname);
  return (
    config.tracks.find((track) => track.page === page) ??
    config.tracks.find((track) => track.page === DEFAULT_PAGE) ??
    null
  );
}

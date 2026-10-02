import { DEFAULT_PAGE, type MenuMusicConfig, type PageKey, type TrackConfig } from './schemas.ts';

/**
 * Maps a panel URL path onto the page key a track can be configured for.
 * Anything that is not recognised falls back to the default track.
 */
export function pageFromPath(pathname: string): PageKey {
  const path = pathname.replace(/\/+$/, '') || '/';

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

/** The track that applies to a page, which is the default track unless the page has its own. */
export function resolveTrack(config: MenuMusicConfig, page: PageKey): TrackConfig | null {
  return (
    config.tracks.find((track) => track.page === page) ??
    config.tracks.find((track) => track.page === DEFAULT_PAGE) ??
    null
  );
}

import { Text } from '@mantine/core';
import { BUILTIN_PAGE_PATHS } from '../lib/pages.ts';
import { isBuiltinPage, type TrackConfig } from '../lib/schemas.ts';
import { useExtTranslations } from '../translations.ts';

/** Page name with the URL(s) it covers as a subtitle, e.g. "Login" / "/auth/login/*". */
export default function PageHeading({ page, name, path }: Pick<TrackConfig, 'page' | 'name' | 'path'>) {
  const { t: tExt } = useExtTranslations();

  const builtin = isBuiltinPage(page);
  const title = builtin ? tExt(`pages.${page}`, {}) : name.trim() || tExt('config.custom.untitled', {});
  const subtitle = builtin ? BUILTIN_PAGE_PATHS[page] : path;

  return (
    <div className='min-w-0'>
      <Text fw={700} size='lg' lh={1.3} truncate>
        {title}
      </Text>
      {subtitle && (
        <Text size='xs' ff='monospace' c='dimmed' className='break-all'>
          {subtitle}
        </Text>
      )}
      {builtin && (
        <Text size='xs' c='dimmed' mt={4}>
          {tExt(`pageDescriptions.${page}`, {})}
        </Text>
      )}
    </div>
  );
}

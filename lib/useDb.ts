'use client';

import { useCallback, useContext, useSyncExternalStore } from 'react';
import { DbContext } from '@/components/DbProvider';
import { startLookup } from './lookup-client';

export function useDb() {
  const store = useContext(DbContext);
  if (!store) throw new Error('useDb harus berada di dalam DbProvider.');
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  const lookup = useCallback(
    (file: File, bookId: string, words: string[]) => startLookup(store, file, bookId, words),
    [store],
  );
  return { ...snapshot, update: store.update, lookup };
}

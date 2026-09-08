'use client';

import { createContext, useEffect, useState, useSyncExternalStore } from 'react';
import { createClientDb, type ClientDb } from '@/lib/client-db';

export const DbContext = createContext<ClientDb | null>(null);

export default function DbProvider({ children }: { children: React.ReactNode }) {
  const [store] = useState(createClientDb);
  const { ready, storageError } = useSyncExternalStore(
    store.subscribe, store.getSnapshot, store.getServerSnapshot,
  );

  useEffect(() => { store.initialize(); }, [store]);

  return (
    <DbContext.Provider value={store}>
      {storageError && (
        <div role="alert" className="border-line bg-surface mx-auto mt-4 w-full max-w-2xl rounded-lg border p-4 text-sm">
          <p>{storageError}</p>
          <button
            onClick={store.retryStorage}
            className="text-accent mt-2 underline underline-offset-4"
          >
            {ready ? 'Coba simpan lagi' : 'Coba baca lagi'}
          </button>
        </div>
      )}
      {children}
    </DbContext.Provider>
  );
}

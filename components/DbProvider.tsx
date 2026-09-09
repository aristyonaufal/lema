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
        <div
          role="alert"
          className="border-danger/40 bg-danger-soft mx-auto mt-4 flex w-full max-w-2xl items-start gap-3 rounded-[1.25rem] border p-4 text-sm"
          style={{ width: 'calc(100% - 2.5rem)' }}
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-danger mt-px h-5 w-5 shrink-0">
            <path d="M12 8.5v5M12 16.8v.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          <div className="flex flex-col items-start gap-2">
            <p className="leading-relaxed">{storageError}</p>
            <button onClick={store.retryStorage} className="btn btn-ghost h-9 min-h-9 text-sm">
              {ready ? 'Coba simpan lagi' : 'Coba baca lagi'}
            </button>
          </div>
        </div>
      )}
      {children}
    </DbContext.Provider>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useDb } from '@/lib/useDb';
import { due } from '@/lib/store';

// Navigasi utama di tepi bawah layar.
//
// Alasannya bukan gaya: tiga tujuan aplikasi ini sebelumnya cuma berupa tautan
// teks di tengah halaman, jadi pengguna harus menggulung untuk berpindah dan
// tidak pernah tahu ada berapa kata yang menunggu. Bilah tetap di bawah berada
// dalam jangkauan jempol, menunjukkan posisi sekarang, dan membawa penghitung.
//
// Bilah ini sengaja disembunyikan sebelum ada buku. Pengguna baru tidak punya
// apa apa di dua tab lainnya, dan tab kosong hanya jadi jalan buntu.

type IconProps = { active: boolean };

function CameraIcon({ active }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-6 w-6">
      <path
        d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.2a1 1 0 0 0 .84-.46l.72-1.1A1 1 0 0 1 10.1 4h3.8a1 1 0 0 1 .84.44l.72 1.1a1 1 0 0 0 .84.46h1.2A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-8Z"
        stroke="currentColor"
        strokeWidth={active ? 1.9 : 1.5}
        strokeLinejoin="round"
      />
      <circle
        cx="12"
        cy="12.5"
        r="3.2"
        stroke="currentColor"
        strokeWidth={active ? 1.9 : 1.5}
        fill={active ? 'currentColor' : 'none'}
        fillOpacity={active ? 0.18 : 0}
      />
    </svg>
  );
}

function CardsIcon({ active }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-6 w-6">
      <rect
        x="3.5" y="7.5" width="17" height="12" rx="2.6"
        stroke="currentColor"
        strokeWidth={active ? 1.9 : 1.5}
        fill={active ? 'currentColor' : 'none'}
        fillOpacity={active ? 0.16 : 0}
      />
      <path d="M6.5 4.5h11" stroke="currentColor" strokeWidth={active ? 1.9 : 1.5} strokeLinecap="round" />
      <path d="M8 12h8M8 15.2h5" stroke="currentColor" strokeWidth={active ? 1.9 : 1.5} strokeLinecap="round" />
    </svg>
  );
}

function ReviewIcon({ active }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-6 w-6">
      <path
        d="M20 12a8 8 0 1 1-2.4-5.7"
        stroke="currentColor"
        strokeWidth={active ? 1.9 : 1.5}
        strokeLinecap="round"
      />
      <path d="M20 3.6V7.9h-4.3" stroke="currentColor" strokeWidth={active ? 1.9 : 1.5} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 8.4v4l2.6 1.6" stroke="currentColor" strokeWidth={active ? 1.9 : 1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function TabBar() {
  const pathname = usePathname();
  const { db, ready } = useDb();

  if (!ready || db.books.length === 0) return null;

  const pending = db.entries.filter((e) => e.status === 'pending').length;
  const dueCount = due(db).length;

  const tabs = [
    {
      href: '/',
      label: 'Baca',
      // Nama yang dibacakan pembaca layar lebih panjang daripada label di layar,
      // supaya tujuannya jelas tanpa melihat ikon di sekitarnya.
      // Nama ini sengaja tidak memuat kata "foto" atau "ulang": kartu kata yang
      // gagal punya tautan "Pilih ulang foto", dan dua tautan yang namanya mirip
      // membuat pembaca layar maupun pengujian sulit membedakannya.
      name: 'Baca, tandai kata baru',
      badge: 0,
      Icon: CameraIcon,
    },
    {
      href: '/kata',
      label: 'Kata',
      name: `Koleksi kata${pending > 0 ? `, ${pending} sedang diproses` : ''}`,
      badge: pending,
      Icon: CardsIcon,
    },
    {
      href: '/review',
      label: 'Review',
      name: `Review${dueCount > 0 ? `, ${dueCount} kata jatuh tempo` : ''}`,
      badge: dueCount,
      Icon: ReviewIcon,
    },
  ];

  return (
    <>
      {/* Penahan ruang supaya isi halaman terakhir tidak tertutup bilah tetap. */}
      <div
        aria-hidden="true"
        className="w-full shrink-0"
        style={{ height: 'calc(var(--tab-h) + env(safe-area-inset-bottom, 0px))' }}
      />
      <nav
        aria-label="Navigasi utama"
        className="border-line bg-surface/85 fixed inset-x-0 bottom-0 z-40 border-t shadow-[var(--shadow-bar)] backdrop-blur-xl"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <ul className="mx-auto flex max-w-md items-stretch justify-around px-2 py-1.5">
          {tabs.map(({ href, label, name, badge, Icon }) => {
            const active = pathname === href;
            return (
              <li key={href} className="flex-1">
                <Link
                  href={href}
                  aria-label={name}
                  aria-current={active ? 'page' : undefined}
                  className={`relative mx-auto flex min-h-13 w-full max-w-24 flex-col items-center justify-center gap-1 rounded-2xl py-1.5 transition-colors ${
                    active ? 'text-foreground bg-foreground/[0.06]' : 'text-muted hover:text-foreground'
                  }`}
                >
                  <span className="relative">
                    <Icon active={active} />
                    {badge > 0 && (
                      <span
                        aria-hidden="true"
                        className="bg-accent text-accent-ink absolute -top-1 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[0.625rem] font-semibold tabular-nums"
                      >
                        {badge > 9 ? '9+' : badge}
                      </span>
                    )}
                  </span>
                  <span className={`text-[0.6875rem] ${active ? 'font-semibold' : 'font-medium'}`}>{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}

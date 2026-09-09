'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useDb } from '@/lib/useDb';
import BookSpine from '@/components/BookSpine';
import { due } from '@/lib/store';

// Navigasi utama.
//
// Satu elemen nav saja, bukan dua yang saling disembunyikan. Di HP dia jadi
// bilah tetap di tepi bawah dalam jangkauan jempol; mulai lebar laptop dia jadi
// sidebar kiri. Alasan memakai satu elemen bukan cuma hemat kode: dua nav yang
// hidup bersamaan berarti dua penanda landmark dan dua tautan dengan nama sama
// bagi pembaca layar, dan itu juga yang membuat pengujian jadi ambigu.
//
// Bilah ini sengaja disembunyikan sebelum ada buku, diatur oleh Shell. Pengguna
// baru tidak punya apa apa di tujuan lain, dan tab kosong hanya jadi jalan buntu.

type IconProps = { active: boolean };

function HomeIcon({ active }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-6 w-6">
      <path
        d="M4 10.6 12 4.5l8 6.1V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19v-8.4Z"
        stroke="currentColor"
        strokeWidth={active ? 1.9 : 1.5}
        strokeLinejoin="round"
        fill={active ? 'currentColor' : 'none'}
        fillOpacity={active ? 0.16 : 0}
      />
      <path d="M9.8 20.5v-5.2h4.4v5.2" stroke="currentColor" strokeWidth={active ? 1.9 : 1.5} strokeLinejoin="round" />
    </svg>
  );
}

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

export default function Nav() {
  const pathname = usePathname();
  const { db } = useDb();

  const pending = db.entries.filter((e) => e.status === 'pending').length;
  const dueCount = due(db).length;
  const active = db.books.find((b) => b.id === db.activeBookId) ?? null;
  const activeWords = active ? db.entries.filter((e) => e.bookId === active.id).length : 0;

  const tabs = [
    {
      href: '/',
      label: 'Beranda',
      name: 'Beranda, ringkasan progres',
      badge: 0,
      Icon: HomeIcon,
    },
    {
      href: '/baca',
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
    <nav
      aria-label="Navigasi utama"
      className="border-line bg-surface/85 fixed inset-x-0 bottom-0 z-40 border-t shadow-[var(--shadow-bar)] backdrop-blur-xl lg:inset-y-0 lg:right-auto lg:w-64 lg:flex lg:flex-col lg:gap-7 lg:border-t-0 lg:border-r lg:px-4 lg:py-7 lg:shadow-none"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {/* Kepala sidebar. Di HP tidak ada ruang untuknya, dan judul aplikasi juga
          tidak menambah apa apa di layar sekecil itu. */}
      <div className="hidden px-2 lg:block">
        <p className="font-display text-2xl leading-none tracking-tight">Lema</p>
        <p className="text-faint mt-1.5 text-xs leading-relaxed">
          Baca terus, maknanya nyusul.
        </p>
      </div>

      <ul className="mx-auto flex max-w-md items-stretch justify-around px-2 py-1.5 lg:mx-0 lg:max-w-none lg:flex-col lg:gap-1 lg:px-0 lg:py-0">
        {tabs.map(({ href, label, name, badge, Icon }) => {
          const on = pathname === href;
          return (
            <li key={href} className="flex-1 lg:flex-none">
              <Link
                href={href}
                aria-label={name}
                aria-current={on ? 'page' : undefined}
                className={`relative mx-auto flex min-h-13 w-full max-w-24 flex-col items-center justify-center gap-1 rounded-2xl py-1.5 transition-colors lg:mx-0 lg:max-w-none lg:flex-row lg:justify-start lg:gap-3 lg:px-3 lg:py-2.5 ${
                  on ? 'text-foreground bg-foreground/[0.06]' : 'text-muted hover:text-foreground lg:hover:bg-foreground/[0.04]'
                }`}
              >
                <span className="relative lg:shrink-0">
                  <Icon active={on} />
                  {/* Di HP angkanya menempel di ikon karena tidak ada ruang lain.
                      Di sidebar dia pindah ke ujung kanan baris supaya terbaca
                      sebagai jumlah, bukan sebagai noda di atas ikon. */}
                  {badge > 0 && (
                    <span
                      aria-hidden="true"
                      className="bg-accent text-accent-ink absolute -top-1 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[0.625rem] font-semibold tabular-nums lg:hidden"
                    >
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </span>
                <span className={`text-[0.6875rem] lg:flex-1 lg:text-[0.9375rem] ${on ? 'font-semibold' : 'font-medium'}`}>
                  {label}
                </span>
                {badge > 0 && (
                  <span
                    aria-hidden="true"
                    className="bg-accent text-accent-ink hidden h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[0.6875rem] font-semibold tabular-nums lg:inline-flex"
                  >
                    {badge}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Kaki sidebar: buku yang sedang dibaca, supaya konteksnya selalu terlihat
          dari layar mana pun. Sengaja bukan tautan, karena mengganti buku sudah
          punya tempatnya sendiri di beranda dan di layar foto. */}
      {active && (
        <div className="border-line mt-auto hidden items-center gap-3 border-t px-2 pt-5 lg:flex">
          <BookSpine title={active.title} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="eyebrow">Lagi baca</p>
            <p className="mt-0.5 truncate text-sm font-medium">{active.title}</p>
            <p className="text-faint text-xs tabular-nums">
              {activeWords === 0 ? 'Belum ada kata' : `${activeWords} kata`}
            </p>
          </div>
        </div>
      )}
    </nav>
  );
}

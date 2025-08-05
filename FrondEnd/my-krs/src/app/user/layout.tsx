'use client';

import UserNavbar from '@/components/UserNavbar';

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <UserNavbar />
      <main>{children}</main>
    </>
  );
}

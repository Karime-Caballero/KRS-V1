'use client';


import './globals.css';
import ThemeRegistry from '@/theme/ThemeRegistry';
import Navbar from '@/components/Navbar';
import { usePathname } from 'next/navigation';




export default function RootLayout({ children }: { children: React.ReactNode }) {

   const pathname = usePathname();

  // Define las rutas donde NO quieres mostrar el Navbar
  const hideNavbarRoutes = ['/user/home','/user/formulario','/user/planSemanal'];

  const shouldHideNavbar = hideNavbarRoutes.includes(pathname);
  return (
    <html lang="es">
      <body>
        <ThemeRegistry>
          
          {!shouldHideNavbar && <Navbar />}
          {children}
        </ThemeRegistry>
      </body>
    </html>
  );
}

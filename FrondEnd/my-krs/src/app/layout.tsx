import './globals.css';
import ThemeRegistry from '@/theme/ThemeRegistry';
import Navbar from '@/components/Navbar';

export const metadata = {
  title: 'Mi App con MUI',
  description: 'App usando Next.js y Material UI',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <ThemeRegistry>
          <Navbar />
          {children}
        </ThemeRegistry>
      </body>
    </html>
  );
}

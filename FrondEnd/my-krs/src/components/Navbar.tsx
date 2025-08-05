'use client';

import React, { useEffect, useState } from 'react';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState<{name?: string} | null>(null);

  useEffect(() => {
    // Aquí obtienes el usuario con tu método
    // Por ejemplo, localStorage, llamada API, contexto, etc.
    const usuarioLogueado = JSON.parse(localStorage.getItem('usuario') || 'null');
    setUser(usuarioLogueado);
  }, []);

  const handleLogout = () => {
    // Limpia sesión, localStorage, o como manejes logout
    localStorage.removeItem('usuario');
    setUser(null);
    router.push('/');
  };

  return (
    <AppBar
      position="static"
      sx={{
        backgroundColor: '#e79406',
        boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
      }}
    >
      <Toolbar>
        <Box
          onClick={() => router.push('/')}
          sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', mr: 2 }}
        >
          <RestaurantMenuIcon sx={{ mr: 1 }} />
          <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', letterSpacing: 1 }}>
            CreaTuPlan
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, marginLeft: 'auto', alignItems: 'center' }}>
          <Button color="inherit" onClick={() => router.push('/')} sx={{ fontWeight: 'bold' }}>
            Inicio
          </Button>
          <Button color="inherit" onClick={() => router.push('/planes')} sx={{ fontWeight: 'bold' }}>
            Planes
          </Button>
          <Button color="inherit" onClick={() => router.push('/contacto')} sx={{ fontWeight: 'bold' }}>
            Contacto
          </Button>

          {user ? (
            <>
              <Typography variant="body1" sx={{ ml: 2 }}>
                Hola, {user.name || 'Usuario'}
              </Typography>
              <Button color="inherit" onClick={handleLogout} sx={{ fontWeight: 'bold' }}>
                Cerrar sesión
              </Button>
            </>
          ) : (
            <Button color="inherit" onClick={() => router.push('/auth/login')} sx={{ fontWeight: 'bold' }}>
              Iniciar sesión
            </Button>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}

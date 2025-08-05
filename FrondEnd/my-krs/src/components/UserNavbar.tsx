'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Divider,
  Menu,
  MenuItem,
  IconButton,
} from '@mui/material';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';

interface User {
  _id: string;
  nombre: string;
  email: string;
  rol: string;
}

export default function UserNavbar() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        setUser(null);
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/auth/login');
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  return (
    <AppBar
      position="static"
      sx={{
        backgroundColor: '#e79406',
        boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        <Box
          onClick={() => router.push('/user/home')}
          sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
        >
          <RestaurantMenuIcon sx={{ mr: 1 }} />
          <Typography
            variant="h6"
            component="div"
            sx={{ fontWeight: 'bold', letterSpacing: 1 }}
          >
            CreaTuPlan
          </Typography>
        </Box>

        {/* Menú de navegación */}
        <Box sx={{ display: 'flex', gap: 3 }}>
          <Button
            color="inherit"
            onClick={() => router.push('/')}
            sx={{ fontWeight: 'bold' }}
          >
            Inicio
          </Button>
          <Button
            color="inherit"
            onClick={() => router.push('/planes')}
            sx={{ fontWeight: 'bold' }}
          >
            Planes
          </Button>
          <Button
            color="inherit"
            onClick={() => router.push('/contacto')}
            sx={{ fontWeight: 'bold' }}
          >
            Contacto
          </Button>
        </Box>

        {/* Separador vertical */}
        <Divider
          orientation="vertical"
          flexItem
          sx={{ bgcolor: 'rgba(255,255,255,0.7)', mx: 2 }}
        />

        {/* Info usuario y logout */}
        {user ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton
              size="large"
              color="inherit"
              onClick={handleMenuOpen}
              aria-label="menú usuario"
            >
              <AccountCircleIcon />
            </IconButton>

            <Typography
              variant="body1"
              sx={{ fontWeight: 'bold', color: '#fff', minWidth: 100 }}
              noWrap
              title={user.nombre}
            >
              {`Hola, ${user.nombre}`}
            </Typography>

            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
            >
              <MenuItem
                onClick={() => {
                  handleMenuClose();
                  router.push('/user/profile'); // por si quieres perfil
                }}
              >
                Perfil
              </MenuItem>
              <MenuItem
                onClick={() => {
                  handleMenuClose();
                  handleLogout();
                }}
              >
                Cerrar sesión
              </MenuItem>
            </Menu>
          </Box>
        ) : (
          <Button
            color="inherit"
            onClick={() => router.push('/auth/login')}
            sx={{ fontWeight: 'bold' }}
          >
            Iniciar sesión
          </Button>
        )}
      </Toolbar>
    </AppBar>
  );
}

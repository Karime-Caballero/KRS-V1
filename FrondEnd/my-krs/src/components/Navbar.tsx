'use client';

import { AppBar, Toolbar, Typography, Button, Box, IconButton } from '@mui/material';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const router = useRouter();

  return (
    <AppBar
      position="static"
      sx={{
        backgroundColor: '#e79406',
        boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
      }}
    >
      <Toolbar>
        {/* Logo e ícono clicables */}
        <Box
          onClick={() => router.push('/')}
          sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', mr: 2 }}
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
        <Box sx={{ display: 'flex', gap: 2, marginLeft: 'auto' }}>
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
      </Toolbar>
    </AppBar>
  );
}

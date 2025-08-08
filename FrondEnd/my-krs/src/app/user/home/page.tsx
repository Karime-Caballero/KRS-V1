'use client';
import React from 'react';
import {
  Box,
  Button,
  Typography,
  Container,
  Grid,
  Card,
  CardContent,
  CardActions,
} from '@mui/material';
import EmojiFoodBeverageIcon from '@mui/icons-material/EmojiFoodBeverage';
import KitchenIcon from '@mui/icons-material/Kitchen';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import FastfoodIcon from '@mui/icons-material/Fastfood';
import Link from 'next/link';

export default function UserHome() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #FFFDE7 0%, #FFF8E1 100%)',
        display: 'flex',
        flexDirection: 'column',
        py: 8,
        color: '#5D4037',
      }}
    >
      <Container maxWidth="lg">
        <Typography
          variant="h4"
          fontWeight="bold"
          gutterBottom
          sx={{ textAlign: 'center', mb: 6, color: '#EF6C00', fontFamily: 'Poppins, sans-serif' }}
        >
          ¡Bienvenido de nuevo!
        </Typography>

        <Grid container spacing={4} justifyContent="center">
          {[
            {
              title: 'Mi Perfil Alimenticio',
              description: 'Consulta o edita tus preferencias, alergias e ingredientes en casa.',
              icon: <KitchenIcon sx={{ fontSize: 50, color: '#EF6C00' }} />,
              href: '/user/formulario',
            },
            {
              title: 'Mis Recetas y Plan Semanal',
              description: 'Genera o revisa tus recetas y menús adaptados a ti.',
              icon: <EmojiFoodBeverageIcon sx={{ fontSize: 50, color: '#EF6C00' }} />,
              href: '/user/planSemanal',
            },
            {
              title: 'Editar Cuenta',
              description: 'Gestiona tus datos personales y preferencias de acceso.',
              icon: <AccountCircleIcon sx={{ fontSize: 50, color: '#EF6C00' }} />,
              href: '/cuenta',
            },
            {
              title: 'Explorar Recetas',
              description: 'Descubre nuevas recetas saludables para probar.',
              icon: <FastfoodIcon sx={{ fontSize: 50, color: '#EF6C00' }} />,
              href: '/recetas',
            },
          ].map((opcion, idx) => (
            // @ts-expect-error MUI typing issue
            <Grid item xs={12} sm={6} md={4} key={idx}>
              <Card
                elevation={6}
                sx={{
                  height: '100%',
                  borderRadius: 4,
                  bgcolor: '#FFF3E0',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  textAlign: 'center',
                }}
              >
                <CardContent>
                  <Box sx={{ mb: 2 }}>{opcion.icon}</Box>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    {opcion.title}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>
                    {opcion.description}
                  </Typography>
                </CardContent>
                <CardActions sx={{ justifyContent: 'center', pb: 2 }}>
                  <Link href={opcion.href} passHref>
                    <Button
                      variant="contained"
                      sx={{
                        bgcolor: '#EF6C00',
                        color: '#fff',
                        fontWeight: 'bold',
                        '&:hover': {
                          bgcolor: '#E65100',
                        },
                      }}
                    >
                      Ir
                    </Button>
                  </Link>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}

'use client';
import React from 'react';
import { Box, Button, Typography, Container, Grid, Paper, Stack } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import KitchenIcon from '@mui/icons-material/Kitchen';
import EmojiFoodBeverageIcon from '@mui/icons-material/EmojiFoodBeverage';
import TimerIcon from '@mui/icons-material/Timer';
import Image from 'next/image';
import Link from 'next/link';

export default function HomePage() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg,rgb(240, 239, 230) 0%,rgb(239, 236, 228) 100%)',
        display: 'flex',
        flexDirection: 'column',
        paddingTop: 8,
        paddingBottom: 6,
        color: '#5D4037',
      }}
    >
      <Container maxWidth="lg">
        {/* Sección principal con texto e imagen */}
        <Grid container spacing={6} alignItems="center">
          {/* Texto a la izquierda */}
          <Grid item xs={12} md={6}>
            <Typography
              variant="h3"
              fontWeight="bold"
              gutterBottom
              sx={{
                textShadow: '2px 2px 4px rgba(0,0,0,0.15)',
                mb: 2,
                fontFamily: "'Poppins', sans-serif",
              }}
            >
              <span style={{ color: '#EF6C00' }}>Menús Semanales</span>
              <br />
              <span style={{ color: '#BF360C' }}>Personalizados para ti</span>
            </Typography>

            <Typography variant="h6" mb={4} sx={{ opacity: 0.9, lineHeight: 1.5 }}>
              Simplifica tu vida con menús diseñados según tus gustos, alergias y lo que ya tienes en casa.
              Ahorra tiempo y come delicioso todos los días.
            </Typography>

            <Stack direction="row" spacing={3}>
           <Box textAlign="center" mt={3}>
            <Link href="/auth/registro" passHref>
              <Button
                variant="contained"
                sx={{
                  bgcolor: '#ef6c00', // amarillo comida
                  color: 'black',
                  '&:hover': {
                    bgcolor: '#ef6c00',
                  },
                  px: 4,
                  py: 1.5,
                  borderRadius: 3,
                  fontWeight: 'bold',
                  fontSize: '1rem',
                }}
              >
                Registrarse
              </Button>
            </Link>
          </Box>
              <Button
                variant="outlined"
                color="warning"
                size="large"
                href="/auth/login"
                sx={{
                  borderRadius: 3,
                  px: 5,
                  fontWeight: 'bold',
                  borderWidth: 2,
                  color: '#BF360C',
                  '&:hover': {
                    backgroundColor: '#FFF3E0',
                    borderColor: '#EF6C00',
                  },
                  transition: 'all 0.3s ease',
                }}
              >
                Iniciar sesión
              </Button>
            </Stack>
          </Grid>

          {/* Imagen a la derecha */}
          <Grid item xs={12} md={6} sx={{ display: 'flex', justifyContent: 'center' }}>
            
             <Box sx={{ mt: 10, textAlign: 'center' }}>
          <Typography variant="h4" fontWeight="medium" mb={5} sx={{ fontFamily: "'Poppins', sans-serif" }}>
            ¿Cómo funciona?
          </Typography>

          <Grid container spacing={6} justifyContent="center">
            {[
              {
                icon: <KitchenIcon sx={{ fontSize: 50, color: '#F57C00' }} />,
                title: 'Elige tus preferencias',
                desc: 'Selecciona tus alergias, gustos y lo que tienes en tu despensa.',
              },
              {
                icon: <EmojiFoodBeverageIcon sx={{ fontSize: 50, color: '#F57C00' }} />,
                title: 'Genera menús semanales',
                desc: 'Recibe recetas saludables y variadas adaptadas a ti.',
              },
              {
                icon: <TimerIcon sx={{ fontSize: 50, color: '#F57C00' }} />,
                title: 'Ahorra tiempo y dinero',
                desc: 'Compra solo lo necesario y cocina sin complicaciones.',
              },
              {
                icon: <CheckCircleIcon sx={{ fontSize: 50, color: '#F57C00' }} />,
                title: 'Disfruta cada comida',
                desc: 'Dietas balanceadas y deliciosas para toda la familia.',
              },
            ].map((item, i) => (
              <Grid item xs={12} sm={6} md={3} key={i}>
                <Stack spacing={1} alignItems="center" sx={{ px: 2 }}>
                  {item.icon}
                  <Typography fontWeight="bold" variant="h6">
                    {item.title}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>
                    {item.desc}
                  </Typography>
                </Stack>
              </Grid>
            ))}
          </Grid>
        </Box>
            <Image
              src="https://personaconsumidora.elika.eus/wp-content/uploads/2021/04/5.Planificando-menu-semanal.jpg"
              alt="Ilustración menú semanal"
              width={500}
              height={360}
              style={{
                borderRadius: '12px',
                maxWidth: '100%',
                height: 'auto',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)',
              }}
              priority
            />

            
          </Grid>

        </Grid>

        {/* Cómo funciona */}
       

        {/* Beneficios */}
        <Box
          component={Paper}
          elevation={4}
          sx={{
            mt: 12,
            p: 5,
            maxWidth: 900,
            marginX: 'auto',
            borderRadius: 4,
            backgroundColor: '#FFF8E1',
            color: '#5D4037',
            textAlign: 'center',
          }}
        >
          <Typography variant="h5" mb={3} fontWeight="medium" sx={{ fontFamily: "'Poppins', sans-serif" }}>
            ¿Por qué elegirnos?
          </Typography>
          <Typography variant="body1" sx={{ maxWidth: 700, margin: 'auto', lineHeight: 1.6 }}>
            Nuestra plataforma te ayuda a comer mejor sin estrés, aprovechando lo que ya tienes y cuidando tus necesidades.
          </Typography>

          <ul
            style={{
              listStyleType: 'none',
              paddingLeft: 0,
              marginTop: 20,
              maxWidth: 600,
              margin: 'auto',
              textAlign: 'left',
              fontWeight: 600,
            }}
          >
            <li style={{ marginBottom: 10 }}>✓ Menús personalizados según tus alergias y gustos.</li>
            <li style={{ marginBottom: 10 }}>✓ Reduce el desperdicio de comida en casa.</li>
            <li style={{ marginBottom: 10 }}>✓ Fácil y rápido: ahorra tiempo planificando.</li>
            <li style={{ marginBottom: 10 }}>✓ Recetas saludables, nutritivas y deliciosas.</li>
          </ul>
        </Box>
      </Container>

      
    </Box>
  );
}

'use client';

import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  TextField,
  MenuItem,
  Button,
  Chip,
  Autocomplete,
  Stack,
} from '@mui/material';

const dietas = [
  'Omnívora',
  'Vegetariana',
  'Vegana',
  'Keto',
  'Sin gluten',
  'Paleo',
  'Ayuno intermitente',
];

const alergiasComunes = [
  'Gluten',
  'Lácteos',
  'Frutos secos',
  'Mariscos',
  'Huevos',
  'Soya',
  'Ninguna',
];

const PerfilPage = () => {
  const [ingredientesCasa, setIngredientesCasa] = useState<string[]>([]);
  const [alergias, setAlergias] = useState<string[]>([]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(to right, #f9f9f9, #fdf6e3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 6,
        px: 2,
      }}
    >
      <Container maxWidth="md">
        <Paper
          elevation={4}
          sx={{
            p: 5,
            borderRadius: 4,
            bgcolor: 'white',
          }}
        >
          <Typography variant="h4" align="center" gutterBottom>
            Configuración Inicial del Perfil
          </Typography>
          <Typography variant="subtitle1" align="center" sx={{ mb: 4 }}>
            Cuéntanos sobre tus preferencias para ofrecerte menús personalizados
          </Typography>

          <Box component="form" noValidate autoComplete="off">
            <TextField
              select
              fullWidth
              label="Tipo de dieta"
              margin="normal"
              defaultValue=""
              required
            >
              {dietas.map((dieta) => (
                <MenuItem key={dieta} value={dieta}>
                  {dieta}
                </MenuItem>
              ))}
            </TextField>

            <Autocomplete
              multiple
              freeSolo
              options={alergiasComunes}
              value={alergias}
              onChange={(event, newValue) => setAlergias(newValue)}
              renderTags={(value: string[], getTagProps) =>
                value.map((option: string, index: number) => (
                  <Chip
                    variant="outlined"
                    color="error"
                    label={option}
                    {...getTagProps({ index })}
                    key={index}
                  />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  variant="outlined"
                  label="Alergias alimentarias"
                  placeholder="Escribe y presiona Enter"
                  margin="normal"
                />
              )}
            />

            <TextField
              fullWidth
              label="Objetivo nutricional"
              placeholder="Ejemplo: Bajar de peso, mantener masa muscular..."
              margin="normal"
              required
            />

            <Autocomplete
              multiple
              freeSolo
              options={[]}
              value={ingredientesCasa}
              onChange={(event, newValue) => setIngredientesCasa(newValue)}
              renderTags={(value: string[], getTagProps) =>
                value.map((option: string, index: number) => (
                  <Chip
                    variant="outlined"
                    color="primary"
                    label={option}
                    {...getTagProps({ index })}
                    key={index}
                  />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  variant="outlined"
                  label="10 ingredientes que sueles tener en casa"
                  placeholder="Ej: Arroz, pollo, lentejas..."
                  margin="normal"
                />
              )}
            />

            <Stack direction="row" justifyContent="center" mt={4}>
              <Button
                type="submit"
                variant="contained"
                sx={{
                  px: 5,
                  py: 1.5,
                  fontWeight: 'bold',
                  bgcolor: '#FFB300',
                  color: '#000',
                  '&:hover': {
                    bgcolor: '#FFA000',
                  },
                }}
              >
                Guardar perfil
              </Button>
            </Stack>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default PerfilPage;

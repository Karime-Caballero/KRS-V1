'use client';
import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Grid,
  Divider,
  MenuItem,
  Select,
  SelectChangeEvent,
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

type Meal = { desayuno: string; comida: string; cena: string };
const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const recetasDisponibles = [
  'Avena con fruta',
  'Huevos revueltos',
  'Pan integral con aguacate',
  'Ensalada de quinoa',
  'Pollo al horno',
  'Tacos de pescado',
  'Sopa de verduras',
  'Pasta integral con vegetales',
  'Sándwich de atún',
];

const generarMenuEjemplo = (): Meal[] =>
  diasSemana.map(() => ({
    desayuno: 'Avena con fruta',
    comida: 'Ensalada de quinoa',
    cena: 'Sopa de verduras',
  }));

export default function Planificador() {
  const [fechaInicio, setFechaInicio] = useState<Date | null>(null);
  const [menu, setMenu] = useState<Meal[] | null>(null);
  const [menuGuardado, setMenuGuardado] = useState(false);

  const handleGenerarMenu = () => {
    if (!fechaInicio) return;
    setMenu(generarMenuEjemplo());
    setMenuGuardado(false);
  };

  const handleRecetaChange = (
    e: SelectChangeEvent,
    diaIndex: number,
    tipo: keyof Meal
  ) => {
    if (!menu) return;
    const nuevoMenu = [...menu];
    nuevoMenu[diaIndex][tipo] = e.target.value;
    setMenu(nuevoMenu);
  };

  const handleGuardar = () => {
    setMenuGuardado(true);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: 4, backgroundColor: '#fffbe6', minHeight: '100vh' }}>
        <Typography variant="h4" gutterBottom color="orange">
          Planificador Semanal de Comidas 🍽️
        </Typography>

        <Box sx={{ mb: 3 }}>
          <Typography variant="body1">Selecciona el día de inicio:</Typography>
          <DatePicker
            value={fechaInicio}
            onChange={(newValue) => setFechaInicio(newValue)}
            slotProps={{ textField: { fullWidth: true, variant: 'outlined', sx: { mt: 1 } } }}
          />
        </Box>

        <Button
          variant="contained"
          color="warning"
          onClick={handleGenerarMenu}
          disabled={!fechaInicio}
          sx={{ mb: 4 }}
        >
          Generar menú semanal
        </Button>

        {!menu ? (
          <Box
            sx={{
              textAlign: 'center',
              mt: 8,
              color: 'gray',
              fontStyle: 'italic',
              background: '#fff3e0',
              borderRadius: 2,
              py: 6,
              px: 2,
            }}
          >
            <Typography variant="h5" gutterBottom>
              🍲 Esperando tu selección...
            </Typography>
            <Typography variant="body1">
              Selecciona una fecha y genera un menú basado en tus preferencias y lo que tienes en casa.
            </Typography>
          </Box>
        ) : (
          <>
            <Grid container spacing={4}>
              {diasSemana.map((dia, index) => (
                <Grid item xs={12} md={6} lg={4} key={dia}>
                  <Box
                    sx={{
                      backgroundColor: '#fff3e0',
                      padding: 2,
                      borderRadius: 2,
                      boxShadow: 1,
                    }}
                  >
                    <Typography variant="h6" color="orange">{dia}</Typography>
                    <Divider sx={{ my: 1 }} />
                    {(['desayuno', 'comida', 'cena'] as (keyof Meal)[]).map((tipo) => (
                      <Box key={tipo} sx={{ mb: 2 }}>
                        <Typography sx={{ fontWeight: 'bold' }}>
                          {tipo[0].toUpperCase() + tipo.slice(1)}:
                        </Typography>
                        <Select
                          fullWidth
                          value={menu[index][tipo]}
                          onChange={(e) => handleRecetaChange(e, index, tipo)}
                          sx={{ backgroundColor: 'white', mt: 0.5 }}
                        >
                          {recetasDisponibles.map((receta) => (
                            <MenuItem key={receta} value={receta}>
                              {receta}
                            </MenuItem>
                          ))}
                        </Select>
                      </Box>
                    ))}
                  </Box>
                </Grid>
              ))}
            </Grid>

            <Box sx={{ textAlign: 'center', mt: 4 }}>
              <Button variant="contained" color="success" size="large" onClick={handleGuardar}>
                Aceptar y guardar menú 📝
              </Button>
              {menuGuardado && (
                <Typography sx={{ mt: 2 }} color="green">
                  ✅ ¡Tu menú ha sido guardado en el historial!
                </Typography>
              )}
            </Box>
          </>
        )}
      </Box>
    </LocalizationProvider>
  );
}

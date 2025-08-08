'use client';
import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Divider,
  Container,
  Paper,
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { jsPDF } from 'jspdf';

type Receta = {
  titulo: string;
  ingredientes: string;
  tiempo: string;
  procedimiento: string;
};

type Meal = {
  desayuno: Receta;
  comida: Receta;
  cena: Receta;
};

const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export default function Planificador() {
  const [fechaInicio, setFechaInicio] = useState<Date | null>(null);
  const [menu, setMenu] = useState<Meal[] | null>(null);
  const [menuGuardado, setMenuGuardado] = useState(false);

  const fetchMenuDesdeAPI = async (): Promise<Meal[]> => {
    try {
      const res = await fetch('/api/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fechaInicio }),
      });
      const data = await res.json();
      return data.menu;
    } catch (error) {
      console.error('Error al obtener el menú:', error);
      return [];
    }
  };

  const handleGenerarMenu = async () => {
    if (!fechaInicio) return;
    const menuAPI = await fetchMenuDesdeAPI();
    setMenu(menuAPI);
    setMenuGuardado(false);
  };

  const handleGuardar = () => {
    setMenuGuardado(true);
  };

  const handleImprimir = () => {
    if (!menu) return;

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.setTextColor('#e65100');
    doc.text('Planificador Semanal de Comidas', 14, 20);

    let y = 30; // posición vertical inicial

    menu.forEach((diaMenu, index) => {
      const nombreDia = diasSemana[index];
      doc.setFontSize(14);
      doc.setTextColor('#f57c00');
      doc.text(`${nombreDia}`, 14, y);
      y += 8;

      (['desayuno', 'comida', 'cena'] as (keyof Meal)[]).forEach((tipo) => {
        const receta = diaMenu[tipo];
        doc.setFontSize(12);
        doc.setTextColor('#000');
        doc.text(`${tipo[0].toUpperCase() + tipo.slice(1)}: ${receta?.titulo || 'No asignado'}`, 14, y);
        y += 6;

        doc.setFontSize(10);
        doc.text(`Ingredientes: ${receta?.ingredientes || 'No especificado'}`, 16, y);
        y += 6;

        doc.text(`Tiempo: ${receta?.tiempo || 'No especificado'}`, 16, y);
        y += 6;

        const lineHeight = 6;
        const maxLineWidth = 180;
        const procedimientoTexto = receta?.procedimiento || 'No especificado';
        const textLines = doc.splitTextToSize(procedimientoTexto, maxLineWidth);

        doc.text('Procedimiento:', 16, y);
        y += lineHeight;
        doc.text(textLines, 16, y);
        y += lineHeight * textLines.length;

        y += 4;

        if (y > 270) {
          doc.addPage();
          y = 20;
        }
      });

      y += 8;
    });

    doc.save('PlanSemanalComidas.pdf');
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ backgroundColor: '#fffbe6', minHeight: '100vh', pb: 8 }}>
        <Container maxWidth="m" sx={{ pt: 8 }}>
          <Typography variant="h4" gutterBottom color="orange" align="center">
            Planificador Semanal de Comidas 
          </Typography>

          <Paper elevation={2} sx={{ p: 3, mb: 4, backgroundColor: '#fff3e0', borderRadius: 3 }}>
            <Typography variant="body1">Selecciona el día de inicio:</Typography>
            <DatePicker
              value={fechaInicio}
              onChange={(newValue) => setFechaInicio(newValue)}
              slotProps={{ textField: { fullWidth: true, variant: 'outlined', sx: { mt: 1 } } }}
            />
            <Box sx={{ textAlign: 'center', mt: 3 }}>
              <Button
                variant="contained"
                color="warning"
                onClick={handleGenerarMenu}
                disabled={!fechaInicio}
              >
                Generar menú semanal
              </Button>
            </Box>
          </Paper>
        </Container>

        {!menu ? (
          <Container maxWidth="m">
            <Paper
              elevation={1}
              sx={{
                textAlign: 'center',
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
            </Paper>
          </Container>
        ) : (
          <>
            <Box sx={{ maxWidth: '100%', px: 8, mt: 4 }}>
              {diasSemana.map((dia, index) => (
                <Box key={dia} sx={{ mb: 6 }}>
                  <Typography variant="h5" color="orange" gutterBottom>
                    {dia}
                  </Typography>
                  <Divider sx={{ mb: 2 }} />

                  {(['desayuno', 'comida', 'cena'] as (keyof Meal)[]).map((tipo) => {
                    const receta = menu[index]?.[tipo];
                    return (
                      <Paper
                        key={tipo}
                        elevation={3}
                        sx={{
                          p: 3,
                          mb: 3,
                          backgroundColor: '#fff3e0',
                          borderRadius: 3,
                          border: '1px solid #e0e0e0',
                        }}
                      >
                        <Typography variant="h6" sx={{ color: '#e65100' }}>
                          {tipo[0].toUpperCase() + tipo.slice(1)}: {receta?.titulo || 'No asignado'}
                        </Typography>

                        <Divider sx={{ my: 1 }} />

                        <Typography sx={{ fontWeight: 'bold', mt: 1 }}>🧂 Ingredientes:</Typography>
                        <Typography>{receta?.ingredientes || 'No especificado'}</Typography>

                        <Typography sx={{ fontWeight: 'bold', mt: 2 }}>⏱️ Tiempo de preparación:</Typography>
                        <Typography>{receta?.tiempo || 'No especificado'}</Typography>

                        <Typography sx={{ fontWeight: 'bold', mt: 2 }}>👩‍🍳 Procedimiento:</Typography>
                        <Typography whiteSpace="pre-line">
                          {receta?.procedimiento || 'No especificado'}
                        </Typography>
                      </Paper>
                    );
                  })}
                </Box>
              ))}
            </Box>

            <Box
              sx={{
                textAlign: 'center',
                mt: 5,
                display: 'flex',
                justifyContent: 'center',
                gap: 2,
              }}
            >
              <Button variant="contained" color="success" size="large" onClick={handleGuardar}>
                Aceptar y guardar menú 
              </Button>
              <Button variant="outlined" color="primary" size="large" onClick={handleImprimir}>
                Descargar PDF 
              </Button>
            </Box>

            {menuGuardado && (
              <Typography sx={{ mt: 2 }} color="green" align="center">
                ✅ ¡Tu menú ha sido guardado en el historial!
              </Typography>
            )}
          </>
        )}
      </Box>
    </LocalizationProvider>
  );
}

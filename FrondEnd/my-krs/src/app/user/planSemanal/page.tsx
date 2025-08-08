'use client';
import React, { useEffect, useState } from 'react';
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

  const fetchMenuDesdeAPI = async (): Promise<string | null> => {
    try {
      const userId = JSON.parse(localStorage.getItem('user') || '{}')._id;
      const res = await fetch(`http://localhost:4000/plans/${userId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dias: 7,
          fecha_inicio: fechaInicio?.toISOString(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error('Error generando plan:', data.message);
        return null;
      }

      return data.data.plan_id;
    } catch (error) {
      console.error('Error al obtener el menú:', error);
      return null;
    }
  };

  const fetchPlanPorId = async (planId: string) => {
    try {
      const res = await fetch(`http://localhost:4000/plans/${planId}`);
      const data = await res.json();

      if (!res.ok) {
        console.error('Error al obtener el plan:', data.message);
        return null;
      }

      return data.data;
    } catch (error) {
      console.error('Error al hacer la petición:', error);
      return null;
    }
  };

  const esperarPlanFinalizado = async (
    planId: string,
    maxIntentos = 10,
    intervalo = 10000
  ): Promise<any | null> => {
    await new Promise(res => setTimeout(res, intervalo));  // Espera 10s antes de la primera consulta
    for (let i = 0; i < maxIntentos; i++) {
      const plan = await fetchPlanPorId(planId);
      if (plan && plan.estado === 'finalizado') {
        return plan;
      }
      await new Promise(res => setTimeout(res, intervalo));
    }
    console.error('No se obtuvo un plan finalizado en el tiempo esperado');
    return null;
  };


  const handleGenerarMenu = async () => {
    if (!fechaInicio) return;

    const planId = await fetchMenuDesdeAPI();
    if (!planId) return;

    const planFinalizado = await esperarPlanFinalizado(planId);
    if (!planFinalizado) return;

    const menuFormateado: Meal[] = planFinalizado.dias.map((dia: any) => {
      const meal: any = {};

      dia.comidas.forEach((comida: any) => {
        // Mapear tipo de comida backend a tipo que espera frontend
        let tipoFront = '';
        if (comida.tipo === 'breakfast') tipoFront = 'desayuno';
        else if (comida.tipo === 'lunch') tipoFront = 'comida';
        else if (comida.tipo === 'dinner') tipoFront = 'cena';
        else tipoFront = comida.tipo; // por si hay otro tipo inesperado

        meal[tipoFront] = {
          titulo: comida.nombre_receta,
          ingredientes: comida.ingredientes_faltantes
            ?.map((ing: any) => `${ing.nombre} (${ing.cantidad} ${ing.unidad})`)
            .join(', '),
          tiempo: 'No especificado',
          procedimiento: 'No especificado',
        };
      });

      // Asegurar que desayuno, comida y cena existan para evitar errores
      return {
        desayuno: meal.desayuno || {
          titulo: 'No asignado',
          ingredientes: '',
          tiempo: '',
          procedimiento: '',
        },
        comida: meal.comida || {
          titulo: 'No asignado',
          ingredientes: '',
          tiempo: '',
          procedimiento: '',
        },
        cena: meal.cena || {
          titulo: 'No asignado',
          ingredientes: '',
          tiempo: '',
          procedimiento: '',
        },
      };
    });


    setMenu(menuFormateado);
    setFechaInicio(new Date(planFinalizado.semana.fecha_inicio));
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

    let y = 30;

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
        <Container maxWidth="md" sx={{ pt: 8 }}>
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
          <Container maxWidth="md">
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

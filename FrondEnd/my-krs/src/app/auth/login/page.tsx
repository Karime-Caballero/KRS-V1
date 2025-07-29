'use client';

import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Container,
  Paper,
  Alert,
} from '@mui/material';

const LoginPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [submitStatus, setSubmitStatus] = useState<'success' | 'error' | null>(
    null
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));

    setErrors((prev) => ({
      ...prev,
      [e.target.name]: '',
    }));
    setSubmitStatus(null);
  };

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.email.trim()) newErrors.email = 'El correo es obligatorio';
    else if (
      !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(formData.email.trim())
    )
      newErrors.email = 'El correo no es válido';

    if (!formData.password) newErrors.password = 'La contraseña es obligatoria';

    return newErrors;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setSubmitStatus('error');
      return;
    }

    // Aquí iría la lógica real de inicio de sesión (API, etc)
    setSubmitStatus('success');
    alert('Inicio de sesión exitoso!');
    // Opcional: limpiar formulario
    setFormData({
      email: '',
      password: '',
    });
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background:
          'linear-gradient(135deg, #f6d365 0%, #fda085 100%)', // Fondo cálido y amigable
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 2,
      }}
    >
      <Container maxWidth="xs">
        <Paper
          elevation={8}
          sx={{
            p: 5,
            borderRadius: 3,
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            backgroundColor: '#fff',
          }}
        >
          <Typography
            variant="h4"
            align="center"
            gutterBottom
            sx={{ fontWeight: 'bold', color: '#333' }}
          >
            Iniciar sesión
          </Typography>

          <Typography
            variant="body1"
            align="center"
            gutterBottom
            sx={{ color: '#666', mb: 4 }}
          >
            Ingresa tus datos para acceder a tu cuenta
          </Typography>

          {submitStatus === 'error' && (
            <Alert severity="error" sx={{ mb: 2 }}>
              Por favor corrige los errores para continuar.
            </Alert>
          )}

          {submitStatus === 'success' && (
            <Alert severity="success" sx={{ mb: 2 }}>
              ¡Inicio de sesión exitoso!
            </Alert>
          )}

          <Box component="form" noValidate onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Correo electrónico"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              margin="normal"
              required
              autoComplete="email"
              error={Boolean(errors.email)}
              helperText={errors.email}
              placeholder="ejemplo@correo.com"
            />

            <TextField
              fullWidth
              label="Contraseña"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              margin="normal"
              required
              autoComplete="current-password"
              error={Boolean(errors.password)}
              helperText={errors.password}
              placeholder="Tu contraseña"
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{
                mt: 4,
                bgcolor: '#ef6c00',
                color: '#fff',
                fontWeight: 'bold',
                fontSize: '1.1rem',
                paddingY: 1.5,
                borderRadius: 2,
                '&:hover': {
                  bgcolor: '#d95f00',
                },
              }}
              aria-label="Iniciar sesión"
            >
              Entrar
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default LoginPage;

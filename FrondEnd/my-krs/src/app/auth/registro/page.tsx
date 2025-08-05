'use client';

import React, { useState} from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Container,
  Paper,
  Alert,
} from '@mui/material';
import { IconButton, InputAdornment } from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { useRouter } from 'next/navigation';
import Link from 'next/link'; // Importar para link (si usas next/link)


const RegistroPage = () => {
  // Estado para inputs
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    contrasena: '',
    contrasenaConfirm: '',
  });

  // Estado para errores
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const router = useRouter();


  // Estado para mostrar mensaje éxito o error general
  const [submitStatus, setSubmitStatus] = useState<'success' | 'error' | null>(
    null
  );
const [showPassword, setShowPassword] = useState(false);

const handleTogglePassword = () => {
  setShowPassword((prev) => !prev);
};
  // Manejar cambios en inputs
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));

    // Limpiar error al modificar
    setErrors((prev) => ({
      ...prev,
      [e.target.name]: '',
    }));
    setSubmitStatus(null);
  };

  // Validación simple
  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.nombre.trim()) newErrors.nombre = 'El nombre es obligatorio';
    if (!formData.email.trim()) newErrors.email = 'El correo es obligatorio';
    else if (
      !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(formData.email.trim())
    )
      newErrors.email = 'El correo no es válido';

    if (!formData.contrasena) newErrors.contrasena = 'La contraseña es obligatoria';
    else if (formData.contrasena.length < 6)
      newErrors.contrasena = 'Debe tener al menos 6 caracteres';

    if (!formData.contrasenaConfirm)
      newErrors.contrasenaConfirm = 'Confirma tu contraseña';
    else if (formData.contrasenaConfirm !== formData.contrasena)
      newErrors.contrasenaConfirm = 'Las contraseñas no coinciden';

    return newErrors;
  };

  // Manejar envío
  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  const validationErrors = validate();
  if (Object.keys(validationErrors).length > 0) {
    setErrors(validationErrors);
    setSubmitStatus('error');
    return;
  }

  try {
    const response = await fetch('http://localhost:4000/auth/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        nombre: formData.nombre,
        email: formData.email,
        contrasena: formData.contrasena,
      }),
    });

    if (!response.ok) {
      throw new Error('Error al registrar el usuario');
    }

    setSubmitStatus('success');
    // Limpiar formulario
    setFormData({
      nombre: '',
      email: '',
      contrasena: '',
      contrasenaConfirm: '',
    });
    router.push('/auth/login');

  } catch (error) {
    console.error(error);
    setSubmitStatus('error');
  }
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
            Crear cuenta
          </Typography>

          <Typography
            variant="body1"
            align="center"
            gutterBottom
            sx={{ color: '#666', mb: 4 }}
          >
            Regístrate para comenzar tu experiencia personalizada
          </Typography>

          {submitStatus === 'error' && (
            <Alert severity="error" sx={{ mb: 2 }}>
              Por favor corrige los errores para continuar.
            </Alert>
          )}

          {submitStatus === 'success' && (
            <Alert severity="success" sx={{ mb: 2 }}>
              ¡Registro exitoso!
            </Alert>
          )}

          <Box component="form" noValidate onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Nombre completo"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              margin="normal"
              required
              autoComplete="name"
              error={Boolean(errors.nombre)}
              helperText={errors.nombre}
              placeholder="Ej. Juan Pérez"
            />

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
  name="contrasena"
  type={showPassword ? "text" : "password"}
  value={formData.contrasena}
  onChange={handleChange}
  margin="normal"
  required
  autoComplete="new-password"
  error={Boolean(errors.contrasena)}
  helperText={errors.contrasena}
  placeholder="Mínimo 6 caracteres"
  InputProps={{
    endAdornment: (
      <InputAdornment position="end">
        <IconButton onClick={handleTogglePassword} edge="end">
          {showPassword ? <VisibilityOff /> : <Visibility />}
        </IconButton>
      </InputAdornment>
    ),
  }}
/>

<TextField
  fullWidth
  label="Confirmar contraseña"
  name="contrasenaConfirm"
  type={showPassword ? "text" : "password"}
  value={formData.contrasenaConfirm}
  onChange={handleChange}
  margin="normal"
  required
  autoComplete="new-password"
  error={Boolean(errors.contrasenaConfirm)}
  helperText={errors.contrasenaConfirm}
  placeholder="Repite tu contraseña"
  InputProps={{
    endAdornment: (
      <InputAdornment position="end">
        <IconButton onClick={handleTogglePassword} edge="end">
          {showPassword ? <VisibilityOff /> : <Visibility />}
        </IconButton>
      </InputAdornment>
    ),
  }}
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
              aria-label="Registrarse"
            >
              Registrarse
            </Button>
            <Typography
  variant="body2"
  align="center"
  sx={{ mt: 2, cursor: 'pointer', color: '#ef6c00' }}
>
  ¿Ya tienes una cuenta?{' '}
  <Link href="/auth/login" passHref>
    <Box
      component="a"
      sx={{
        fontWeight: 'bold',
        textDecoration: 'underline',
        color: 'inherit',
      }}
    >
      Inicia sesión aquí
    </Box>
  </Link>
</Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default RegistroPage;

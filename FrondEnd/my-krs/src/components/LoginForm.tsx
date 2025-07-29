

import { Button, TextField, Box, Typography } from '@mui/material';

export default function LoginForm() {
  return (
    <Box sx={{ width: 300, mx: 'auto', mt: 10 }}>
      <Typography variant="h5" gutterBottom>Iniciar Sesión</Typography>
      <TextField label="Correo electrónico" fullWidth margin="normal" />
      <TextField label="Contraseña" type="password" fullWidth margin="normal" />
      <Button variant="contained" color="primary" fullWidth>Entrar</Button>
    </Box>
  );
}

'use client';
import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Typography,
  Container,
  Paper,
  Button,
  Chip,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Grid,
  Snackbar,
  Alert,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { amber, orange, yellow } from '@mui/material/colors';
import { SelectChangeEvent } from '@mui/material/Select';

const alergiasBase = ['Gluten', 'Lácteos', 'Frutos secos', 'Mariscos', 'Soja', 'Otra'];
const unidades = ['gramos', 'ml', 'piezas', 'cucharadas', 'tazas'];
const categorias = ['Cereal', 'Lácteos', 'Frutas', 'Verduras', 'Carnes', 'Otros'];
const almacenamientos = ['Refrigerado', 'Congelado', 'Despensa', 'Otro'];

const opcionesDietas = [
  'Vegetariana',
  'Vegana',
  'Cetogénica',
  'Sin gluten',
  'Sin lactosa',
  'Omnívora',
  'Otra',
];

interface Ingrediente {
  nombre: string;
  cantidad: number;
  unidad: string;
  categoria: string;
  almacenamiento: string;
}

const PerfilAlimenticio = () => {
  const [alergias, setAlergias] = useState<string[]>([]);
  const [mostrarOtraAlergia, setMostrarOtraAlergia] = useState(false);
  const [otraAlergia, setOtraAlergia] = useState('');
  const [objetivo, setObjetivo] = useState('');

  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([]);
  const [nombre, setNombre] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [unidad, setUnidad] = useState('');
  const [categoria, setCategoria] = useState('');
  const [almacenamiento, setAlmacenamiento] = useState('');
  const [errors, setErrors] = useState({ nombre: false, cantidad: false });

  // Nuevos campos agregados
  const [dietas, setDietas] = useState<string[]>([]);
  const [ingredientesEvitar, setIngredientesEvitar] = useState('');
  const [tiempoMaximoPreparacion, setTiempoMaximoPreparacion] = useState('');

  const [editMode, setEditMode] = useState(false);

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    const saved = localStorage.getItem('perfilAlimenticio');
    if (saved) {
      const datos = JSON.parse(saved);
      setAlergias(datos.alergias || []);
      setObjetivo(datos.objetivoNutricional || '');
      setIngredientes(datos.ingredientesCasa || []);
      setDietas(datos.dietas || []);
      setIngredientesEvitar(datos.ingredientesEvitar || '');
      setTiempoMaximoPreparacion(datos.tiempoMaximoPreparacion || '');
    }
  }, []);

  const handleAlergiasChange = (event: SelectChangeEvent<string[]>) => {
    const selected = event.target.value as string[];

    if (selected.includes('Otra') && !alergias.includes('Otra')) {
      setMostrarOtraAlergia(true);
    }

    if (!selected.includes('Otra')) {
      setMostrarOtraAlergia(false);
      setOtraAlergia('');
    }

    setAlergias(selected.filter((a) => a !== 'Otra'));
  };

  const agregarOtraAlergia = () => {
    const nueva = otraAlergia.trim();
    if (nueva && !alergias.includes(nueva) && !alergiasBase.includes(nueva)) {
      setAlergias([...alergias, nueva]);
      setOtraAlergia('');
      setMostrarOtraAlergia(false);
    }
  };

  const agregarIngrediente = () => {
    const errores = {
      nombre: !nombre.trim(),
      cantidad: isNaN(Number(cantidad)) || Number(cantidad) <= 0,
    };
    setErrors(errores);

    if (Object.values(errores).some(Boolean)) {
      setSnackbar({
        open: true,
        message: 'Corrige los errores antes de continuar.',
        severity: 'warning',
      });
      return;
    }

    setIngredientes([
      ...ingredientes,
      {
        nombre: nombre.trim(),
        cantidad: Number(cantidad),
        unidad,
        categoria,
        almacenamiento,
      },
    ]);

    setNombre('');
    setCantidad('');
    setUnidad('');
    setCategoria('');
    setAlmacenamiento('');
  };

  const eliminarIngrediente = (index: number) => {
    const copia = [...ingredientes];
    copia.splice(index, 1);
    setIngredientes(copia);
  };

  const actualizarIngrediente = (
    index: number,
    campo: keyof Ingrediente,
    valor: string | number
  ) => {
    const copia = [...ingredientes];

    if (campo === 'cantidad') {
      const num = Number(valor);
      if (isNaN(num) || num <= 0) {
        setSnackbar({
          open: true,
          message: 'Cantidad inválida. Debe ser un número positivo.',
          severity: 'warning',
        });
        return;
      }
      copia[index][campo] = num;
    } else if (
      campo === 'nombre' ||
      campo === 'unidad' ||
      campo === 'categoria' ||
      campo === 'almacenamiento'
    ) {
      copia[index][campo] = valor as string;
    }

    setIngredientes(copia);
  };

  const descargarPerfil = () => {
    const datos = {
      alergias,
      objetivoNutricional: objetivo,
      ingredientesCasa: ingredientes,
      dietas,
      ingredientesEvitar,
      tiempoMaximoPreparacion,
    };
    const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'perfil_alimenticio.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSubmit = async () => {
    const datosPerfil = {
      alergias,
      objetivoNutricional: objetivo,
      ingredientesCasa: ingredientes,
      dietas,
      ingredientesEvitar,
      tiempoMaximoPreparacion,
    };

    try {
      localStorage.setItem('perfilAlimenticio', JSON.stringify(datosPerfil));

      // Si tienes backend, aquí puedes agregar fetch para enviar datos

      setSnackbar({
        open: true,
        message: `Perfil guardado correctamente.`,
        severity: 'success',
      });
      setEditMode(false);
    } catch (error) {
      console.error(error);
      setSnackbar({ open: true, message: 'Error al guardar el perfil.', severity: 'error' });
    }
  };

  const handleCloseSnackbar = () => setSnackbar({ ...snackbar, open: false });

  return (
    <Container maxWidth={false} sx={{ width: '100vw', height: '100vh', p: 1, m: 0.5 }}>
      <Paper
        elevation={6}
        sx={{
          p: 4,
          borderRadius: 4,
          bgcolor: amber[50],
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        }}
      >
        <Typography variant="h4" fontWeight="bold" gutterBottom sx={{ color: orange[700] }}>
          Perfil Alimenticio
        </Typography>

        <Divider sx={{ my: 3 }} />

        <FormControl fullWidth margin="normal">
  <InputLabel>Alergias</InputLabel>
  <Select
    multiple
    value={[...alergias, ...(mostrarOtraAlergia ? ['Otra'] : [])]}
    onChange={handleAlergiasChange}
    renderValue={(selected) => (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        {(selected as string[]).map((value) => (
          <Chip key={value} label={value} color="warning" />
        ))}
      </Box>
    )}
    disabled={!editMode} // cambiar aquí para que habilite solo en modo edición
  >
    {alergiasBase.map((alergia) => (
      <MenuItem key={alergia} value={alergia}>
        {alergia}
      </MenuItem>
    ))}
  </Select>
</FormControl>

{mostrarOtraAlergia && editMode && (  // mostrar solo si está en modo edición
  <Grid container spacing={2} alignItems="center" sx={{ mt: 1 }}>
    <Grid item xs={9}>
      <TextField
        fullWidth
        label="Especificar otra alergia"
        value={otraAlergia}
        onChange={(e) => setOtraAlergia(e.target.value)}
        disabled={!editMode} // habilitar solo en modo edición
      />
    </Grid>
    <Grid item xs={3}>
      <Button
        variant="contained"
        fullWidth
        onClick={agregarOtraAlergia}
        sx={{ bgcolor: orange[500], '&:hover': { bgcolor: orange[600] } }}
        disabled={!editMode} // habilitar solo en modo edición
      >
        Agregar
      </Button>
    </Grid>
  </Grid>
)}

        {/* NUEVOS CAMPOS */}
        <FormControl fullWidth margin="normal">
          <InputLabel>Tipo de dieta</InputLabel>
          <Select
            multiple
            value={dietas}
            onChange={(e) => setDietas(e.target.value as string[])}
            disabled={!editMode}
            renderValue={(selected) => (selected as string[]).join(', ')}
          >
            {opcionesDietas.map((d) => (
              <MenuItem key={d} value={d}>
                {d}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          label="Ingredientes que deseas evitar"
          fullWidth
          margin="normal"
          value={ingredientesEvitar}
          onChange={(e) => setIngredientesEvitar(e.target.value)}
          disabled={!editMode}
        />

        <TextField
          label="Tiempo máximo de preparación (minutos)"
          type="number"
          fullWidth
          margin="normal"
          value={tiempoMaximoPreparacion}
          onChange={(e) => setTiempoMaximoPreparacion(e.target.value)}
          disabled={!editMode}
        />

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" gutterBottom fontWeight="medium" sx={{ color: orange[800] }}>
          Ingredientes en casa
        </Typography>

        {!editMode && (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={3}>
              <TextField
                label="Nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                error={errors.nombre}
                helperText={errors.nombre ? 'Nombre requerido' : ''}
                fullWidth
                disabled={editMode}
              />
            </Grid>

            <Grid item xs={2} sm={2} sx={{ width: 200 }}>
              <TextField
                label="Cantidad"
                type="number"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                error={errors.cantidad}
                helperText={errors.cantidad ? 'Cantidad inválida' : ''}
                fullWidth
                disabled={editMode}
              />
            </Grid>
            <Grid item xs={2} sm={2} sx={{ width: 200 }}>
              <FormControl fullWidth disabled={editMode}>
                <InputLabel>Unidad</InputLabel>
                <Select value={unidad} onChange={(e) => setUnidad(e.target.value)}>
                  {unidades.map((u) => (
                    <MenuItem key={u} value={u}>
                      {u}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={2} sm={2} sx={{ width: 200 }}>
              <FormControl fullWidth disabled={editMode}>
                <InputLabel>Categoría</InputLabel>
                <Select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                  {categorias.map((c) => (
                    <MenuItem key={c} value={c}>
                      {c}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={2} sm={2} sx={{ width: 200 }}>
              <FormControl fullWidth disabled={editMode}>
                <InputLabel>Almacenamiento</InputLabel>
                <Select value={almacenamiento} onChange={(e) => setAlmacenamiento(e.target.value)}>
                  {almacenamientos.map((a) => (
                    <MenuItem key={a} value={a}>
                      {a}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<AddIcon />}
                onClick={agregarIngrediente}
                sx={{ bgcolor: orange[600], '&:hover': { bgcolor: orange[700] } }}
              >
                Agregar Ingrediente
              </Button>
            </Grid>
          </Grid>
        )}

        {ingredientes.length > 0 && (
          <Table sx={{ mt: 3, borderRadius: 2, overflow: 'hidden' }}>
            <TableHead sx={{ bgcolor: orange[100] }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', color: orange[800] }}>Nombre</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: orange[800] }}>Cantidad</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: orange[800] }}>Unidad</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: orange[800] }}>Categoría</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: orange[800] }}>Almacenamiento</TableCell>
                {editMode && <TableCell sx={{ fontWeight: 'bold', color: orange[800] }}>Acciones</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {ingredientes.map((ing, idx) => (
                <TableRow key={idx}>
                  <TableCell>
                    {editMode ? (
                      <TextField
                        variant="standard"
                        value={ing.nombre}
                        onChange={(e) => actualizarIngrediente(idx, 'nombre', e.target.value)}
                        fullWidth
                        sx={{ input: { color: orange[900], fontWeight: 'medium' } }}
                      />
                    ) : (
                      ing.nombre
                    )}
                  </TableCell>
                  <TableCell>
                    {editMode ? (
                      <TextField
                        variant="standard"
                        type="number"
                        value={ing.cantidad}
                        onChange={(e) => actualizarIngrediente(idx, 'cantidad', e.target.value)}
                        fullWidth
                        sx={{ input: { color: orange[900], fontWeight: 'medium' } }}
                      />
                    ) : (
                      ing.cantidad
                    )}
                  </TableCell>
                  <TableCell>
                    {editMode ? (
                      <Select
                        variant="standard"
                        value={ing.unidad}
                        onChange={(e) => actualizarIngrediente(idx, 'unidad', e.target.value)}
                        fullWidth
                        sx={{ color: orange[900], fontWeight: 'medium' }}
                      >
                        {unidades.map((u) => (
                          <MenuItem key={u} value={u}>
                            {u}
                          </MenuItem>
                        ))}
                      </Select>
                    ) : (
                      ing.unidad
                    )}
                  </TableCell>
                  <TableCell>
                    {editMode ? (
                      <Select
                        variant="standard"
                        value={ing.categoria}
                        onChange={(e) => actualizarIngrediente(idx, 'categoria', e.target.value)}
                        fullWidth
                        sx={{ color: orange[900], fontWeight: 'medium' }}
                      >
                        {categorias.map((c) => (
                          <MenuItem key={c} value={c}>
                            {c}
                          </MenuItem>
                        ))}
                      </Select>
                    ) : (
                      ing.categoria
                    )}
                  </TableCell>
                  <TableCell>
                    {editMode ? (
                      <Select
                        variant="standard"
                        value={ing.almacenamiento}
                        onChange={(e) => actualizarIngrediente(idx, 'almacenamiento', e.target.value)}
                        fullWidth
                        sx={{ color: orange[900], fontWeight: 'medium' }}
                      >
                        {almacenamientos.map((a) => (
                          <MenuItem key={a} value={a}>
                            {a}
                          </MenuItem>
                        ))}
                      </Select>
                    ) : (
                      ing.almacenamiento
                    )}
                  </TableCell>
                  {editMode && (
                    <TableCell>
                      <IconButton color="error" onClick={() => eliminarIngrediente(idx)}>
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          {editMode ? (
            <Button
              variant="contained"
              onClick={handleSubmit}
              sx={{
                bgcolor: yellow[800],
                color: '#fff',
                '&:hover': {
                  bgcolor: yellow[900],
                },
              }}
            >
              Guardar
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={() => setEditMode(true)}
              sx={{
                bgcolor: orange[600],
                color: '#fff',
                '&:hover': {
                  bgcolor: orange[700],
                },
              }}
            >
              Editar
            </Button>
          )}

          <Button
            variant="outlined"
            onClick={descargarPerfil}
            sx={{
              borderColor: orange[600],
              color: orange[600],
              '&:hover': {
                borderColor: orange[700],
                color: orange[700],
              },
            }}
          >
            Descargar Perfil
          </Button>
        </Box>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Paper>
    </Container>
  );
};

export default PerfilAlimenticio;



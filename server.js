const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Usuarios hardcodeados
const USERS = {
  'jorge': { password: 'verano2026', role: 'student' },
  'test':  { password: 'test123',    role: 'student' },
  'test2':  { password: 'test123',    role: 'student' },
  'test3':  { password: 'test123',    role: 'student' },
  'profe': { password: 'profe123',   role: 'teacher' },
  'familia_jorge': { password: 'veranojorge2026', role: 'parent', student: 'jorge' },
};

// Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = USERS[username?.toLowerCase()];
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
  }
  res.json({ username: username.toLowerCase(), role: user.role });
});

// Guardar sesión
app.post('/api/sessions', async (req, res) => {
  const { username, date, score, completed, time } = req.body;
  const { error } = await supabase.from('sessions').upsert(
    { username, date, score, completed, time },
    { onConflict: 'username,date' }
  );
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// Obtener sesiones de un usuario
app.get('/api/sessions/:username', async (req, res) => {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('username', req.params.username);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Obtener todas las sesiones (para el profe)
app.get('/api/sessions', async (req, res) => {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .order('date', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));

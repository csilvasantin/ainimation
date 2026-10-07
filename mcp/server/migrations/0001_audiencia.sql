-- Audiencia del tótem/quiosco (Carlos, 8-oct-2026): contenidos segmentados por sexo, edad y número de personas.
-- D1 «kiosko-audiencia», compartida por mcp-ainimation (binding AUDIENCIA_DB) y admira.tv (Pages, binding AUDIENCIA_DB).
-- PRIVACIDAD: solo estimaciones agregadas. Nunca imágenes, fotogramas, vectores de cara ni plantillas biométricas.
-- Retención: 90 días (se purga al escribir).
CREATE TABLE IF NOT EXISTS aud_visitas (
  id TEXT PRIMARY KEY,
  tienda TEXT NOT NULL,
  dispositivo TEXT NOT NULL,
  origen TEXT NOT NULL,
  canal TEXT,
  inicio INTEGER NOT NULL,
  fin INTEGER NOT NULL,
  dwell_ms INTEGER NOT NULL,
  personas INTEGER NOT NULL,
  hombres INTEGER NOT NULL DEFAULT 0,
  mujeres INTEGER NOT NULL DEFAULT 0,
  nino INTEGER NOT NULL DEFAULT 0,
  joven INTEGER NOT NULL DEFAULT 0,
  adulto INTEGER NOT NULL DEFAULT 0,
  senior INTEGER NOT NULL DEFAULT 0,
  grupo TEXT,
  genero_seg TEXT,
  edad_seg TEXT,
  franja TEXT,
  caras TEXT,
  regla TEXT,
  variante TEXT,
  pedido TEXT,
  pedido_num TEXT,
  demo_run TEXT,
  creado INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS aud_visitas_tienda_inicio ON aud_visitas (tienda, inicio);
CREATE INDEX IF NOT EXISTS aud_visitas_creado ON aud_visitas (creado);
CREATE TABLE IF NOT EXISTS aud_estado (
  tienda TEXT NOT NULL,
  dispositivo TEXT NOT NULL,
  origen TEXT NOT NULL,
  ts INTEGER NOT NULL,
  camara TEXT,
  personas INTEGER NOT NULL DEFAULT 0,
  grupo TEXT,
  genero_seg TEXT,
  edad_seg TEXT,
  regla TEXT,
  variante TEXT,
  visita TEXT,
  PRIMARY KEY (tienda, dispositivo)
);
CREATE TABLE IF NOT EXISTS aud_reglas (
  tienda TEXT PRIMARY KEY,
  doc TEXT NOT NULL,
  actualizado INTEGER NOT NULL,
  por TEXT
);

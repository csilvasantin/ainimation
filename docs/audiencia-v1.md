# Audiencia v1 · quiosco segmentado por cámara (8-oct-2026)

Recupera la función de los primeros admira.tv (contenidos condicionados por **sexo, edad y número**
de personas delante de la cámara) para el tótem del quiosco Starbucks y el gemelo de XpaceOS.

## Cómo se activa

| Dónde | Cómo |
|---|---|
| Quiosco | `https://www.ainimation.studio/xperiencias/kiosko-pedido/?store=…&seg=1` |
| Gemelo (tótem) | `/totem segmentado on` (y `off`); se guarda en `xpace:totem-seg` |
| Simulación QA | `?simaud=joven_f;adulto_m+joven_f;0` (8 s por paso) → siempre `starbucks-qa`, origen `qa` |

Mientras el tótem es virtual usa la **webcam del equipo que lo emula** (`getUserMedia`, frontal).
Sin cámara o sin permiso el quiosco sigue con la carta general y lo indica en la píldora
(«Sin permiso de cámara» / «Sin cámara»).

## Qué se detecta (en el navegador)

`@vladmandic/face-api` 1.7.13 (MIT) servido desde `/assets/face-api/`: solo **TinyFaceDetector**
y **AgeGender**. No se carga el modelo de reconocimiento facial: técnicamente no puede
generar huellas (embeddings) ni identificar a nadie.

- Personas: número de caras (≥ 0,5 de confianza).
- Género por cara: `m` / `f` + confianza. Segmento: `m`, `f` o `mixto`.
- Edad por cara → banda: `nino` (<13), `joven` (<30), `adulto` (<60), `senior` (60+).
- Tamaño: `individuo` (1) o `grupo` (2+).
- Franja (hora de Madrid): `manana` 6–12, `mediodia` 12–16, `tarde` 16–20, `noche`.

Histéresis: 3 lecturas iguales; ≥ 8 s entre cambios de segmento; vuelve a la carta general tras
6 s sin nadie; **nunca cambia la carta mientras un cliente está pidiendo** (fuera de la pantalla
de bienvenida). Varias copias del quiosco en el mismo navegador eligen un líder (Web Locks) y
comparten lecturas por `BroadcastChannel("kiosko-audiencia")`: una sola cámara y un solo envío.

## Qué se guarda (D1 `kiosko-audiencia`)

Por **visita** (presencia continua): tienda, dispositivo, inicio/fin, permanencia, personas,
hombres/mujeres, bandas de edad, individuo/grupo, segmento, franja, por cara `{g, gc, e, dc}`
(género, confianza, banda, confianza), regla y variante mostradas y el **pedido** enlazado
(si se pide en la visita o hasta 120 s después). Además, el **estado vivo** por dispositivo.

**Nunca** se guardan ni envían imágenes, fotogramas, recortes, huellas faciales, edad exacta
ni identificadores personales. Lista blanca estricta de campos en el servidor. Retención
**90 días** (purga automática). La píldora «📷 Cámara en uso» es visible siempre que la
cámara está encendida; al tocarla explica el tratamiento.

Datos de prueba: origen `qa`/`demo` solo en tiendas `*-qa` (`starbucks-qa`); nunca en
`starbucks-paseo-de-gracia`.

## API (mcp-ainimation.admira.store)

| Ruta | Qué |
|---|---|
| `GET /audiencia/reglas?tienda=` | reglas + variantes (o la semilla Starbucks) |
| `POST /audiencia/evento` | `{tipo: visita|pedido|estado, …}` desde el quiosco (≤ 8 KB) |
| `GET /audiencia/estado?tienda=` | quién hay delante de cada tótem ahora |
| `GET /audiencia/resumen?tienda=&desde=&hasta=` | KPIs y desgloses; tiendas no QA con clave de flota |
| `POST /audiencia/simular` | `{tienda: "starbucks-qa", n}` visitas demo |

MCP: `audiencia_estado`, `audiencia_reglas`, `audiencia_resumen`, `audiencia_simular`.

## Backoffice

**admira.tv/audiencia/** (tras el login de AdmiraNeXT, permiso de Contenidos condicionados):
panel por tienda y fechas (personas, género, edad, grupos, por hora de Madrid, variantes y
reglas), CSV, ES/EN, y editor de **reglas** → **variantes** de carta con prioridad y carta por
defecto. Semilla Starbucks: grupo, joven, senior, mujer, hombre, adulto.

## Reglas

```json
{ "id": "r-joven", "prioridad": 70, "activa": true,
  "si": { "edad": ["joven"], "grupo": ["individuo"], "genero": [], "franja": [] },
  "variante": "joven" }
```

Gana la regla activa de mayor prioridad cuyas condiciones casan (lista vacía = cualquiera);
si ninguna, `por_defecto`. Una variante tiene `titulo`/`subtitulo`/`oferta` ES/EN y
`destacados` (ids de la carta) que el quiosco muestra en la pestaña «⭐ Para ti».

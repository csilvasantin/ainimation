# face-api (vendorizado) · segmentación de audiencia del quiosco

`@vladmandic/face-api` **1.7.13** (licencia MIT, ver `LICENSE`), servido desde ainimation.studio en vez de un CDN.

Solo dos modelos, a propósito:

- `tiny_face_detector` — dónde hay caras (cuántas personas).
- `age_gender_model` — edad aproximada y género estimado de cada cara.

**No** se incluye `face_recognition_model` (descriptores / vectores de cara): el quiosco no puede reconocer ni
identificar a nadie, ni aunque quisiera. Todo corre en el navegador; el fotograma se descarta y al servidor solo
llegan estimaciones agregadas (ver `/xperiencias/kiosko-pedido/segmento.js` y `docs/audiencia-v1.md`).

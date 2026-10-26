# Verificaciones de copia y revisión del historial / History copy and review verification

## Español

Índice de siete informes históricos, en orden de verificación. Las cuatro primeras entradas publicaron relaciones descriptivas; las tres siguientes auditaron el producto sin cambiarlo. Cada informe describe su momento: las publicaciones posteriores amplían las relaciones sin reescribir las evidencias anteriores. Todas las fechas indicadas son UTC.

### Relaciones publicadas

En cada una de estas cuatro publicaciones pasaron 231 regresiones interactivas y la prueba de ayuda MCP correspondiente. Las nuevas pruebas de interfaz usaron archivos y datos ficticios, sin confirmar restauraciones. En producción se inspeccionaron los controles de recuperación y su foco permitido, sin abrir copias reales ni descargar otra copia completa; se comprobaron manualmente la comparación 8/9, el resumen de 709 caracteres y los TXT/CSV especificados en cada informe.

1. **Abrir copia del historial: aviso propio.** `2026-10-25T01:35:00.489356+00:00`. El botón describe su aviso de lectura y revisión con ID genérico propio y protección ante colisiones; el input conserva sus atributos. Archivos ficticios válidos e inválidos, cancelación y ocho lecturas tardías verificados. La selección vacía y la cancelación de una lectura pendiente se simularon sólo en la fixture.
   Informes: [AINimation][open-ain] · [Admira Store][open-store].

2. **Restaurar: resumen revisado propio.** `2026-10-25T01:59:56.350065+00:00`. El botón describe su resumen, separado del aviso de Abrir copia. Planes nuevos, mixtos e idénticos conservan nombres, recuentos y estados; Tab/Mayús+Tab verifica foco sin activar Restaurar. El texto inicialmente vacío del botón oculto se conserva.
   Informes: [AINimation][confirm-ain] · [Admira Store][confirm-store].

3. **Cancelar revisión: mismo resumen propio.** `2026-10-25T02:23:19.031194+00:00`. Cancelar comparte el resumen con Restaurar y conserva la limpieza manual y el retorno de foco a Abrir copia. Dos historiales, colisión, validaciones y ocho lecturas tardías ficticias comprobados, sin escrituras adicionales a las semillas.
   Informes: [AINimation][cancel-ain] · [Admira Store][cancel-store].

4. **Revisar copia: contexto de la sección.** `2026-10-25T02:53:44.558764+00:00`. La sección describe ese mismo resumen y conserva su nombre nativo, ocultación y contenido. No se añadieron roles, foco ni paradas de teclado. Las pruebas ficticias preservan planes, cancelación, referencias propias y descarte de ocho lecturas antiguas.
   Informes: [AINimation][review-ain] · [Admira Store][review-store].

### Auditorías sin cambios de producto

Estas tres auditorías reutilizaron el resultado previo de 231 regresiones porque el módulo publicado siguió byte exacto. No representan tres ejecuciones nuevas de esa suite. Comprobaron ayuda bilingüe/MCP vigente y hashes de los archivos anteriores; no repitieron comparaciones ni descargas reales.

5. **Cierre nativo con Escape.** `2026-10-25T03:23:56.677256+00:00`. Seis revisiones ficticias ES/EN, ocho callbacks antiguos, cuatro intentos nuevos, dos casos con historiales superpuestos y dos de ausencia de operaciones añadidas. En producción sólo se cerró y reabrió el historial con la revisión inicialmente oculta; se observó el foco en su botón de apertura.
   Informes: [AINimation][escape-ain] · [Admira Store][escape-store].

6. **Dos lecturas pendientes independientes.** `2026-10-25T03:59:15.746957+00:00`. Ocho casos de respuesta antigua de B frente al intento vigente de A y ocho de reapertura de B mientras A sigue pendiente o revisado. Colas ficticias por instancia; cerrar B no altera A. Producción: sólo lectura e inspección inicial oculta, sin reproducir concurrencia real.
   Informes: [AINimation][concurrent-ain] · [Admira Store][concurrent-store].

7. **Revisión y copia completa independientes.** `2026-10-25T04:30:19.150131+00:00`. 24 casos locales: matriz de ocho, dos de singular, ocho de callbacks tardíos, cuatro reintentos y dos de operaciones no añadidas. La descarga inyectada sólo registra un payload y resuelve o rechaza una promesa local. Archivo completo exacto con fecha capturada; filtrar no reduce su alcance ni invalida su callback vigente. Producción: sólo inspección, sin descarga de copia completa.
   Informes: [AINimation][backup-ain] · [Admira Store][backup-store].

### Límites comunes

- Un vínculo descriptivo no habilita, valida, copia, descarga ni restaura. Abrir copia conserva su aviso separado; sección, Restaurar y Cancelar comparten el resumen propio tras las cuatro publicaciones.
- No se activó Restaurar en las nuevas pruebas UI, ni se usaron portapapeles o comprobaciones de versiones reales. Los archivos de recuperación y los errores provocados pertenecen sólo a pruebas ficticias aisladas.
- Escape del diálogo no acredita Escape ni cancelación vacía del selector nativo de archivos. `resetRestore` oculta y deshabilita Restaurar, conservando su texto anterior oculto; limpia plan, resumen, lista, aviso y valor de archivo.
- Las auditorías conservaron los datos reales iniciales y las referencias anteriores. No acreditan reproducción física, estado de escenas 3D, disponibilidad de versiones ni comportamiento de un lector de pantalla concreto. Los controles ocultos no se declaran navegables.
- Los informes tienen esquemas distintos. Un campo ausente no equivale a cero ni a una comprobación realizada. Los 15 fallos MCP conocidos de otras ayudas siguen fuera de este alcance.

## English

Index of seven historical reports in verification order. The first four entries published descriptive relationships; the following three audited the unchanged product. Each report describes its own point in time: later publications extend relationships without rewriting earlier evidence. All dates below are UTC.

### Published relationships

Each of these four publications passed 231 interactive regressions and its corresponding MCP help test. New UI tests used fictitious files and data without confirming restores. Production checks inspected recovery controls and permitted focus without opening real copies or downloading another complete copy; the 8/9 comparison, 709-character summary and specified TXT/CSV files were checked manually as recorded in each report.

1. **Open history copy: its own status.** `2026-10-25T01:35:00.489356+00:00`. The button describes its own reading and review status through a generic ID with collision protection; the input retains its attributes. Valid and invalid fictitious files, cancellation and eight late reads were checked. Empty selection and cancellation of a pending read were simulated only in the fixture.
   Reports: [AINimation][open-ain] · [Admira Store][open-store].

2. **Restore: its own reviewed summary.** `2026-10-25T01:59:56.350065+00:00`. The button describes its summary, separate from Open copy status. New, mixed and identical plans retain names, counts and states; Tab/Shift+Tab checks focus without activating Restore. The initially empty text of the hidden button is preserved.
   Reports: [AINimation][confirm-ain] · [Admira Store][confirm-store].

3. **Cancel review: the same own summary.** `2026-10-25T02:23:19.031194+00:00`. Cancel shares the summary with Restore and retains manual cleanup and focus return to Open copy. Two histories, a collision, validation and eight late fictitious reads were checked without writes beyond initial seeds.
   Reports: [AINimation][cancel-ain] · [Admira Store][cancel-store].

4. **Review history copy: section context.** `2026-10-25T02:53:44.558764+00:00`. The section describes that same summary, retaining its native name, hiding and content. No roles, focus or keyboard stops were added. Fictitious tests preserve plans, cancellation, own references and rejection of eight old reads.
   Reports: [AINimation][review-ain] · [Admira Store][review-store].

### Audits without product changes

These three audits reused the previous 231-regression result because the published module remained byte exact. They do not represent three new runs of that suite. They verified the current bilingual help/MCP contract and previous file hashes without repeating real comparisons or downloads.

5. **Native Escape close.** `2026-10-25T03:23:56.677256+00:00`. Six fictitious ES/EN reviews, eight old callbacks, four new attempts, two stacked-history cases and two cases checking no added operations. Production only closed and reopened history with review initially hidden; focus was observed on its opening button.
   Reports: [AINimation][escape-ain] · [Admira Store][escape-store].

6. **Two independent pending reads.** `2026-10-25T03:59:15.746957+00:00`. Eight cases of an old B response against A's current attempt and eight reopening B while A remains pending or reviewed. Fictitious queues belong to each instance; closing B does not alter A. Production: read-only access and initially hidden review inspection, without real concurrent reads.
   Reports: [AINimation][concurrent-ain] · [Admira Store][concurrent-store].

7. **Independent review and complete copy.** `2026-10-25T04:30:19.150131+00:00`. 24 local cases: an eight-case matrix, two singular cases, eight late-callback cases, four retries and two checking no added operations. The injected download only records a payload and settles a local promise. Complete file bytes match with the captured date; filtering neither reduces scope nor invalidates its current callback. Production: inspection only, without downloading a complete copy.
   Reports: [AINimation][backup-ain] · [Admira Store][backup-store].

### Shared limits

- A descriptive relationship does not enable, validate, copy, download or restore. Open copy retains its separate status; the section, Restore and Cancel share their own summary after the four publications.
- Restore was not activated in the new UI tests, and no real clipboard or version-check operations were used. Recovery files and deliberately caused errors belong only to isolated fictitious tests.
- Dialog Escape does not establish Escape or empty cancellation of the native file picker. `resetRestore` hides and disables Restore while retaining its previous hidden text; it clears the plan, summary, list, status and file value.
- Audits preserved initial real data and earlier references. They do not establish physical playback, 3D-scene state, version availability or behavior of a specific screen reader. Hidden controls are not claimed to be keyboard navigable.
- Report schemas differ. An absent field does not mean zero or a completed check. The 15 known MCP failures in other help topics remain outside this scope.

[open-ain]: https://www.ainimation.studio/docs/restore-open-status-verification.json
[open-store]: https://www.admira.store/admira-xp/docs/restore-open-status-verification.json
[confirm-ain]: https://www.ainimation.studio/docs/restore-confirm-summary-verification.json
[confirm-store]: https://www.admira.store/admira-xp/docs/restore-confirm-summary-verification.json
[cancel-ain]: https://www.ainimation.studio/docs/restore-cancel-summary-verification.json
[cancel-store]: https://www.admira.store/admira-xp/docs/restore-cancel-summary-verification.json
[review-ain]: https://www.ainimation.studio/docs/restore-review-summary-verification.json
[review-store]: https://www.admira.store/admira-xp/docs/restore-review-summary-verification.json
[escape-ain]: https://www.ainimation.studio/docs/restore-native-escape-verification.json
[escape-store]: https://www.admira.store/admira-xp/docs/restore-native-escape-verification.json
[concurrent-ain]: https://www.ainimation.studio/docs/concurrent-restore-verification.json
[concurrent-store]: https://www.admira.store/admira-xp/docs/concurrent-restore-verification.json
[backup-ain]: https://www.ainimation.studio/docs/restore-backup-verification.json
[backup-store]: https://www.admira.store/admira-xp/docs/restore-backup-verification.json

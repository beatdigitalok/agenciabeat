# Edición editorial en preview

editorial.html permite editar título, categoría, imagen y contenido; estado local borrador/listo para revisión; papelera y restauración. Usa copias locales por sitio en localStorage. NO escribe en Blogger/Supabase ni publica. Centro Multimedia lee estas copias, excluye la papelera y usa la categoría corregida. El diario público no lee esas copias.

Las capturas RSS llegan con categoría predefinida (por ejemplo política). El propietario corrige categoría en borradores de Blogger. El proceso real de ingesta no está en este repositorio; el diagrama del README no demuestra que exista sincronización de cambios.

## Para integrar Supabase (pendiente, no ejecutado)

Auditar schema y RLS con acceso administrativo de lectura; obtener código/configuración del capturador RSS y del puente Blogger/Supabase. Definir clave estable sitio_id + blogger_post_id y política de conflictos: corrección editorial prevalece sobre categoría RSS, preservar contenido original, revisión por updated_at/version, importar sólo publicados al diario. La papelera necesita deleted_at, auditoría y exclusión en todas las lecturas públicas; evitar que el capturador resucite registros borrados. Campos y migración se definirán sobre el schema real.

Operaciones de edición deben ir por backend autenticado con autorización por sitio, validación y registro de auditoría. No agregar PATCH/DELETE con la clave pública del frontend ni exponer service_role. El Worker de imágenes no es backend editorial. Cambios en tablas/políticas/datos de producción requieren autorización; nada de esto fue ejecutado.

## QA

Node syntax checks pasaron. Prueba de almacenamiento: edición conserva original; sólo acepta campos editoriales; papelera oculta; restauración preserva correcciones; descartar vuelve al original. PNG 4:5 y 9:16 recibidos del propietario y verificados: 1080x1350 y 1080x1920 válidos (noticia1409). Recorte vertical necesita ajuste focal como mejora independiente.

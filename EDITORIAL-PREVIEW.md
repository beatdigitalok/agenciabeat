# Edición editorial en preview

editorial.html permite editar título, categoría, imagen y contenido; estado local borrador/listo para revisión; papelera y restauración. Usa copias locales por sitio en localStorage. NO escribe en Blogger/Supabase ni publica. Centro Multimedia lee estas copias, excluye la papelera y usa la categoría corregida. El diario público no lee esas copias.

Las capturas RSS llegan con categoría predefinida (por ejemplo política). El propietario corrige categoría en borradores de Blogger. El proceso real de ingesta no está en este repositorio; el diagrama del README no demuestra que exista sincronización de cambios.

## Para integrar Supabase (pendiente, no ejecutado)

Auditar schema y RLS con acceso administrativo de lectura; obtener código/configuración del capturador RSS y del puente Blogger/Supabase. Definir clave estable sitio_id + blogger_post_id y política de conflictos: corrección editorial prevalece sobre categoría RSS, preservar contenido original, revisión por updated_at/version, importar sólo publicados al diario. La papelera necesita deleted_at, auditoría y exclusión en todas las lecturas públicas; evitar que el capturador resucite registros borrados. Campos y migración se definirán sobre el schema real.

Operaciones de edición deben ir por backend autenticado con autorización por sitio, validación y registro de auditoría. No agregar PATCH/DELETE con la clave pública del frontend ni exponer service_role. El Worker de imágenes no es backend editorial. Cambios en tablas/políticas/datos de producción requieren autorización; nada de esto fue ejecutado.

## QA

Node syntax checks pasaron. Prueba de almacenamiento: edición conserva original; sólo acepta campos editoriales; papelera oculta; restauración preserva correcciones; descartar vuelve al original. PNG 4:5 y 9:16 recibidos del propietario y verificados: 1080x1350 y 1080x1920 válidos (noticia1409). Recorte vertical necesita ajuste focal como mejora independiente.

## Ingesta encontrada en archivo del propietario (2026-10-06)

Archivo: FÁBRICA FEDERAL DE MEDIOS — Control Central(1).html. El propietario indica que lo ejecuta en beatdigital.com.ar/RBD_Autopublicador; no se verificó equivalencia byte a byte con el archivo servido.

postToBlogger crea un post con isDraft según modo seguro/campaña. Tras éxito en Blogger, llama subirNoticiaASupabase SIN esperar la promesa y sin condicionar el envío a DRAFT/LIVE. Inserta título, contenido, imagen_url, categoria y sitio_id. No guarda blogger_post_id, blog_id ni status. La categoría es labelsArray[0]; camp.cat se agrega primero, por lo que categoría base domina incluso si hay etiquetas adicionales del RSS. Cambios posteriores en Blogger no se consultan en este archivo. Un error Supabase queda en log pero postToBlogger devuelve true; historial puede marcar la nota como procesada aunque la copia falle.

Consecuencia: el lector del diario (select sin filtro editorial) puede mostrar filas copiadas desde borradores si esas filas son visibles por RLS. El código no implementa sincronización posterior, edición remota ni papelera. Usa clave publishable para POST; las políticas efectivas de inserción no se han auditado. No se realizó POST/PATCH/DELETE de prueba.

Plan concreto, todavía no ejecutado en producción: mantener borradores en tabla/editorial privada o restringidos por RLS; backend autenticado para ingesta; identidad estable (sitio_id, blogger_blog_id, blogger_post_id); reconciliación por id con upsert y estado publicado/borrador; importar etiquetas corregidas desde Blogger como categoría editorial; preservar edición manual explícita con reglas de precedencia; deleted_at y tombstone evitan reimportación involuntaria. Guardar resultado de ambas etapas y reintentar sólo Supabase si Blogger ya creó el post. Migración y limpieza de filas existentes se prepararán tras inspección del schema real, con aprobación antes de aplicar.

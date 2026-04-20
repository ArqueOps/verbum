-- Realignment — Fase 2.4
-- Drop features que nunca foram pedidas (fonte: verbum-features-completo.md).
-- O usuário listou explicitamente 11 funcionalidades + premissas. Nada disso
-- estava no escopo original.

BEGIN;

-- study_bookmarks: "favoritar estudo" nunca foi pedido pelo admin.
DROP TABLE IF EXISTS public.study_bookmarks CASCADE;

COMMIT;

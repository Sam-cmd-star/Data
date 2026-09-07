export const DATASETS_SETUP_SQL = `CREATE OR REPLACE FUNCTION public.is_bi_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios u
    WHERE u.id = auth.uid()
      AND u.cargo IN ('Administrador', 'Analista BI')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_bi_staff() TO authenticated;

ALTER TABLE public.datasets ADD COLUMN IF NOT EXISTS metodologia text NOT NULL DEFAULT 'sin etiquetar';
ALTER TABLE public.datasets ADD COLUMN IF NOT EXISTS ingresos numeric(18,2) NOT NULL DEFAULT 0;
ALTER TABLE public.datasets ADD COLUMN IF NOT EXISTS costos numeric(18,2) NOT NULL DEFAULT 0;
ALTER TABLE public.datasets ADD COLUMN IF NOT EXISTS es_mio boolean NOT NULL DEFAULT false;
ALTER TABLE public.datasets ADD COLUMN IF NOT EXISTS headers jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.datasets ADD COLUMN IF NOT EXISTS filas jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.datasets ADD COLUMN IF NOT EXISTS source_filename text;
ALTER TABLE public.datasets ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

DROP POLICY IF EXISTS datasets_admin ON public.datasets;
DROP POLICY IF EXISTS datasets_bi_staff ON public.datasets;
CREATE POLICY datasets_bi_staff ON public.datasets
  FOR ALL TO authenticated
  USING (public.is_bi_staff())
  WITH CHECK (public.is_bi_staff());

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.datasets TO authenticated;

NOTIFY pgrst, 'reload schema';
`;

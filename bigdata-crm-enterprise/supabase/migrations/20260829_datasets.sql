-- Pegar UNA vez en SQL Editor del proyecto oockgxorqwujwiuywfdf.
-- Columnas = las que envía el frontend (datasetStore.insert).
-- El front NO puede CREATE TABLE (anon key). Después de esto, Cargas hace INSERT/SELECT aquí.

CREATE OR REPLACE FUNCTION public.is_bi_staff()
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

CREATE TABLE IF NOT EXISTS public.datasets (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa          text NOT NULL,
  rubro            text NOT NULL,
  metodologia      text NOT NULL DEFAULT 'sin etiquetar',
  ingresos         numeric(18, 2) NOT NULL DEFAULT 0,
  costos           numeric(18, 2) NOT NULL DEFAULT 0,
  ganancia_neta    numeric(18, 2) GENERATED ALWAYS AS (ingresos - costos) STORED,
  margen           numeric(10, 4) GENERATED ALWAYS AS (
                     CASE WHEN ingresos = 0 THEN 0
                     ELSE round(((ingresos - costos) / ingresos) * 100, 4) END
                   ) STORED,
  es_mio           boolean NOT NULL DEFAULT false,
  headers          jsonb NOT NULL DEFAULT '[]'::jsonb,
  filas            jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_filename  text,
  created_by       uuid REFERENCES auth.users (id),
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS datasets_rubro_idx ON public.datasets (rubro);

ALTER TABLE public.datasets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS datasets_bi_staff ON public.datasets;
CREATE POLICY datasets_bi_staff ON public.datasets
  FOR ALL TO authenticated
  USING (public.is_bi_staff())
  WITH CHECK (public.is_bi_staff());

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.datasets TO authenticated;

NOTIFY pgrst, 'reload schema';

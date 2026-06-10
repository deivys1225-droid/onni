DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'categoria_evento_virtual') THEN
    CREATE TYPE public.categoria_evento_virtual AS ENUM ('podcast', 'teatro', 'concierto', 'streamer');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.eventos_virtuales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  categoria public.categoria_evento_virtual NOT NULL,
  url_lobby_preview TEXT NOT NULL,
  url_video_full_360 TEXT NOT NULL,
  precio NUMERIC(10,2) NOT NULL DEFAULT 0,
  id_paypal_plan TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.eventos_virtuales ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'eventos_virtuales'
      AND policyname = 'Eventos virtuales visibles por todos'
  ) THEN
    CREATE POLICY "Eventos virtuales visibles por todos"
      ON public.eventos_virtuales
      FOR SELECT
      USING (activo = true);
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.compras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  evento_virtual_id UUID NOT NULL REFERENCES public.eventos_virtuales(id) ON DELETE CASCADE,
  monto NUMERIC(10,2) NOT NULL DEFAULT 0,
  paypal_order_id TEXT,
  status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('pending', 'paid', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, evento_virtual_id)
);

ALTER TABLE public.compras ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'compras'
      AND policyname = 'Usuarios leen sus compras'
  ) THEN
    CREATE POLICY "Usuarios leen sus compras"
      ON public.compras
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'compras'
      AND policyname = 'Usuarios crean sus compras'
  ) THEN
    CREATE POLICY "Usuarios crean sus compras"
      ON public.compras
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'compras'
      AND policyname = 'Usuarios actualizan sus compras'
  ) THEN
    CREATE POLICY "Usuarios actualizan sus compras"
      ON public.compras
      FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'update_eventos_virtuales_updated_at'
  ) THEN
    CREATE TRIGGER update_eventos_virtuales_updated_at
      BEFORE UPDATE ON public.eventos_virtuales
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'update_compras_updated_at'
  ) THEN
    CREATE TRIGGER update_compras_updated_at
      BEFORE UPDATE ON public.compras
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END
$$;

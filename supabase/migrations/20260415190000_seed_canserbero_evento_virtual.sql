INSERT INTO public.eventos_virtuales (
  id,
  titulo,
  categoria,
  url_lobby_preview,
  url_video_full_360,
  precio,
  id_paypal_plan,
  activo
)
VALUES (
  'a1b2c3d4-000c-4000-8000-00000000c001',
  'Canserbero - Sala 360',
  'concierto',
  'https://www.youtube.com/watch?v=M7lc1UVf-VE',
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  1.00,
  'PLAN_DH_CANSERBERO',
  true
)
ON CONFLICT (id) DO UPDATE
SET
  titulo = EXCLUDED.titulo,
  categoria = EXCLUDED.categoria,
  url_lobby_preview = EXCLUDED.url_lobby_preview,
  url_video_full_360 = EXCLUDED.url_video_full_360,
  precio = EXCLUDED.precio,
  id_paypal_plan = EXCLUDED.id_paypal_plan,
  activo = EXCLUDED.activo;

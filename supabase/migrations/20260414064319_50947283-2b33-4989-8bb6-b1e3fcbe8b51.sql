
-- Update Electrónica event to $1
UPDATE public.events SET price = 1, title = 'Neon Pulse Festival', description = 'Festival de música electrónica con los mejores DJs internacionales' WHERE id = 'a1b2c3d4-0001-4000-8000-000000000001';

-- Insert Música Urbana event (free, YouTube)
INSERT INTO public.events (id, title, description, date, price, playback_id, is_live)
VALUES (
  'a1b2c3d4-0003-4000-8000-000000000003',
  'Urban Beats Live',
  'Lo mejor del reggaetón, trap y hip-hop latino en un show explosivo',
  '2026-05-08T20:00:00Z',
  0,
  'youtube:dQw4w9WgXcQ',
  true
)
ON CONFLICT (id) DO UPDATE SET price = 0, playback_id = 'youtube:dQw4w9WgXcQ', title = 'Urban Beats Live';

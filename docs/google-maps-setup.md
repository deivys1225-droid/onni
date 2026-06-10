# Google Maps setup para LeadFinder

## Para que ayuda Maps en tu caso (ventas B2B colegios)

- Mejora precision geografica (direccion exacta y punto real en mapa).
- Sube calidad de telefono/sitio oficial frente a solo snippets web.
- Detecta colegios locales con poca presencia SEO.
- Permite priorizar zonas donde quieres vender OnniVers VR.

## Costos (idea general)

- Google Maps Platform cobra por uso de APIs (por request).
- No hay costo fijo: pagas por volumen.
- Recomendacion: usar Maps solo en modo "precision" (ON/OFF), no siempre.

## Claves/API que necesitas

1. Crear proyecto en Google Cloud.
2. Habilitar:
   - Places API
   - (opcional) Geocoding API
3. Crear API key restringida por IP/servicio.
4. Guardar secreto en Supabase Edge:
   - `GOOGLE_MAPS_API_KEY`

## Clave de busqueda web (sin Maps)

Para buscar Google web desde backend usamos SerpAPI:
- secreto requerido: `SERPAPI_API_KEY`

## Donde se usa en el codigo

- Edge function: `supabase/functions/leadfinder-search/index.ts`
- Toggle en panel: `Maps: ON/OFF` en `LeadOpsFloatingPanel`

## Estrategia recomendada de uso

1. Buscar primero con Maps OFF (mas barato).
2. Si la calidad es baja, repetir con Maps ON.
3. Mantener limites de 10 o 20 resultados para mayor verificacion manual.

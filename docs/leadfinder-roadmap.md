# LeadFinder Roadmap (paso a paso)

## Estado actual

- [x] Login local admin minimo.
- [x] Panel flotante de control con tabla.
- [x] Esquema SQL modular base (jobs, organizations, contacts, sources, exports, drafts).
- [x] Edge Function inicial `leadfinder-search` para busqueda web regional (Google web via SerpAPI).
- [x] Cliente frontend para invocar la funcion.

## Siguiente paso inmediato (sin Google Maps)

- [ ] Persistir cada busqueda en `lead_search_jobs`.
- [ ] Guardar resultados en `organizations` + `organization_contacts` + `organization_sources`.
- [ ] Pintar tabla leyendo desde Supabase (no solo desde memoria).

## Paso siguiente (calidad)

- [ ] Dedupe por website + nombre aproximado.
- [ ] Score de confianza por fuente.
- [ ] Mejor parser de correos/telefonos desde snippets.

## Paso siguiente (ExcelTool)

- [ ] Endpoint para generar CSV/XLSX desde filtros.
- [ ] Guardar metadata en `data_exports`.
- [ ] Boton de descarga en panel.

## Paso siguiente (EmailTool)

- [ ] Plantillas de correo por tipo de entidad.
- [ ] Generacion de borradores en `email_drafts`.
- [ ] Flujo de aprobacion manual antes de envio.

## Futuro opcional (Google Maps)

- Integrar provider de Places solo si necesitamos subir recall y precision geografica.
- El orquestador ya esta modular: se agrega provider `google_maps` sin romper lo actual.

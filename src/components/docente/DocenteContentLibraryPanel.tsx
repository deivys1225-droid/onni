import { useState } from "react";
import { Box, FileText, Film } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DocenteCatalogMediaCard from "@/components/docente/DocenteCatalogMediaCard";
import { salaRoomGrid3ColClass } from "@/components/salas/salaRoomCardStyles";
import {
  DOCENTE_CATALOG_ELEMENTS_3D,
  DOCENTE_CATALOG_VIDEOS,
  type DocenteContentTabId,
} from "@/data/docenteContentCatalog";
import { toast } from "sonner";

export default function DocenteContentLibraryPanel() {
  const [tab, setTab] = useState<DocenteContentTabId>("videos");

  const copyResourceLink = async (url: string, fieldHint: "video" | "glb") => {
    const link = url.trim();
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      const hint =
        fieldHint === "glb"
          ? "Pégalo en el campo GLB de la clase que quieras."
          : "Pégalo en el campo de video de la clase que quieras.";
      toast.success(`Enlace copiado. ${hint}`);
    } catch {
      toast.error("No se pudo copiar. Copia el enlace manualmente desde el navegador.");
    }
  };

  return (
    <section className="mt-8 rounded-2xl border border-cyan-400/25 bg-card/40 p-4 backdrop-blur md:p-5">
      <div className="mb-4">
        <h2 className="font-display text-lg font-semibold text-cyan-50">Tabla de contenido</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Biblioteca de recursos para tus clases: videos, PDF y elementos 3D.
        </p>
      </div>

      <Tabs value={tab} onValueChange={(value) => setTab(value as DocenteContentTabId)}>
        <TabsList className="mb-4 grid h-auto w-full grid-cols-3 gap-1 bg-background/60 p-1">
          <TabsTrigger value="videos" className="gap-1.5 text-xs sm:text-sm">
            <Film className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Videos
          </TabsTrigger>
          <TabsTrigger value="pdf" className="gap-1.5 text-xs sm:text-sm">
            <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden />
            PDF
          </TabsTrigger>
          <TabsTrigger value="elementos-3d" className="gap-1.5 text-xs sm:text-sm">
            <Box className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Elementos 3D
          </TabsTrigger>
        </TabsList>

        <TabsContent value="videos" className="mt-0">
          <div className={`${salaRoomGrid3ColClass} max-w-4xl`}>
            {DOCENTE_CATALOG_VIDEOS.map((item, index) => (
              <DocenteCatalogMediaCard
                key={item.id}
                index={index}
                title={item.title}
                description={item.description}
                imageUrl={item.imageUrl}
                imageAlt={item.title}
                badge={item.badge}
                mediaKind="video"
                actionLabel="Copiar"
                onAction={() => void copyResourceLink(item.videoUrl, "video")}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="pdf" className="mt-0">
          <p className="rounded-xl border border-dashed border-border/60 bg-background/30 px-4 py-8 text-center text-sm text-muted-foreground">
            Próximamente: tarjetas PDF con el mismo diseño.
          </p>
        </TabsContent>

        <TabsContent value="elementos-3d" className="mt-0">
          <div className={`${salaRoomGrid3ColClass}`}>
            {DOCENTE_CATALOG_ELEMENTS_3D.map((item, index) => (
              <DocenteCatalogMediaCard
                key={item.id}
                index={index}
                title={item.title}
                description={item.description}
                imageUrl={item.imageUrl}
                imageAlt={item.title}
                badge={item.badge}
                mediaKind="element3d"
                actionLabel="Copiar"
                onAction={() => void copyResourceLink(item.resourceUrl, "glb")}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </section>
  );
}

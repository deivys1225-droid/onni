import { describe, expect, it } from "vitest";
import { resolveOpCommand } from "@/lib/opAssistantResolver";

describe("resolveOpCommand", () => {
  it("abre un video va a conciertos, no a espectador", () => {
    const r = resolveOpCommand("abre un video", "/");
    expect(r.navigateTo).toBe("/nuestras-salas");
  });

  it("reproductor mp4 va a reproductor-galeria", () => {
    const r = resolveOpCommand("reproductor mp4", "/");
    expect(r.navigateTo).toBe("/reproductor-galeria");
  });

  it("acepta typo roproductor y va a reproductor-galeria", () => {
    const r = resolveOpCommand("abre roproductor", "/");
    expect(r.navigateTo).toBe("/reproductor-galeria");
  });

  it("acepta typo coliceo y navega a /coliseo", () => {
    const r = resolveOpCommand("abre coliceo", "/");
    expect(r.navigateTo).toBe("/coliseo");
  });

  it("entrar a clase: fuera del panel va a /3d; en panel pulsa Entrar a clase", () => {
    expect(resolveOpCommand("entrar", "/docente-clases", { appRole: "docente" }).command).toEqual({
      type: "docente.enterClass",
    });
    expect(resolveOpCommand("entrar a clases", "/docente-clases", { appRole: "docente" }).command).toEqual({
      type: "docente.enterClass",
    });
    expect(resolveOpCommand("oni entrar", "/docente-clases", { appRole: "docente" }).command).toEqual({
      type: "docente.enterClass",
    });

    const fromInicio = resolveOpCommand("entra a la clase", "/coliseo", { appRole: "docente" });
    expect(fromInicio.navigateTo).toBe("/3d");
    expect(fromInicio.command).toBeUndefined();

    expect(resolveOpCommand("oni entrar", "/", { appRole: "docente" }).navigateTo).toBe("/3d");
    expect(resolveOpCommand("entrar a clases", "/", { appRole: "docente" }).navigateTo).toBe("/3d");

    const denied = resolveOpCommand("entrar", "/", { appRole: "particular" });
    expect(denied.command).toBeUndefined();
    expect(denied.navigateTo).toBe("/entrar");
  });

  it("iniciar clase dispara comando docente.startClass para docentes", () => {
    const onPanel = resolveOpCommand("iniciar clase", "/docente-clases", { appRole: "docente" });
    expect(onPanel.command).toEqual({ type: "docente.startClass" });
    expect(onPanel.navigateTo).toBeUndefined();

    const fromElsewhere = resolveOpCommand("oni comencemos la clase", "/coliseo", { appRole: "docente" });
    expect(fromElsewhere.command).toEqual({ type: "docente.startClass" });
    expect(fromElsewhere.navigateTo).toBe("/docente-clases");

    const typo = resolveOpCommand("inia la clase", "/docente-clases", { appRole: "docente" });
    expect(typo.command).toEqual({ type: "docente.startClass" });

    const denied = resolveOpCommand("iniciar clase", "/", { appRole: "estudiante" });
    expect(denied.command).toBeUndefined();
    expect(denied.answer.toLowerCase()).toContain("docente");
  });

  it("finalizar clase dispara comando docente.endClass para docentes", () => {
    const onPanel = resolveOpCommand("finalizar clase", "/docente-clases", { appRole: "docente" });
    expect(onPanel.command).toEqual({ type: "docente.endClass" });
    expect(onPanel.navigateTo).toBeUndefined();

    const fromElsewhere = resolveOpCommand("finaliza la clase", "/coliseo", { appRole: "docente" });
    expect(fromElsewhere.command).toEqual({ type: "docente.endClass" });
    expect(fromElsewhere.navigateTo).toBe("/docente-clases");

    expect(resolveOpCommand("terminar clases", "/docente-clases", { appRole: "admin" }).command).toEqual({
      type: "docente.endClass",
    });

    const denied = resolveOpCommand("finalizar clase", "/", { appRole: "particular" });
    expect(denied.command).toBeUndefined();
    expect(denied.answer.toLowerCase()).toContain("docente");
  });

  it("panel docente solo navega con rol docente o admin", () => {
    expect(
      resolveOpCommand("llevame al panel de docente", "/", { appRole: "docente" }).navigateTo,
    ).toBe("/docente-clases");
    expect(
      resolveOpCommand("oni llevame al panel de docente", "/3d", { appRole: "docente" }).navigateTo,
    ).toBe("/docente-clases");
    expect(
      resolveOpCommand("oni llevame al panel", "/educacion", { appRole: "docente" }).navigateTo,
    ).toBe("/docente-clases");
    expect(
      resolveOpCommand("llevame al pane", "/", { appRole: "admin" }).navigateTo,
    ).toBe("/docente-clases");
    const denied = resolveOpCommand("panel docente", "/", { appRole: "particular" });
    expect(denied.navigateTo).toBeUndefined();
    expect(denied.answer.toLowerCase()).toContain("docente");
  });

  it("panel docente gana sobre llevame a clases si menciona panel", () => {
    const r = resolveOpCommand("llevame al panel de docente", "/3d", { appRole: "docente" });
    expect(r.navigateTo).toBe("/docente-clases");
    expect(r.answer.toLowerCase()).toContain("panel de docente");
  });

  it("oni inicio y llevame al inicio van a Mi Mundo /", () => {
    expect(resolveOpCommand("inicio", "/coliseo").navigateTo).toBe("/");
    expect(resolveOpCommand("llevame al inicio", "/coliseo").navigateTo).toBe("/");
    expect(resolveOpCommand("oni inicio", "/nuestras-salas").navigateTo).toBe("/");
    expect(resolveOpCommand("oni llevame al inicio", "/3d").navigateTo).toBe("/");
  });

  it("clase virtual y llevame a la clase van a seccion /3d", () => {
    expect(resolveOpCommand("clase virtual", "/").navigateTo).toBe("/3d");
    expect(resolveOpCommand("llevame a la clase", "/").navigateTo).toBe("/3d");
    expect(resolveOpCommand("oni llevame a la clase", "/").navigateTo).toBe("/3d");
    expect(resolveOpCommand("lleva a la clase", "/coliseo").navigateTo).toBe("/3d");
    expect(resolveOpCommand("oni llevame a la clase", "/docente-clases", { appRole: "docente" }).navigateTo).toBe(
      "/3d",
    );
    expect(
      resolveOpCommand("oni llevame a la clase", "/docente-clases", { appRole: "docente" }).command,
    ).toBeUndefined();
    expect(resolveOpCommand("lleva a clases", "/").navigateTo).toBe("/3d");
    expect(resolveOpCommand("oni lleva a clases", "/coliseo").navigateTo).toBe("/3d");
    expect(resolveOpCommand("llevame a clases", "/").navigateTo).toBe("/3d");
    expect(resolveOpCommand("onni lleva me a clase virtuar", "/").navigateTo).toBe("/3d");
    expect(resolveOpCommand("ir a la clase virtual", "/nuestras-salas").navigateTo).toBe("/3d");
    expect(resolveOpCommand("aula virtual", "/").navigateTo).toBe("/3d");
    expect(resolveOpCommand("lleva al aula", "/").navigateTo).toBe("/3d");
    expect(resolveOpCommand("aula caminable", "/").navigateTo).toBe("/aula-virtual");
  });

  it("video de karol va a sala nova-byte", () => {
    const r = resolveOpCommand("entra al video de karol", "/");
    expect(r.navigateTo).toContain("al-universo-nova-byte");
  });

  it("detecta falsos positivos en frases comunes", () => {
    const phrases = [
      "abre un video",
      "abre video",
      "abre el video",
      "quiero ver un video",
      "entra al video",
      "llevame a ver video",
      "video local",
      "mp4",
      "reproductor local",
      "abre un video por favor",
      "pon un video",
      "muestrame un video",
    ];
    for (const phrase of phrases) {
      const r = resolveOpCommand(phrase, "/");
      if (r.navigateTo?.includes("/sala/espectador/")) {
        throw new Error(`"${phrase}" navegó a espectador: ${r.navigateTo}`);
      }
    }
  });

  it("desde espectador, abre un video va a conciertos (no reentrar karol)", () => {
    const r = resolveOpCommand("abre un video", "/sala/espectador/al-universo-nova-byte");
    expect(r.navigateTo).toBe("/nuestras-salas");
  });

  it("desde espectador, reproductor mp4 va a galeria local", () => {
    const r = resolveOpCommand("reproductor mp4", "/sala/espectador/al-universo-nova-byte");
    expect(r.navigateTo).toBe("/reproductor-galeria");
  });

  it("salir de la sala va a conciertos", () => {
    const r = resolveOpCommand("salir a conciertos", "/sala/espectador/al-universo-nova-byte");
    expect(r.navigateTo).toBe("/nuestras-salas");
  });

  it("donde estoy no navega", () => {
    const r = resolveOpCommand("donde estoy", "/lobby-inmersivo");
    expect(r.navigateTo).toBeUndefined();
    expect(r.answer.toLowerCase()).toContain("lobby");
  });

  it("en lobby ya no cambia video de youtube (anatomia 3D en pared 4)", () => {
    const r = resolveOpCommand("cambia el video a gasolina daddy yankee", "/lobby-inmersivo");
    expect(r.command).toBeUndefined();
    expect(r.answer.toLowerCase()).toMatch(/anatom|youtube/);
  });

  it("fuera del lobby informa anatomia en lugar de youtube", () => {
    const r = resolveOpCommand("cambia el video a gasolina daddy yankee", "/nuestras-salas");
    expect(r.command).toBeUndefined();
    expect(r.answer.toLowerCase()).toMatch(/anatom|lobby/);
  });

  it("ayuda responde breve sin lista de comandos", () => {
    const r = resolveOpCommand("ayuda", "/");
    expect(r.answer).toMatch(/inicio|mi mundo/i);
    expect(r.answer.toLowerCase()).not.toMatch(/lobby.*conciertos|comandos como/);
  });

  it("repite la ultima respuesta", () => {
    const first = resolveOpCommand("hola", "/");
    const r = resolveOpCommand("repite", "/", { lastAnswer: first.answer });
    expect(r.answer).toBe(first.answer);
  });

  it("atras usa navigateBack", () => {
    const r = resolveOpCommand("volver atras", "/nuestras-salas");
    expect(r.navigateBack).toBe(true);
  });

  it("mi favorito es karol guarda sin navegar", () => {
    const r = resolveOpCommand("mi favorito es karol", "/");
    expect(r.navigateTo).toBeUndefined();
    expect(r.answer.toLowerCase()).toContain("karol");
  });
});

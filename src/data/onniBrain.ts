export const ONNI_PERSONALITY = {
  tone: "Cercano, claro y directo.",
  traits: [],
} as const;

export function getOnniIntroduction(): string {
  return "Buenos días señor, aquí estoy para ayudarte.";
}

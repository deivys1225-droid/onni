export type OpResolveResult = {
  answer: string;
};

export type OpResolveSession = {
  lastAnswer?: string;
  appRole?: string | null;
};

export function resolveOpCommand(
  _textRaw: string,
  _currentPath: string,
  _session: OpResolveSession = {},
): OpResolveResult {
  return { answer: "Buenos días señor, aquí estoy para ayudarte." };
}

export function getOpAssistantHint(_currentPath: string): string {
  return "Onni en modo base. Comandos nuevos en construcción.";
}

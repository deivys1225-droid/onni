export type ClassVoiceControlAction = "grant_speak" | "revoke_speak";

export type ClassVoiceControlPayload = {
  action: ClassVoiceControlAction;
  targetUserId: string;
  teacherId: string;
};

export function buildClassVoiceControlChannel(classSlug: string): string {
  const slug = classSlug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-");
  return `class-voice-control-${slug || "main"}`;
}

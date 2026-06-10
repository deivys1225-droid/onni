import { Mic, MicOff, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ClassVoiceStudentRow = {
  userId: string;
  displayName: string;
  speakGranted: boolean;
};

type AgoraClassVoiceTeacherPanelProps = {
  open: boolean;
  onClose: () => void;
  students: ClassVoiceStudentRow[];
  onToggleStudentSpeak: (userId: string, grant: boolean) => void;
};

export default function AgoraClassVoiceTeacherPanel({
  open,
  onClose,
  students,
  onToggleStudentSpeak,
}: AgoraClassVoiceTeacherPanelProps) {
  if (!open) return null;

  return (
    <aside
      className="pointer-events-auto fixed z-40 flex w-[min(88vw,280px)] flex-col rounded-xl border border-cyan-400/30 bg-slate-950/92 shadow-[0_0_32px_-10px_rgba(34,211,238,0.65)] backdrop-blur-md"
      style={{
        top: "max(4.5rem, calc(env(safe-area-inset-top) + 3.5rem))",
        right: "max(0.75rem, env(safe-area-inset-right))",
        bottom: "max(5.5rem, calc(env(safe-area-inset-bottom) + 4.5rem))",
      }}
      aria-label="Panel de alumnos en clase"
    >
      <div className="flex items-center justify-between border-b border-cyan-400/20 px-3 py-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-cyan-50">
          <Users className="h-4 w-4 text-cyan-300" aria-hidden />
          Alumnos ({students.length})
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-cyan-200/80 transition hover:bg-white/10"
          aria-label="Cerrar panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {students.length === 0 ? (
          <p className="px-2 py-4 text-center text-[11px] text-cyan-200/70">Ningún alumno conectado.</p>
        ) : (
          <ul className="space-y-1.5">
            {students.map((student) => (
              <li
                key={student.userId}
                className="flex items-center gap-2 rounded-lg border border-cyan-400/15 bg-cyan-950/30 px-2 py-1.5"
              >
                <span className="min-w-0 flex-1 truncate text-[11px] text-cyan-50">{student.displayName}</span>
                <button
                  type="button"
                  onClick={() => onToggleStudentSpeak(student.userId, !student.speakGranted)}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold transition",
                    student.speakGranted
                      ? "border-emerald-400/45 bg-emerald-500/20 text-emerald-100"
                      : "border-cyan-300/35 bg-black/40 text-cyan-100 hover:bg-cyan-500/15",
                  )}
                  title={student.speakGranted ? "Silenciar alumno" : "Permitir hablar"}
                >
                  {student.speakGranted ? (
                    <Mic className="h-3 w-3" aria-hidden />
                  ) : (
                    <MicOff className="h-3 w-3" aria-hidden />
                  )}
                  {student.speakGranted ? "Escuchando" : "Dar voz"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="border-t border-cyan-400/15 px-3 py-2 text-[10px] leading-snug text-cyan-200/65">
        El alumno activa el micrófono al entrar. Tú decides cuándo se escucha en clase.
      </p>
    </aside>
  );
}

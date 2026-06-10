import { useState } from "react";
import PodcastImmersiveScene, { type ReactionKind } from "@/components/immersive/PodcastImmersiveScene";
import type { StreamerProfile } from "@/data/podcastStreamers";

const baseChat = ["Comunidad conectada al lobby.", "Sincronizando presencia espacial…"];

export interface PodcastSala360Props {
  streamer: StreamerProfile;
}

/**
 * Sala podcast: una sola escena Three.js con esfera equirectangular interior,
 * vídeo/chat Html en coordenadas 3D y reacciones en planos con Billboard.
 */
const PodcastSala360 = ({ streamer }: PodcastSala360Props) => {
  const [messages, setMessages] = useState<string[]>(baseChat);
  const [chatInput, setChatInput] = useState("");
  const [bursts, setBursts] = useState<Array<{ id: number; kind: ReactionKind }>>([]);

  const onSendChat = () => {
    const t = chatInput.trim();
    if (!t) return;
    setMessages((prev) => [...prev.slice(-20), t]);
    setChatInput("");
  };

  const onReaction = (kind: ReactionKind) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setBursts((prev) => [...prev, { id, kind }]);
  };

  const onBurstDone = (id: number) => {
    setBursts((prev) => prev.filter((b) => b.id !== id));
  };

  return (
    <PodcastImmersiveScene
      streamer={streamer}
      messages={messages}
      chatInput={chatInput}
      onChatInput={setChatInput}
      onSendChat={onSendChat}
      onReaction={onReaction}
      bursts={bursts}
      onBurstDone={onBurstDone}
    />
  );
};

export default PodcastSala360;

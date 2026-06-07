import { useEffect, useRef, useState } from "react";

type VoiceState = "idle" | "playing" | "paused" | "ended";

/**
 * VoiceToggleIcon – bouton vocal avec 4 états visuels.
 *
 * • idle   – 🔊   (prêt à démarrer)
 * • playing – ⏸︎ (lecture en cours)
 * • paused  – ▶︎ (lecture en pause)
 * • ended   – 🔁 (rejouer depuis le début)
 *
 * Le composant conserve le temps de lecture sous forme d'**entier**
 * (secondes) afin de garantir que les valeurs transmises à l'API
 * `audio.currentTime` sont toujours des nombres entiers. Cela évite
 * d'éventuels problèmes de précision quand on veut reprendre exactement
 * au même point.
 */
export default function VoiceToggleIcon({
  audioUrl,
}: {
  /** URL du flux audio généré par le backend */
  audioUrl: string;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<VoiceState>("idle");
  // sauvegarde du temps en secondes **entier**
  const [savedTime, setSavedTime] = useState<number>(0);

  // Initialise l'objet Audio une seule fois
  useEffect(() => {
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    // Quand l'audio se termine, on bascule sur l'état « ended »
    audio.onended = () => setState("ended");
    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, [audioUrl]);

  const handleClick = () => {
    const audio = audioRef.current!;
    switch (state) {
      case "idle":
        // (re)départ depuis le début
        audio.currentTime = 0;
        audio.play();
        setState("playing");
        break;
      case "playing":
        audio.pause();
        // on garde le temps arrondi à l'entier le plus proche
        setSavedTime(Math.round(audio.currentTime));
        setState("paused");
        break;
      case "paused":
        // reprendre exactement au même second entier
        audio.currentTime = savedTime;
        audio.play();
        setState("playing");
        break;
      case "ended":
        audio.currentTime = 0;
        audio.play();
        setState("playing");
        break;
    }
  };

  const getIcon = () => {
    switch (state) {
      case "idle":
        return "🔊";
      case "playing":
        return "⏸︎";
      case "paused":
        return "▶︎";
      case "ended":
        return "🔁";
    }
  };

  // Animation néon uniquement pendant la lecture
  const neonClass = state === "playing" ? "neon-rotate" : "";

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`text-4xl ${neonClass} focus:outline-none`}
      aria-label="Lecture vocale du message"
    >
      {getIcon()}
    </button>
  );
}

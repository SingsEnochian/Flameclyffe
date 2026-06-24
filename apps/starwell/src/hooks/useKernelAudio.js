import { useEffect, useRef, useState } from 'react';

export function useKernelAudio(audioProfile) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTrack, setActiveTrack] = useState(null);
  const [audioError, setAudioError] = useState(null);

  const trackPath = audioProfile?.loopAssetPath ?? null;

  useEffect(() => {
    if (!trackPath) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
      setIsPlaying(false);
      setActiveTrack(null);
      return;
    }

    const audio = new Audio(trackPath);
    audio.loop = true;
    audio.preload = 'none';
    audio.volume = 0.45;

    audioRef.current = audio;
    setActiveTrack(trackPath);
    setIsPlaying(false);
    setAudioError(null);

    return () => {
      audio.pause();
      audio.src = '';
      if (audioRef.current === audio) {
        audioRef.current = null;
      }
    };
  }, [trackPath]);

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    try {
      await audio.play();
      setIsPlaying(true);
      setAudioError(null);
    } catch (err) {
      setIsPlaying(false);
      setAudioError(err.message);
    }
  }

  return { isPlaying, togglePlayback, activeTrack, audioError };
}

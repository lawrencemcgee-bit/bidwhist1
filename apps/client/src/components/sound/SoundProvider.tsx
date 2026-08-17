import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  playBid,
  playPlacement,
  playShuffle,
  playTrickWin,
  startAmbience,
} from './audio.js';

interface SoundContextValue {
  muted: boolean;
  volume: number;
  setMuted: (muted: boolean) => void;
  setVolume: (volume: number) => void;
  playShuffle: () => void;
  playPlacement: () => void;
  playTrickWin: () => void;
  playBid: () => void;
  playAmbience: () => void;
  stopAmbience: () => void;
}

const SoundContext = createContext<SoundContextValue | null>(null);

export function SoundProvider({ children }: { children: ReactNode }) {
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.6);
  const ambienceStopRef = useRef<(() => void) | null>(null);

  const playShuffleCb = useCallback(() => {
    if (!muted) playShuffle(volume);
  }, [muted, volume]);

  const playPlacementCb = useCallback(() => {
    if (!muted) playPlacement(volume);
  }, [muted, volume]);

  const playTrickWinCb = useCallback(() => {
    if (!muted) playTrickWin(volume);
  }, [muted, volume]);

  const playBidCb = useCallback(() => {
    if (!muted) playBid(volume);
  }, [muted, volume]);

  const playAmbienceCb = useCallback(() => {
    if (ambienceStopRef.current) return;
    ambienceStopRef.current = muted ? () => undefined : startAmbience(volume);
  }, [muted, volume]);

  const stopAmbienceCb = useCallback(() => {
    ambienceStopRef.current?.();
    ambienceStopRef.current = null;
  }, []);

  const value = useMemo<SoundContextValue>(
    () => ({
      muted,
      volume,
      setMuted,
      setVolume,
      playShuffle: playShuffleCb,
      playPlacement: playPlacementCb,
      playTrickWin: playTrickWinCb,
      playBid: playBidCb,
      playAmbience: playAmbienceCb,
      stopAmbience: stopAmbienceCb,
    }),
    [muted, volume, playShuffleCb, playPlacementCb, playTrickWinCb, playBidCb, playAmbienceCb, stopAmbienceCb],
  );

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
}

export function useSounds(): SoundContextValue {
  const ctx = useContext(SoundContext);
  if (!ctx) {
    throw new Error('useSounds must be used within a SoundProvider');
  }
  return ctx;
}

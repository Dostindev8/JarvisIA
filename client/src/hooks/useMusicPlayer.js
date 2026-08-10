import { useCallback, useEffect, useRef, useState } from 'react';
import { Howl, Howler } from 'howler';

const API_BASE = import.meta.env.VITE_API_URL || '';

export function useMusicPlayer(socket) {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(0.7);
  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  const howlRef = useRef(null);
  const progressIntervalRef = useRef(null);

  const clearProgressInterval = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  const unloadHowl = useCallback(() => {
    clearProgressInterval();
    if (howlRef.current) {
      howlRef.current.unload();
      howlRef.current = null;
    }
  }, [clearProgressInterval]);

  const loadTrack = useCallback(
    (filename, meta = {}) => {
      unloadHowl();
      const src = `${API_BASE}/audio/${filename}`;
      const howl = new Howl({
        src: [src],
        html5: true,
        volume,
        onplay: () => setIsPlaying(true),
        onpause: () => setIsPlaying(false),
        onend: () => {
          setIsPlaying(false);
          setProgress(0);
        },
        onloaderror: (_id, err) => console.warn('[Music]', err)
      });

      howlRef.current = howl;
      setCurrentTrack({
        filename,
        title: meta.title || filename.replace(/\.[^.]+$/, ''),
        artist: meta.artist || 'Biblioteca local',
        url: src
      });

      progressIntervalRef.current = setInterval(() => {
        const h = howlRef.current;
        if (!h || !h.playing()) return;
        const dur = h.duration();
        if (dur > 0) setProgress((h.seek() / dur) * 100);
      }, 500);
    },
    [unloadHowl, volume]
  );

  const play = useCallback(() => {
    howlRef.current?.play();
    setIsPlaying(true);
  }, []);

  const pause = useCallback(() => {
    howlRef.current?.pause();
    setIsPlaying(false);
  }, []);

  const next = useCallback(() => {
    if (queue.length === 0) return;
    const idx = Math.min(currentIndex + 1, queue.length - 1);
    setCurrentIndex(idx);
    loadTrack(queue[idx].filename, queue[idx]);
    play();
  }, [queue, currentIndex, loadTrack, play]);

  const prev = useCallback(() => {
    if (queue.length === 0) return;
    const idx = Math.max(currentIndex - 1, 0);
    setCurrentIndex(idx);
    loadTrack(queue[idx].filename, queue[idx]);
    play();
  }, [queue, currentIndex, loadTrack, play]);

  const setVolume = useCallback((level) => {
    const v = Math.min(1, Math.max(0, level / 100));
    setVolumeState(v);
    Howler.volume(v);
    howlRef.current?.volume(v);
  }, []);

  const setQueueTracks = useCallback((tracks) => {
    setQueue(tracks);
    setCurrentIndex(0);
    if (tracks[0]) loadTrack(tracks[0].filename, tracks[0]);
  }, [loadTrack]);

  const seekTo = useCallback((percent) => {
    const h = howlRef.current;
    if (!h) return;
    const dur = h.duration();
    if (dur > 0) {
      h.seek((percent / 100) * dur);
      setProgress(percent);
    }
  }, []);

  useEffect(() => {
    if (!socket) return undefined;

    const onPlay = ({ filename, url }) => {
      loadTrack(filename, { title: filename, url });
      play();
    };

    socket.on('music:play', onPlay);
    socket.on('music:pause', pause);
    socket.on('music:next', next);
    socket.on('music:prev', prev);
    socket.on('music:volume', ({ level }) => setVolume(level));

    return () => {
      socket.off('music:play', onPlay);
      socket.off('music:pause', pause);
      socket.off('music:next', next);
      socket.off('music:prev', prev);
      socket.off('music:volume', setVolume);
    };
  }, [socket, loadTrack, play, pause, next, prev, setVolume]);

  useEffect(() => () => unloadHowl(), [unloadHowl]);

  return {
    currentTrack,
    isPlaying,
    volume: volume * 100,
    progress,
    queue,
    play,
    pause,
    next,
    prev,
    setVolume,
    loadTrack,
    setQueue: setQueueTracks,
    seekTo
  };
}

import { useEffect, useRef, useState } from 'react';

const SONGS = [
  '/assets/music/1.mp3',
  '/assets/music/2.mp3',
  '/assets/music/3.mp3',
  '/assets/music/4.mp3',
  '/assets/music/5.mp3',
  '/assets/music/6.mp3',
  '/assets/music/7.mp3'
];

// Shuffle array
const shuffle = (array: string[]) => {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};

export default function BackgroundMusic({ isPlaying }: { isPlaying: boolean }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playlist, setPlaylist] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // Initialize shuffled playlist on mount
    setPlaylist(shuffle(SONGS));
  }, []);

  const wasPlaying = useRef(isPlaying);
  useEffect(() => {
    if (isPlaying && !wasPlaying.current) {
      if (playlist.length > 0) {
        setCurrentIndex(prev => (prev + 1) % playlist.length);
      }
    }
    wasPlaying.current = isPlaying;
  }, [isPlaying, playlist.length]);

  useEffect(() => {
    if (!audioRef.current) return;

    if (isPlaying && playlist.length > 0) {
      audioRef.current.volume = 0.3; // Make it background music
      audioRef.current.play().catch(e => console.log('BGM Autoplay prevented:', e));
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, playlist, currentIndex]);

  const handleEnded = () => {
    if (currentIndex < playlist.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Reshuffle and start over
      setPlaylist(shuffle(SONGS));
      setCurrentIndex(0);
    }
  };

  if (playlist.length === 0) return null;

  return (
    <audio 
      ref={audioRef}
      src={playlist[currentIndex]}
      onEnded={handleEnded}
      preload="auto"
    />
  );
}

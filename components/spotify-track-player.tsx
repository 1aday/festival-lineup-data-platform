'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Play, Pause, RotateCw, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface SpotifyTrackPlayerProps {
  trackId?: string;
  previewUrl?: string;
  trackName?: string;
  artistName?: string;
  popularity?: number;
  previewStartSec?: number; // Start offset in seconds
  previewDurationSec?: number; // How many seconds to play
  className?: string;
}

export function SpotifyTrackPlayer({
  trackId,
  previewUrl,
  trackName,
  artistName,
  popularity,
  previewStartSec = 0,
  previewDurationSec = 30,
  className,
}: SpotifyTrackPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(previewUrl || null);
  const playbackTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate effective play duration (max 30 seconds minus start offset)
  const effectiveDuration = Math.min(previewDurationSec, 30 - previewStartSec);
  
  // Spotify URL for external link only
  const spotifyUrl = trackId ? `https://open.spotify.com/track/${trackId}` : null;

  // Process preview URL through proxy to avoid CORS issues
  const getProxiedUrl = (url: string | null) => {
    if (!url) return null;
    // If it's a Spotify preview URL, proxy it to avoid CORS
    if (url.includes('spotify') || url.includes('mp3-preview')) {
      return `/api/spotify/audio-proxy?url=${encodeURIComponent(url)}`;
    }
    return url;
  };

  // Initialize audio URL on mount or when preview URL changes
  useEffect(() => {
    if (previewUrl) {
      // If we have a preview URL from props, proxy it
      const proxiedUrl = getProxiedUrl(previewUrl);
      setAudioUrl(proxiedUrl);
    } else if (trackId) {
      // Try to get preview URL from our cached API
      fetch(`/api/spotify/preview?trackId=${trackId}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.previewUrl) {
            // Use proxied URL to avoid CORS issues
            const proxiedUrl = getProxiedUrl(data.previewUrl);
            setAudioUrl(proxiedUrl);
            console.log('Got preview URL from cache/API (proxied):', proxiedUrl);
          }
        })
        .catch(err => {
          console.error('Failed to fetch preview URL:', err);
        });
    }
  }, [trackId, previewUrl]);

  useEffect(() => {
    // Only create WaveSurfer if we have a valid audio URL and container
    if (!audioUrl || !containerRef.current) {
      // Reset loading state if no audio URL
      setIsLoading(false);
      return;
    }

    let wavesurfer: WaveSurfer | null = null;
    let isDestroyed = false;
    let abortController: AbortController | null = null;

    const createWaveSurfer = async () => {
      // Exit early if already destroyed
      if (isDestroyed) return;
      
      try {
        // Create abort controller for cancellable operations
        abortController = new AbortController();
        
        // Create WaveSurfer instance
        wavesurfer = WaveSurfer.create({
          container: containerRef.current!,
          waveColor: 'oklch(0.4743 0.2229 262.2074)', // Secondary (purple)
          progressColor: 'oklch(0.9681 0.2103 109.7597)', // Primary (yellow)
          cursorColor: 'oklch(0.9681 0.2103 109.7597)',
          barWidth: 2,
          barRadius: 3,
          cursorWidth: 2,
          height: 40,
          barGap: 3,
          normalize: true,
          backend: 'WebAudio',
          interact: true,
          dragToSeek: true,
          fetchParams: {
            signal: abortController.signal,
            mode: 'cors',
            credentials: 'omit',
          },
        });

        // Check if already destroyed
        if (isDestroyed) {
          wavesurfer.destroy();
          return;
        }

        wavesurferRef.current = wavesurfer;

        // Event handlers
        wavesurfer.on('ready', () => {
          if (!isDestroyed) {
            setIsLoading(false);
            setDuration(wavesurfer.getDuration());
            wavesurfer.setVolume(volume);
            
            // If start offset is specified, seek to that position
            if (previewStartSec > 0) {
              const startPosition = previewStartSec / wavesurfer.getDuration();
              wavesurfer.seekTo(startPosition);
            }
          }
        });

        wavesurfer.on('play', () => {
          if (!isDestroyed) {
            setIsPlaying(true);
            
            // Set up automatic stop after specified duration
            if (effectiveDuration < 30) {
              if (playbackTimerRef.current) {
                clearTimeout(playbackTimerRef.current);
              }
              playbackTimerRef.current = setTimeout(() => {
                if (wavesurferRef.current && !isDestroyed) {
                  wavesurferRef.current.pause();
                  wavesurferRef.current.seekTo(previewStartSec / wavesurferRef.current.getDuration());
                }
              }, effectiveDuration * 1000);
            }
          }
        });
        
        wavesurfer.on('pause', () => {
          if (!isDestroyed) {
            setIsPlaying(false);
            // Clear the auto-stop timer
            if (playbackTimerRef.current) {
              clearTimeout(playbackTimerRef.current);
              playbackTimerRef.current = null;
            }
          }
        });
        
        wavesurfer.on('finish', () => !isDestroyed && setIsPlaying(false));
        wavesurfer.on('timeupdate', (time) => {
          if (!isDestroyed) {
            setCurrentTime(time);
            // Stop if we've played for the specified duration
            if (time >= previewStartSec + effectiveDuration) {
              wavesurfer.pause();
              wavesurfer.seekTo(previewStartSec / wavesurfer.getDuration());
            }
          }
        });
        wavesurfer.on('error', (error: any) => {
          // Completely ignore abort errors - they're expected during unmounting
          if (error?.message?.includes('abort') || 
              error?.message?.includes('Abort') || 
              error?.name === 'AbortError' ||
              error?.message?.includes('Component unmounting')) {
            // Expected during unmount, don't log
            return;
          }
          
          // Handle encoding errors gracefully
          if (error?.message?.includes('Unable to decode audio data') || 
              error?.name === 'EncodingError') {
            console.warn('Preview audio not available or corrupted');
            if (!isDestroyed) {
              setIsLoading(false);
              setAudioUrl(null); // Clear the URL to show "no preview" message
            }
            return;
          }
          
          // Log other unexpected errors
          console.error('WaveSurfer error:', error);
          if (!isDestroyed) {
            setIsLoading(false);
          }
        });

        // Load audio - validate URL first
        if (!isDestroyed && audioUrl && typeof audioUrl === 'string' && audioUrl.length > 0) {
          // Double-check before loading
          if (isDestroyed || !wavesurfer) return;
          
          try {
            wavesurfer.load(audioUrl);
          } catch (loadError: any) {
            // Ignore abort errors
            if (loadError?.name === 'AbortError' || loadError?.message?.includes('abort')) {
              return;
            }
            console.error('Failed to load audio:', loadError);
            if (!isDestroyed) {
              setIsLoading(false);
            }
          }
        } else if (!isDestroyed) {
          console.warn('No preview URL available');
          setIsLoading(false);
        }
      } catch (error: any) {
        // Completely ignore abort errors
        if (error?.message?.includes('abort') || 
            error?.message?.includes('Abort') || 
            error?.name === 'AbortError' ||
            error?.message?.includes('Component unmounting')) {
          // Expected during unmount, don't log
          return;
        }
        console.error('Failed to create WaveSurfer:', error);
        if (!isDestroyed) {
          setIsLoading(false);
        }
      }
    };

    createWaveSurfer();

    return () => {
      isDestroyed = true;
      
      // Abort any pending fetch operations first
      if (abortController) {
        try {
          abortController.abort(new DOMException('Component unmounting', 'AbortError'));
        } catch (e) {
          // Ignore abort errors
        }
      }
      
      // Clear playback timer
      if (playbackTimerRef.current) {
        clearTimeout(playbackTimerRef.current);
        playbackTimerRef.current = null;
      }
      
      if (wavesurfer && wavesurferRef.current) {
        // Safely destroy wavesurfer without setTimeout
        try {
          // Check if wavesurfer still exists and has destroy method
          if (wavesurfer && typeof wavesurfer.destroy === 'function') {
            // Pause before destroying to avoid abort errors
            wavesurfer.pause();
            wavesurfer.destroy();
          }
        } catch (error: any) {
          // Silently ignore all destroy errors
          // These are expected when component unmounts during loading
        }
        wavesurferRef.current = null;
      }
    };
  }, [audioUrl]); // Removed volume from dependencies to avoid recreating on volume change

  // Handle volume changes separately
  useEffect(() => {
    if (wavesurferRef.current && !isMuted) {
      wavesurferRef.current.setVolume(volume);
    }
  }, [volume, isMuted]);

  const togglePlayPause = useCallback(() => {
    if (wavesurferRef.current) {
      wavesurferRef.current.playPause();
    }
  }, []);

  const restart = useCallback(() => {
    if (wavesurferRef.current) {
      // Restart from the configured start position
      const startPosition = previewStartSec / wavesurferRef.current.getDuration();
      wavesurferRef.current.seekTo(startPosition);
      wavesurferRef.current.play();
    }
  }, [previewStartSec]);

  const toggleMute = useCallback(() => {
    if (wavesurferRef.current) {
      if (isMuted) {
        wavesurferRef.current.setVolume(volume);
        setIsMuted(false);
      } else {
        wavesurferRef.current.setVolume(0);
        setIsMuted(true);
      }
    }
  }, [isMuted, volume]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // If no preview URL at all, show no preview message
  if (!audioUrl) {
    return (
      <div className="flex items-center justify-between h-16 px-4 py-2 bg-gradient-to-r from-gray-900/50 to-gray-800/50 rounded-lg border border-gray-800">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-400">
            {trackName || 'Track'}
          </span>
          <span className="text-xs text-gray-500">
            No preview available
          </span>
        </div>
        {spotifyUrl && (
          <motion.a
            href={spotifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg hover:bg-gray-700/50 transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <svg
              className="w-5 h-5 text-gray-400 hover:text-green-500"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
            </svg>
          </motion.a>
        )}
      </div>
    );
  }

  return (
    <motion.div
      className={cn(
        'relative overflow-hidden rounded-lg border border-gray-800 bg-gradient-to-r from-black via-gray-950 to-black',
        'shadow-lg shadow-yellow-500/10',
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Background glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-yellow-500/5 to-purple-500/5 animate-pulse" />
      
      {/* Main content */}
      <div className="relative px-3 py-2">
        {/* Track info */}
        <AnimatePresence>
          {isHovered && (trackName || artistName) && (
            <motion.div
              className="absolute -top-12 left-0 right-0 z-50 px-3 py-2 bg-black/95 backdrop-blur-sm border border-yellow-500/30 rounded-t-lg"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
            >
              <div className="flex justify-between items-start">
                <div>
                  {trackName && (
                    <p className="text-xs font-medium text-yellow-500 truncate">
                      {trackName}
                    </p>
                  )}
                  {artistName && (
                    <p className="text-xs text-gray-400 truncate">
                      {artistName}
                    </p>
                  )}
                </div>
                {popularity !== undefined && (
                  <div className="flex items-center gap-1">
                    <div className="w-8 h-1 bg-gray-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-yellow-500 to-purple-500"
                        style={{ width: `${popularity}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500">{popularity}</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-2">
          {/* Play/Pause button */}
          <motion.button
            onClick={togglePlayPause}
            className={cn(
              'relative flex items-center justify-center w-8 h-8 rounded-full',
              'bg-gradient-to-r from-yellow-500 to-yellow-600',
              'hover:from-yellow-400 hover:to-yellow-500',
              'transition-all duration-200',
              'shadow-lg shadow-yellow-500/30'
            )}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            disabled={isLoading}
          >
            {isLoading ? (
              <motion.div
                className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
            ) : isPlaying ? (
              <Pause className="w-4 h-4 text-black" />
            ) : (
              <Play className="w-4 h-4 text-black ml-0.5" />
            )}
          </motion.button>

          {/* Waveform container */}
          <div className="flex-1 min-w-0">
            <div 
              ref={containerRef} 
              className="w-full h-10 cursor-pointer"
              style={{ 
                filter: isLoading ? 'blur(2px)' : 'none',
                transition: 'filter 0.3s',
              }}
            />
            {!isLoading && (
              <div className="flex justify-between items-center mt-0.5">
                <span className="text-xs text-gray-500 tabular-nums">
                  {formatTime(currentTime)}
                </span>
                <span className="text-xs text-gray-500 tabular-nums">
                  {formatTime(duration)}
                </span>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1">
            {/* Restart button */}
            <motion.button
              onClick={restart}
              className="p-1.5 rounded-lg hover:bg-gray-800/50 transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <RotateCw className="w-3.5 h-3.5 text-gray-400 hover:text-yellow-500" />
            </motion.button>

            {/* Volume button */}
            <motion.button
              onClick={toggleMute}
              className="p-1.5 rounded-lg hover:bg-gray-800/50 transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              {isMuted ? (
                <VolumeX className="w-3.5 h-3.5 text-gray-400 hover:text-yellow-500" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-gray-400 hover:text-yellow-500" />
              )}
            </motion.button>

            {/* Spotify link */}
            {spotifyUrl && (
              <motion.a
                href={spotifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg hover:bg-gray-800/50 transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <svg
                  className="w-3.5 h-3.5 text-gray-400 hover:text-green-500"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                </svg>
              </motion.a>
            )}
          </div>
        </div>
      </div>

      {/* Progress bar overlay */}
      {isPlaying && (
        <motion.div
          className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-yellow-500 to-purple-500"
          style={{ width: `${(currentTime / duration) * 100}%` }}
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
    </motion.div>
  );
}

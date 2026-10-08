import { useEffect, useMemo, useState } from 'react'

interface PlaybackState { index: number | null; playing: boolean }
export const MESSAGE_DURATION = 1100
export type PlaybackEvent = { action: 'play'; trigger: 'manual' | 'automatic' } | { action: 'stop'; reason: 'manual' | 'completed' }

export function createPlaybackEventTracker() {
  let lastAutomatic: number | string | null = null
  let tracked = false
  return (event: PlaybackEvent, revision: number | string, emit?: (event: PlaybackEvent) => void) => {
    if (event.action === 'play' && event.trigger === 'automatic') {
      if (lastAutomatic === revision) return
      lastAutomatic = revision
    }
    if (event.action === 'play') tracked = true
    else if (!tracked) return
    else tracked = false
    emit?.(event)
  }
}

export function createSequencePlayback(onChange: (state: PlaybackState) => void, onEvent?: (event: PlaybackEvent) => void) {
  let timer: ReturnType<typeof setInterval> | undefined
  let index: number | null = null
  const dispose = () => { clearInterval(timer); timer = undefined }
  const stop = (reason: 'manual' | 'completed' = 'manual') => {
    dispose()
    if (index === null) return
    index = null
    onChange({ index, playing: false })
    onEvent?.({ action: 'stop', reason })
  }
  return {
    play(count: number, trigger: 'manual' | 'automatic' = 'manual') {
      dispose()
      if (count <= 0) { stop(); return }
      index = 0
      onChange({ index, playing: true })
      onEvent?.({ action: 'play', trigger })
      timer = setInterval(() => {
        if (index === null || index + 1 >= count) { stop('completed'); return }
        index++
        onChange({ index, playing: true })
      }, MESSAGE_DURATION)
    },
    stop, dispose,
  }
}

export function useSequencePlayback(messageCount: number, revision: number | string, enabled: boolean, onEvent?: (event: PlaybackEvent) => void, trackingRevision: number | string = revision) {
  const [state, setState] = useState<PlaybackState>({ index: null, playing: false })
  const [observePlayback] = useState(createPlaybackEventTracker)
  const playback = useMemo(() => createSequencePlayback(setState, event => observePlayback(event, trackingRevision, onEvent)), [setState, observePlayback, onEvent, trackingRevision])
  useEffect(() => {
    if (enabled && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) playback.play(messageCount, 'automatic')
    else playback.stop()
    return playback.dispose
  }, [playback, messageCount, revision, enabled])
  return { ...state, play: () => playback.play(messageCount), stop: () => playback.stop() }
}

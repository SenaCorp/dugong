import { useEffect, useMemo, useState } from 'react'

interface PlaybackState { index: number | null; playing: boolean }
export const MESSAGE_DURATION = 1100

export function createSequencePlayback(onChange: (state: PlaybackState) => void) {
  let timer: ReturnType<typeof setInterval> | undefined
  let index: number | null = null
  const dispose = () => { clearInterval(timer); timer = undefined }
  const stop = () => {
    dispose()
    if (index === null) return
    index = null
    onChange({ index, playing: false })
  }
  return {
    play(count: number) {
      dispose()
      if (count <= 0) { stop(); return }
      index = 0
      onChange({ index, playing: true })
      timer = setInterval(() => {
        if (index === null || index + 1 >= count) { stop(); return }
        index++
        onChange({ index, playing: true })
      }, MESSAGE_DURATION)
    },
    stop, dispose,
  }
}

export function useSequencePlayback(messageCount: number, revision: number | string, enabled: boolean) {
  const [state, setState] = useState<PlaybackState>({ index: null, playing: false })
  const playback = useMemo(() => createSequencePlayback(setState), [setState])
  useEffect(() => {
    if (enabled && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) playback.play(messageCount)
    else playback.stop()
    return playback.dispose
  }, [playback, messageCount, revision, enabled])
  return { ...state, play: () => playback.play(messageCount), stop: playback.stop }
}

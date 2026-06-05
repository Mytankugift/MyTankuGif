/** Duración en segundos (entero) de un archivo de video local */
export function getVideoDurationSeconds(file: File): Promise<number | null> {
  if (!file.type.startsWith('video/')) return Promise.resolve(null)

  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    const url = URL.createObjectURL(file)

    const cleanup = () => {
      URL.revokeObjectURL(url)
      video.removeAttribute('src')
      video.load()
    }

    video.onloadedmetadata = () => {
      const seconds = video.duration
      cleanup()
      if (Number.isFinite(seconds) && seconds > 0) {
        resolve(Math.ceil(seconds))
      } else {
        resolve(null)
      }
    }

    video.onerror = () => {
      cleanup()
      resolve(null)
    }

    video.src = url
  })
}

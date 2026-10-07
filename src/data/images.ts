import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getCachedImage, putCachedImage } from './cache'
import { getState, isStoragePath, newId } from './store'

const BUCKET = 'card-images'
export const MAX_WIDTH = 1200

/** Fit (w, h) inside maxWidth, never upscaling. */
export function fitWidth(w: number, h: number, maxWidth = MAX_WIDTH) {
  if (w <= maxWidth) return { width: w, height: h }
  return { width: maxWidth, height: Math.round((h * maxWidth) / w) }
}

/** Resize to ≤1200px wide and re-encode as WebP in the browser. SVG/GIF pass through untouched. */
export async function compressImage(file: Blob): Promise<Blob> {
  if (file.type === 'image/svg+xml' || file.type === 'image/gif') return file
  const bitmap = await createImageBitmap(file)
  const { width, height } = fitWidth(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()
  const webp = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.85))
  // Safari < 17 can't encode WebP and silently returns PNG; fall back to JPEG to keep files small.
  if (webp && webp.type === 'image/webp') return webp
  const jpeg = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85))
  if (!jpeg) throw new Error('Could not process this image')
  return jpeg
}

const EXT: Record<string, string> = {
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
}

/** Compress and upload; returns the storage path ("<uid>/<uuid>.webp"). */
export async function uploadImage(file: Blob): Promise<string> {
  const userId = getState().userId
  if (!userId) throw new Error('Not signed in')
  if (!navigator.onLine) throw new Error("You're offline. Images can be added once you're back online.")
  const blob = await compressImage(file)
  const path = `${userId}/${newId()}.${EXT[blob.type] ?? 'bin'}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: blob.type })
  if (error) throw new Error(`Upload failed: ${error.message}`)
  await putCachedImage(userId, path, blob)
  return path
}

const objectUrls = new Map<string, string>()

/** Resolve an image reference (storage path or plain URL) to something an <img> can show. */
export async function resolveImage(ref: string): Promise<string> {
  if (!isStoragePath(ref)) return ref
  const hit = objectUrls.get(ref)
  if (hit) return hit
  const blob = await fetchImageBlob(ref)
  const url = URL.createObjectURL(blob)
  objectUrls.set(ref, url)
  return url
}

/** Get the bytes of an image, from the local cache when possible. */
export async function fetchImageBlob(ref: string): Promise<Blob> {
  if (!isStoragePath(ref)) {
    const res = await fetch(ref)
    if (!res.ok) throw new Error(`Could not load ${ref}`)
    return res.blob()
  }
  const userId = getState().userId
  if (userId) {
    const cached = await getCachedImage(userId, ref)
    if (cached) return cached
  }
  const { data, error } = await supabase.storage.from(BUCKET).download(ref)
  if (error || !data) throw new Error(`Could not load image: ${error?.message ?? 'unknown error'}`)
  if (userId) await putCachedImage(userId, ref, data)
  return data
}

export function useImage(ref: string | null | undefined) {
  const [loaded, setLoaded] = useState<{ ref: string; src: string | null; failed: boolean } | null>(null)
  useEffect(() => {
    if (!ref) return
    let alive = true
    resolveImage(ref).then(
      (src) => alive && setLoaded({ ref, src, failed: false }),
      (err) => {
        console.warn('sketchcards: image failed to load', ref, err)
        if (alive) setLoaded({ ref, src: null, failed: true })
      },
    )
    return () => {
      alive = false
    }
  }, [ref])
  // Ignore results that belong to a previous ref.
  const current = ref && loaded?.ref === ref ? loaded : null
  return { src: current?.src ?? null, failed: current?.failed ?? false }
}

/** Read a pasted or dropped image from a clipboard/drag event, if any. */
export function imageFromDataTransfer(dt: DataTransfer | null): File | null {
  if (!dt) return null
  for (const item of dt.items) {
    if (item.kind === 'file' && item.type.startsWith('image/')) return item.getAsFile()
  }
  return null
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = () => reject(r.error)
    r.readAsDataURL(blob)
  })
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  return (await fetch(dataUrl)).blob()
}

let prefetching = false

/**
 * Download any uploaded images not yet cached, so a deck studies fine offline (e.g. on the iPad).
 * Best effort, one at a time, in the background.
 */
export async function prefetchImages(refs: (string | null)[]) {
  const userId = getState().userId
  if (prefetching || !userId || !navigator.onLine) return
  prefetching = true
  try {
    for (const ref of new Set(refs)) {
      if (!ref || !isStoragePath(ref) || !navigator.onLine || getState().userId !== userId) continue
      if (await getCachedImage(userId, ref)) continue
      await fetchImageBlob(ref).catch(() => {})
    }
  } finally {
    prefetching = false
  }
}

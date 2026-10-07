import { useEffect, useMemo, useRef } from 'react'
import CardImage from './CardImage'

/** The image state of one card side: the saved path, or a new local file not yet uploaded. */
export interface ImageValue {
  path: string | null
  file: Blob | null
}

export default function ImagePicker({
  value,
  onChange,
  label,
}: {
  value: ImageValue
  onChange: (v: ImageValue) => void
  label: string
}) {
  const input = useRef<HTMLInputElement>(null)
  const preview = useMemo(() => (value.file ? URL.createObjectURL(value.file) : null), [value.file])
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview])
  const has = value.file || value.path

  return (
    <div className="image-slot">
      {preview ? (
        <img src={preview} alt={`${label} preview`} className="image-thumb" />
      ) : (
        value.path && <CardImage src={value.path} alt={label} className="image-thumb" />
      )}
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onChange({ path: value.path, file: f })
          e.target.value = ''
        }}
      />
      <button type="button" className="btn small" onClick={() => input.current?.click()}>
        {has ? 'Replace image' : 'Add image'}
      </button>
      {has && (
        <button type="button" className="btn small ghost" onClick={() => onChange({ path: null, file: null })}>
          Remove
        </button>
      )}
      {!has && <span className="muted" style={{ fontSize: '0.8rem' }}>or paste with ⌘/Ctrl+V</span>}
    </div>
  )
}

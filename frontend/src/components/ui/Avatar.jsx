import { useState } from 'react'

export default function Avatar({ src, name, size = 'md' }) {
  const [imgError, setImgError] = useState(false)
  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-base',
    xl: 'w-20 h-20 text-xl',
  }
  const initials = name
    ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={name || 'Avatar'}
        className={`${sizes[size]} rounded-full object-cover flex-shrink-0 bg-brand-100`}
        onError={() => setImgError(true)}
      />
    )
  }

  return (
    <div
      className={`${sizes[size]} rounded-full bg-brand-100 text-brand-700 font-semibold flex items-center justify-center flex-shrink-0 select-none`}
    >
      {initials}
    </div>
  )
}

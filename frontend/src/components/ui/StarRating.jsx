import { useState } from 'react'
import { HiStar } from 'react-icons/hi'

export function StarDisplay({ rating, count }) {
  const r = parseFloat(rating) || 0
  return (
    <div className="flex items-center gap-1">
      {[1,2,3,4,5].map(i => (
        <HiStar key={i} className={`w-4 h-4 ${i <= Math.round(r) ? 'text-amber-400' : 'text-slate-200'}`} />
      ))}
      {count !== undefined && <span className="text-xs text-slate-500 ml-1">({count})</span>}
    </div>
  )
}

export function StarPicker({ value, onChange }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(i => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          className="transition-transform hover:scale-110"
        >
          <HiStar className={`w-8 h-8 ${i <= (hover || value) ? 'text-amber-400' : 'text-slate-200'}`} />
        </button>
      ))}
    </div>
  )
}

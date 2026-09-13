export default function Spinner({ className = '' }) {
  return (
    <div className={`w-6 h-6 border-3 border-brand-600 border-t-transparent rounded-full animate-spin ${className}`}
      style={{ borderWidth: '3px' }} />
  )
}

export function PageSpinner() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

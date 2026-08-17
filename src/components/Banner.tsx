type Props = {
  kind: 'error' | 'notice'
  title: string
  detail?: string
  onDismiss?: () => void
}

export function Banner({ kind, title, detail, onDismiss }: Props) {
  return (
    <div className={`banner ${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      <div>
        <strong>{title}</strong>
        {detail && <p>{detail}</p>}
      </div>
      {onDismiss && (
        <button className="banner-close" onClick={onDismiss} aria-label="Dismiss">
          ×
        </button>
      )}
    </div>
  )
}

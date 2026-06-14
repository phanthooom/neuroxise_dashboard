function parseAsUTC(isoStr: string): Date {
  const s =
    isoStr.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(isoStr)
      ? isoStr
      : isoStr + 'Z'
  return new Date(s)
}

export function formatRelative(isoStr: string | null | undefined): string {
  if (!isoStr) return '—'
  try {
    const d = parseAsUTC(isoStr)
    const now = new Date()
    const diff = Math.floor((now.getTime() - d.getTime()) / 86400000)
    if (diff === 0) return 'Today'
    if (diff === 1) return 'Yesterday'
    return `${diff}d ago`
  } catch {
    return '—'
  }
}

export function formatDate(isoStr: string | null | undefined): string {
  if (!isoStr) return '—'
  try {
    const d = parseAsUTC(isoStr)
    return new Intl.DateTimeFormat('en', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d)
  } catch {
    return '—'
  }
}

export function formatDateTime(isoStr: string | null | undefined): string {
  if (!isoStr) return '—'
  try {
    const d = parseAsUTC(isoStr)
    return new Intl.DateTimeFormat('en', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d)
  } catch {
    return '—'
  }
}

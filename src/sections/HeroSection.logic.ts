export const CRUISING_ALTITUDES = [
  38_000,
  39_000,
  40_000,
  39_000,
  38_000,
  37_000,
  36_000,
  37_000,
] as const

const taipeiTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Taipei',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

export function formatTaipeiTime(date: Date) {
  return taipeiTimeFormatter.format(date)
}

export function nextAltitudeIndex(index: number) {
  return (index + 1) % CRUISING_ALTITUDES.length
}

export function boardingProgress(offset: number, travel: number) {
  if (travel <= 0) return 0
  return Math.min(Math.max(offset / travel, 0), 1)
}

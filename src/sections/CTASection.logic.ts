interface TakeoffProgressInput {
  sectionTop: number
  sectionHeight: number
  viewportHeight: number
}

export function takeoffProgress({
  sectionTop,
  sectionHeight,
  viewportHeight,
}: TakeoffProgressInput) {
  const distance = sectionHeight + viewportHeight
  if (distance <= 0) return 0
  return Math.min(Math.max((viewportHeight - sectionTop) / distance, 0), 1)
}

export function takeoffPointPercent(progress: number) {
  const boundedProgress = Math.min(Math.max(progress, 0), 1)
  return 90 - boundedProgress * 84
}

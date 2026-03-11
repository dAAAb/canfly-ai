const DEFAULT_GRADIENT = 'linear-gradient(135deg, hsl(220,15%,50%) 0%, hsl(240,15%,45%) 100%)'

export function walletGradient(address?: string | null): string {
  if (!address || address.length < 22) return DEFAULT_GRADIENT

  const h1 = parseInt(address.slice(2, 10), 16) % 360
  const h2 = parseInt(address.slice(10, 18), 16) % 360
  const s = 60 + (parseInt(address.slice(18, 20), 16) % 20)
  const l = 45 + (parseInt(address.slice(20, 22), 16) % 15)

  return `linear-gradient(135deg, hsl(${h1},${s}%,${l}%) 0%, hsl(${h2},${s}%,${l}%) 100%)`
}

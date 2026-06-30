const COMMON_DOMAINS = [
  'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com',
  'icloud.com', 'live.com', 'aol.com', 'protonmail.com',
]

function levenshteinDistance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[a.length][b.length]
}

export function suggestEmailCorrection(email: string): string | null {
  const atIndex = email.lastIndexOf('@')
  if (atIndex === -1) return null
  const domain = email.slice(atIndex + 1).toLowerCase()
  if (COMMON_DOMAINS.includes(domain)) return null

  for (const known of COMMON_DOMAINS) {
    if (levenshteinDistance(domain, known) <= 2) {
      return email.slice(0, atIndex + 1) + known
    }
  }
  return null
}

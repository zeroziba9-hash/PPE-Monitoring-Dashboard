export async function fetchLatestAlerts() {
  const response = await fetch('/api/alerts/latest')
  if (!response.ok) {
    throw new Error(`Failed to fetch alerts: ${response.status}`)
  }

  const data = await response.json()
  if (!Array.isArray(data)) return []
  return data
}

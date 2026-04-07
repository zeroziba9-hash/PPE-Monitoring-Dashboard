export async function fetchLatestAlerts() {
  const response = await fetch('/api/alerts/latest')
  if (!response.ok) {
    throw new Error(`Failed to fetch alerts: ${response.status}`)
  }

  const data = await response.json()
  if (!Array.isArray(data)) return []
  return data
}

export async function patchAlertStatus(alertId, payload) {
  const response = await fetch(`/api/alerts/${alertId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(`Failed to update alert status: ${response.status}`)
  }

  return response.json()
}

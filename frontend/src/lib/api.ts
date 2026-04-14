/// <reference types="vite/client" />
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000"

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem("token")
  
  const headers = new Headers(options.headers || {})
  headers.set("Content-Type", "application/json")
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`)
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  })

  // handle 204 no content
  if (response.status === 204) {
    return null
  }

  const data = await response.json()

  if (!response.ok) {
    throw data
  }

  return data
}

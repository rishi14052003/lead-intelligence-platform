import config from "../config"

const BASE_URL = config.api.baseURL

export const searchLeads = async (query: string) => {
  const res = await fetch(`${BASE_URL}/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  })

  if (!res.ok) {
    throw new Error("Failed to fetch leads")
  }

  return res.json()
}
const BASE_URL = "https://lead-intelligence-platform.onrender.com"

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
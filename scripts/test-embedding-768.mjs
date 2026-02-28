import { config } from 'dotenv'
config({ path: '.env.local' })

const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY
const res = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${key}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'models/gemini-embedding-001',
      content: { parts: [{ text: 'Tuleja aluminiowa 6061 do tokarki CNC' }] },
      outputDimensionality: 768,
    }),
  }
)
const data = await res.json()
if (data.embedding?.values) {
  console.log('Dimensions:', data.embedding.values.length)
  console.log('First 5:', data.embedding.values.slice(0, 5))
} else {
  console.log('Error:', JSON.stringify(data, null, 2))
}

import { config } from 'dotenv'
config({ path: '.env.local' })

const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY
const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`)
const data = await res.json()

const embedModels = data.models.filter(m =>
  m.supportedGenerationMethods?.includes('embedContent')
)

for (const m of embedModels) {
  console.log(m.name, '—', m.displayName, '—', m.supportedGenerationMethods.join(', '))
}

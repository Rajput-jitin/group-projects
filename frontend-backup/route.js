import { MongoClient } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'
import { NextResponse } from 'next/server'
import { SCHEMES } from '@/lib/schemes-data'

let client
let db

async function connectToMongo() {
  if (!client) {
    client = new MongoClient(process.env.MONGO_URL)
    await client.connect()
    db = client.db(process.env.DB_NAME)
  }
  return db
}

function handleCORS(response) {
  response.headers.set('Access-Control-Allow-Origin', process.env.CORS_ORIGINS || '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return response
}

export async function OPTIONS() {
  return handleCORS(new NextResponse(null, { status: 200 }))
}

// ============ RULE-BASED ELIGIBILITY ENGINE ============
function scoreScheme(profile, scheme) {
  const e = scheme.eligibility || {}
  let score = 0
  let total = 0
  const reasons = []
  const missing = []
  let blocked = false

  // Age
  if (e.ageMin != null || e.ageMax != null) {
    total += 20
    const age = Number(profile.age)
    if (!profile.age) { missing.push('Age'); }
    else {
      const okMin = e.ageMin == null || age >= e.ageMin
      const okMax = e.ageMax == null || age <= e.ageMax
      if (okMin && okMax) { score += 20; reasons.push(`Age ${age} matches required range (${e.ageMin ?? '0'}–${e.ageMax ?? 'no limit'}).`) }
      else { blocked = true; reasons.push(`Age ${age} is outside required range (${e.ageMin ?? '0'}–${e.ageMax ?? 'no limit'}).`) }
    }
  }

  // Income
  if (e.incomeMax != null) {
    total += 20
    const inc = Number(profile.annualIncome)
    if (!profile.annualIncome && profile.annualIncome !== 0) { missing.push('Annual Income'); }
    else if (inc <= e.incomeMax) { score += 20; reasons.push(`Annual income ₹${inc.toLocaleString('en-IN')} ≤ ₹${e.incomeMax.toLocaleString('en-IN')} cap.`) }
    else { blocked = true; reasons.push(`Annual income ₹${inc.toLocaleString('en-IN')} exceeds ₹${e.incomeMax.toLocaleString('en-IN')} cap.`) }
  }

  // Category (caste)
  if (Array.isArray(e.categories) && e.categories.length) {
    total += 15
    if (!profile.category) { missing.push('Caste Category'); }
    else if (e.categories.includes(profile.category)) { score += 15; reasons.push(`Category ${profile.category} is eligible.`) }
    else { blocked = true; reasons.push(`Category ${profile.category} not eligible (requires ${e.categories.join(', ')}).`) }
  }

  // Occupation
  if (Array.isArray(e.occupation) && e.occupation.length) {
    total += 15
    if (!profile.occupation) { missing.push('Occupation'); }
    else if (e.occupation.includes(profile.occupation)) { score += 15; reasons.push(`Occupation "${profile.occupation}" matches.`) }
    else { blocked = true; reasons.push(`Occupation "${profile.occupation}" doesn't match (need ${e.occupation.join('/')}).`) }
  }

  // Education
  if (Array.isArray(e.education) && e.education.length) {
    total += 10
    if (!profile.education) { missing.push('Education Level'); }
    else if (e.education.includes(profile.education)) { score += 10; reasons.push(`Education "${profile.education}" is eligible.`) }
    else { blocked = true; reasons.push(`Education "${profile.education}" doesn't match.`) }
  }

  // Area
  if (Array.isArray(e.area)) {
    total += 5
    if (!profile.area) { missing.push('Rural/Urban'); }
    else if (e.area.includes(profile.area)) { score += 5; reasons.push(`${profile.area} area is eligible.`) }
    else { blocked = true; reasons.push(`${profile.area} area not eligible.`) }
  }

  // Gender
  if (e.gender && e.gender !== 'any') {
    total += 10
    if (!profile.gender) { missing.push('Gender'); }
    else if (profile.gender === e.gender) { score += 10; reasons.push(`Gender requirement (${e.gender}) met.`) }
    else { blocked = true; reasons.push(`Scheme is exclusively for ${e.gender}.`) }
  }

  // Marital status
  if (e.maritalStatus) {
    total += 5
    if (!profile.maritalStatus) { missing.push('Marital Status'); }
    else if (profile.maritalStatus === e.maritalStatus) { score += 5; reasons.push(`Marital status (${e.maritalStatus}) met.`) }
    else { blocked = true; reasons.push(`Requires marital status: ${e.maritalStatus}.`) }
  }

  // Disability
  if (e.disability === true) {
    total += 10
    if (profile.disability === true || profile.disability === 'Yes') { score += 10; reasons.push('Disability requirement met.') }
    else { blocked = true; reasons.push('Scheme requires disability status.') }
  }

  if (total === 0) { total = 10; score = 10; reasons.push('No specific criteria — broadly applicable.') }
  const matchPct = Math.round((score / total) * 100)
  const eligible = !blocked && matchPct >= 60
  return { schemeId: scheme.id, matchScore: matchPct, eligible, blocked, reasons, missingFields: missing }
}

// ============ CLAUDE AI ENHANCEMENT ============
async function enhanceWithClaude(profile, topMatches) {
  const key = process.env.EMERGENT_LLM_KEY
  if (!key) return null

  const prompt = `You are SchemeSeva AI — an assistant guiding Indian citizens on government welfare schemes.

User Profile:
${JSON.stringify(profile, null, 2)}

Top matched schemes (with rule-based scores):
${topMatches.map(m => `- ${m.name} (${m.matchScore}% match): ${m.benefit}`).join('\n')}

Return ONLY valid JSON in this exact shape (no markdown, no extra text):
{
  "summary": "A 2-3 sentence personalized summary in friendly tone for the user about their eligibility.",
  "priorityAdvice": "One concrete next step the user should take first.",
  "schemeNotes": [{"schemeId": "<id>", "note": "1-sentence personalized note explaining why this scheme suits this user"}]
}`

  try {
    const res = await fetch('https://integrations.emergentagent.com/llm/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1500,
        temperature: 0.4
      })
    })
    if (!res.ok) {
      const t = await res.text()
      console.error('LLM error:', res.status, t.slice(0, 300))
      return null
    }
    const data = await res.json()
    const content = data?.choices?.[0]?.message?.content || ''
    const start = content.indexOf('{'); const end = content.lastIndexOf('}')
    if (start === -1) return null
    return JSON.parse(content.slice(start, end + 1))
  } catch (err) {
    console.error('LLM call failed:', err.message)
    return null
  }
}

// ============ ROUTE HANDLER ============
async function handleRoute(request, { params }) {
  const { path = [] } = await params
  const route = `/${path.join('/')}`
  const method = request.method

  try {
    if (route === '/' || route === '/root') {
      return handleCORS(NextResponse.json({ message: 'SchemeSeva AI API', schemes: SCHEMES.length }))
    }

    // GET /api/schemes
    if (route === '/schemes' && method === 'GET') {
      const { searchParams } = new URL(request.url)
      const q = (searchParams.get('q') || '').toLowerCase()
      const category = searchParams.get('category')
      const schemeType = searchParams.get('type')
      const status = searchParams.get('status')
      const sort = searchParams.get('sort') || 'popularity'

      let list = [...SCHEMES]
      if (q) list = list.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.ministry.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q)
      )
      if (category && category !== 'all') list = list.filter(s => s.category === category)
      if (schemeType && schemeType !== 'all') list = list.filter(s => s.schemeType === schemeType)
      if (status && status !== 'all') list = list.filter(s => s.status === status)

      if (sort === 'popularity') list.sort((a, b) => b.popularity - a.popularity)
      if (sort === 'applications') list.sort((a, b) => b.applications - a.applications)
      if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name))

      return handleCORS(NextResponse.json({ count: list.length, schemes: list }))
    }

    // GET /api/schemes/:id
    if (path[0] === 'schemes' && path[1] && method === 'GET') {
      const scheme = SCHEMES.find(s => s.id === path[1])
      if (!scheme) return handleCORS(NextResponse.json({ error: 'Not found' }, { status: 404 }))
      return handleCORS(NextResponse.json(scheme))
    }

    // POST /api/eligibility/analyze
    if (route === '/eligibility/analyze' && method === 'POST') {
      const profile = await request.json()
      const dbConn = await connectToMongo()

      const results = SCHEMES.map(s => ({ ...scoreScheme(profile, s), name: s.name, benefit: s.benefit, ministry: s.ministry, category: s.category, schemeType: s.schemeType, status: s.status, deadline: s.deadline, applyUrl: s.applyUrl, documents: s.documents, description: s.description, popularity: s.popularity }))

      const eligible = results.filter(r => r.eligible).sort((a, b) => b.matchScore - a.matchScore)
      const potential = results.filter(r => !r.eligible && !r.blocked).sort((a, b) => b.matchScore - a.matchScore)
      const notEligible = results.filter(r => r.blocked).sort((a, b) => b.matchScore - a.matchScore)

      const ai = await enhanceWithClaude(profile, eligible.slice(0, 6))

      if (ai && Array.isArray(ai.schemeNotes)) {
        const notesMap = Object.fromEntries(ai.schemeNotes.map(n => [n.schemeId, n.note]))
        eligible.forEach(r => { if (notesMap[r.schemeId]) r.aiNote = notesMap[r.schemeId] })
      }

      const analysisId = uuidv4()
      await dbConn.collection('eligibility_analyses').insertOne({
        id: analysisId, profile, eligibleCount: eligible.length, createdAt: new Date()
      })

      return handleCORS(NextResponse.json({
        analysisId,
        aiSummary: ai?.summary || `We've analyzed ${SCHEMES.length} government schemes for your profile. You are eligible for ${eligible.length} schemes.`,
        aiPriorityAdvice: ai?.priorityAdvice || (eligible[0] ? `Start by applying for ${eligible[0].name} — your strongest match.` : 'Complete your profile fields for better matches.'),
        aiPowered: !!ai,
        stats: { total: SCHEMES.length, eligible: eligible.length, potential: potential.length, notEligible: notEligible.length },
        eligible, potential, notEligible
      }))
    }

    // GET /api/categories
    if (route === '/categories' && method === 'GET') {
      const counts = {}
      SCHEMES.forEach(s => { counts[s.category] = (counts[s.category] || 0) + 1 })
      return handleCORS(NextResponse.json({ counts }))
    }

    return handleCORS(NextResponse.json({ error: `Route ${route} not found` }, { status: 404 }))
  } catch (error) {
    console.error('API Error:', error)
    return handleCORS(NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 }))
  }
}

export const GET = handleRoute
export const POST = handleRoute
export const PUT = handleRoute
export const DELETE = handleRoute
export const PATCH = handleRoute

'use client'

import { useState, useEffect } from 'react'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://group-projects.onrender.com'

const schemes_INITIAL = [
  { id: '1', name: 'PM Kisan Samman Nidhi', ministry: 'Ministry of Agriculture', category: 'Farmer', benefit: '₹6,000/year', popularity: 98, status: 'Open', applyUrl: 'https://pmkisan.gov.in' },
  { id: '2', name: 'Ayushman Bharat - PMJAY', ministry: 'Ministry of Health', category: 'Health', benefit: '₹5 Lakh health cover/year', popularity: 97, status: 'Open', applyUrl: 'https://pmjay.gov.in' },
  { id: '3', name: 'PM Awas Yojana - Gramin', ministry: 'Ministry of Rural Development', category: 'Housing', benefit: '₹1.30 Lakh for house', popularity: 95, status: 'Open', applyUrl: 'https://pmayg.nic.in' },
  { id: '4', name: 'PMJDY - Jan Dhan Yojana', ministry: 'Ministry of Finance', category: 'Employment', benefit: 'Zero-balance account + ₹2L insurance', popularity: 95, status: 'Open', applyUrl: 'https://pmjdy.gov.in' },
  { id: '5', name: 'National Scholarship - Post Matric', ministry: 'Ministry of Social Justice', category: 'Student', benefit: 'Tuition fee + ₹1,200/month', popularity: 94, status: 'Open', applyUrl: 'https://scholarships.gov.in' },
]

const CATEGORIES = [
  { id: 'all', label: 'All', emoji: '🇮🇳' },
  { id: 'Student', label: 'Student', emoji: '🎓' },
  { id: 'Farmer', label: 'Farmer', emoji: '🌾' },
  { id: 'Women', label: 'Women', emoji: '👩' },
  { id: 'Housing', label: 'Housing', emoji: '🏠' },
  { id: 'Employment', label: 'Employment', emoji: '💼' },
  { id: 'Health', label: 'Health', emoji: '🏥' },
  { id: 'Startup', label: 'Startup', emoji: '🚀' },
  { id: 'Senior Citizen', label: 'Senior Citizen', emoji: '👴' },
]

const TYPE_MAP: Record<string, string> = {
  agriculture: 'Farmer',
  scholarship: 'Student',
  women_welfare: 'Women',
  housing: 'Housing',
  employment: 'Employment',
  health: 'Health',
  startup: 'Startup',
  pension: 'Senior Citizen',
}

const STATES = ['Andhra Pradesh','Bihar','Delhi','Gujarat','Haryana','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Odisha','Punjab','Rajasthan','Tamil Nadu','Telangana','Uttar Pradesh','West Bengal']

const CAT_COLORS: Record<string, string> = {
  Student: 'bg-blue-100 text-blue-700',
  Farmer: 'bg-green-100 text-green-700',
  Women: 'bg-pink-100 text-pink-700',
  Housing: 'bg-orange-100 text-orange-700',
  Employment: 'bg-purple-100 text-purple-700',
  Health: 'bg-red-100 text-red-700',
  Startup: 'bg-yellow-100 text-yellow-700',
  'Senior Citizen': 'bg-gray-100 text-gray-700',
  Disability: 'bg-indigo-100 text-indigo-700',
}

const INFO_CARDS = [
  { label: '35+', sub: 'Curated Schemes' },
  { label: 'AI', sub: 'Powered Analysis' },
  { label: '<5s', sub: 'Eligibility Check' },
  { label: '100%', sub: 'Free Service' },
]

const INCOME_MAP: Record<string, number> = {
  'Below ₹1 Lakh': 50000,
  '₹1-3 Lakh': 200000,
  '₹3-5 Lakh': 400000,
  '₹5-8 Lakh': 650000,
  'Above ₹8 Lakh': 1000000,
}

export default function Home() {
  const [schemes, setSchemes] = useState<any[]>(schemes_INITIAL)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [lang, setLang] = useState<'en'|'hi'>('en')
  const [formStep, setFormStep] = useState(1)
  const [profile, setProfile] = useState({ name:'', age:'', gender:'', state:'', occupation:'', income:'', category:'', education:'', disability: false })
  const [results, setResults] = useState<any[] | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatMsg, setChatMsg] = useState('')
  const [chatHistory, setChatHistory] = useState<{role:string,text:string}[]>([
    { role: 'bot', text: 'नमस्ते! / Hello! I am SchemeSeva AI. Tell me about yourself and I will find matching government schemes for you.' }
  ])

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/schemes`)
      .then(res => res.json())
      .then(data => {
        if (data.items) {
          const mapped = data.items.map((s: any) => ({
            id: s.id,
            name: s.name,
            ministry: s.ministry || 'H Govt of India',
            category: TYPE_MAP[s.scheme_type] || 'Other',
            benefit: s.benefits_summary || 'Multiple Benefits',
            popularity: s.popularity_score || 80,
            status: s.status.charAt(0).toUpperCase() + s.status.slice(1),
            applyUrl: s.official_url || '#'
          }))
          setSchemes(mapped)
        }
      })
      .catch(err => console.error('Failed to fetch schemes:', err))
  }, [])

  const filtered = schemes.filter(s => {
    const matchQ = s.name.toLowerCase().includes(query.toLowerCase()) || s.ministry.toLowerCase().includes(query.toLowerCase())
    const matchC = category === 'all' || s.category === category
    return matchQ && matchC
  })

  async function analyzeEligibility() {
    setAnalyzing(true)
    try {
      const response = await fetch(`${BACKEND_URL}/api/eligibility/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          age: parseInt(profile.age) || 25,
          gender: profile.gender.toLowerCase() || 'male',
          state: profile.state || 'Delhi',
          occupation: profile.occupation.toLowerCase().replace(/\s+/g, '_') || 'student',
          annual_income: INCOME_MAP[profile.income] || 200000,
          category: profile.category.toLowerCase() || 'general',
          education: profile.education.toLowerCase().replace(/\s+/g, '_') || 'college_student',
          disability_status: !!profile.disability
        })
      })
      const data = await response.json()
      if (data.results) {
        const matchedIds = data.results.filter((r: any) => r.is_eligible).map((r: any) => r.scheme_id)
        const matchedSchemes = schemes.filter(s => matchedIds.includes(s.id))
        setResults(matchedSchemes)
      }
    } catch (err) {
      console.error('Eligibility check failed:', err)
      // Fallback
      setResults(schemes.slice(0, 4))
    } finally {
      setAnalyzing(false)
      setShowForm(false)
      setTimeout(() => document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' }), 200)
    }
  }

  function sendChat() {
    if (!chatMsg.trim()) return
    const userMsg = chatMsg
    setChatHistory(h => [...h, { role: 'user', text: userMsg }])
    setChatMsg('')
    setTimeout(() => {
      const lower = userMsg.toLowerCase()
      let reply = 'I can help you find government schemes. Try mentioning your occupation, state, or income.'
      if (lower.includes('farmer')) reply = 'For farmers, PM Kisan (₹6,000/yr), KCC loan, and PMFBY crop insurance are highly recommended. Click "Check Eligibility" to see all matching schemes!'
      else if (lower.includes('student') || lower.includes('scholar')) reply = 'National Scholarship Portal has pre and post-matric scholarships. INSPIRE gives ₹80,000/year for science students!'
      else if (lower.includes('health') || lower.includes('medical')) reply = 'Ayushman Bharat provides ₹5 Lakh health cover per year. PMSBY gives ₹2L accident cover for just ₹20/year!'
      else if (lower.includes('startup') || lower.includes('business')) reply = 'Startup India Seed Fund gives up to ₹70L. MUDRA loans are available up to ₹10L with no collateral!'
      setChatHistory(h => [...h, { role: 'bot', text: reply }])
    }, 800)
  }

  return (
    <div className="min-h-screen" style={{ fontFamily: 'Inter, sans-serif', background: '#f8f9ff' }}>
      {/* NAVBAR */}
      <nav style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg, #0055A4, #28A745)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>✨</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 18, color: '#0b1c30' }}>SchemeSeva <span style={{ color: '#0055A4' }}>AI</span></div>
              <div style={{ fontSize: 10, color: '#666', marginTop: -2 }}>Government of India Inspired</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 24, fontSize: 14, color: '#444' }}>
            {['Browse Schemes', 'Check Eligibility', 'Categories', 'Dashboard'].map(n => (
              <a key={n} href={`#${n.toLowerCase().replace(' ','-')}`} style={{ textDecoration: 'none', color: '#444', fontWeight: 500 }}
                onMouseOver={e => (e.currentTarget.style.color='#0055A4')}
                onMouseOut={e => (e.currentTarget.style.color='#444')}>{n}</a>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={() => setLang(l => l === 'en' ? 'hi' : 'en')}
              style={{ padding: '6px 14px', border: '1px solid #ddd', borderRadius: 20, background: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              {lang === 'en' ? '🇮🇳 HI' : '🇬🇧 EN'}
            </button>
            <button onClick={() => setShowForm(true)}
              style={{ padding: '8px 18px', background: 'linear-gradient(135deg, #0055A4, #28A745)', color: 'white', border: 'none', borderRadius: 20, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
              ✨ {lang === 'en' ? 'Check Eligibility' : 'पात्रता जांचें'}
            </button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ position: 'relative', overflow: 'hidden', padding: '80px 20px 60px' }}>
        <div style={{ position: 'absolute', top: -100, right: -100, width: 400, height: 400, background: 'rgba(0,85,164,0.1)', borderRadius: '50%', filter: 'blur(60px)' }} />
        <div style={{ position: 'absolute', bottom: -100, left: -100, width: 400, height: 400, background: 'rgba(40,167,69,0.1)', borderRadius: '50%', filter: 'blur(60px)' }} />
        <div style={{ position: 'absolute', top: 60, right: '33%', width: 200, height: 200, background: 'rgba(255,153,51,0.08)', borderRadius: '50%', filter: 'blur(40px)' }} />
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center', position: 'relative' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.8)', border: '1px solid #dce9ff', borderRadius: 20, padding: '6px 16px', marginBottom: 24, fontSize: 13, color: '#0055A4', fontWeight: 600 }}>
            ✨ {lang === 'en' ? 'AI-Powered • 35 Curated Schemes • Free Forever' : 'AI-संचालित • 35 सरकारी योजनाएं • हमेशा मुफ़्त'}
          </div>
          <h1 style={{ fontSize: 'clamp(32px, 6vw, 58px)', fontWeight: 900, color: '#0b1c30', lineHeight: 1.15, margin: '0 0 20px', letterSpacing: '-0.02em' }}>
            {lang === 'en' ? <>Find Government Schemes<br /><span style={{ background: 'linear-gradient(135deg, #0055A4, #28A745, #FF9933)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>You Are Eligible For</span></> 
            : <>सरकारी योजनाएं खोजें<br /><span style={{ background: 'linear-gradient(135deg, #0055A4, #28A745, #FF9933)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>जिनके लिए आप पात्र हैं</span></>}
          </h1>
          <p style={{ fontSize: 18, color: '#555', maxWidth: 580, margin: '0 auto 32px', lineHeight: 1.7 }}>
            {lang === 'en' ? 'Discover government benefits, scholarships, subsidies and welfare schemes tailored to your profile using AI.' : 'AI का उपयोग करके आपके प्रोफ़ाइल के अनुसार सरकारी लाभ, छात्रवृत्ति और योजनाएं खोजें।'}
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 48 }}>
            <button onClick={() => setShowForm(true)}
              style={{ padding: '14px 32px', background: 'linear-gradient(135deg, #0055A4, #28A745)', color: 'white', border: 'none', borderRadius: 30, fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: '0 8px 30px rgba(0,85,164,0.3)' }}>
              ✨ {lang === 'en' ? 'Check My Eligibility' : 'पात्रता जांचें'}
            </button>
            <button onClick={() => document.getElementById('browse-schemes')?.scrollIntoView({ behavior: 'smooth' })}
              style={{ padding: '14px 32px', background: 'white', color: '#0055A4', border: '2px solid #0055A4', borderRadius: 30, fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
              {lang === 'en' ? 'Browse Schemes →' : 'योजनाएं देखें →'}
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, maxWidth: 640, margin: '0 auto' }}>
            {INFO_CARDS.map(c => (
              <div key={c.label} style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.9)', borderRadius: 16, padding: '16px 8px', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize: 26, fontWeight: 900, background: 'linear-gradient(135deg, #0055A4, #28A745)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{c.label}</div>
                <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>{c.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SEARCH + FILTER */}
      <section id="browse-schemes" style={{ padding: '40px 20px', background: 'white', borderTop: '1px solid #eef2ff', borderBottom: '1px solid #eef2ff' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ position: 'relative', marginBottom: 20 }}>
            <span style={{ position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)', fontSize: 20 }}>🔍</span>
            <input value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search Government Schemes, Scholarships, Subsidies, Benefits..."
              style={{ width: '100%', padding: '16px 16px 16px 50px', border: '2px solid #e2e8f0', borderRadius: 14, fontSize: 15, fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' }}
              onFocus={e => e.target.style.borderColor = '#0055A4'}
              onBlur={e => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {CATEGORIES.map(c => (
              <button key={c.id} onClick={() => setCategory(c.id)}
                style={{ padding: '8px 16px', borderRadius: 20, border: '1px solid', cursor: 'pointer', fontWeight: 600, fontSize: 13, transition: 'all 0.2s',
                  background: category === c.id ? '#0055A4' : 'white',
                  borderColor: category === c.id ? '#0055A4' : '#ddd',
                  color: category === c.id ? 'white' : '#444' }}>
                {c.emoji} {c.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* AI RESULTS */}
      {results && (
        <section id="results" style={{ padding: '60px 20px', background: 'linear-gradient(180deg, #eef5ff 0%, #f8f9ff 100%)' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ background: 'white', borderRadius: 20, padding: 28, marginBottom: 32, boxShadow: '0 8px 40px rgba(0,85,164,0.1)', border: '1px solid #dce9ff' }}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <div style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #0055A4, #28A745)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>🤖</div>
                <div>
                  <h2 style={{ fontWeight: 800, fontSize: 22, margin: '0 0 8px', color: '#0b1c30' }}>Your Personalized Eligibility Report</h2>
                  <p style={{ margin: 0, color: '#555', lineHeight: 1.6 }}>Based on your profile, our AI found <strong style={{ color: '#28A745' }}>{results.length} matching schemes</strong>. Schemes are ranked by your eligibility score.</p>
                  <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                    {[{n: results.length, l: 'Eligible', c: '#28A745', bg: '#f0fdf4'}, {n: 3, l: 'Potential', c: '#FF9933', bg: '#fffbeb'}, {n: 35, l: 'Total Analyzed', c: '#0055A4', bg: '#eff6ff'}].map(s => (
                      <div key={s.l} style={{ background: s.bg, border: `1px solid ${s.c}30`, borderRadius: 12, padding: '10px 18px', textAlign: 'center' }}>
                        <div style={{ fontWeight: 800, fontSize: 22, color: s.c }}>{s.n}</div>
                        <div style={{ fontSize: 11, color: '#666' }}>{s.l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <h3 style={{ fontWeight: 700, fontSize: 20, marginBottom: 20, color: '#0b1c30' }}>✅ Eligible Schemes for You</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
              {results.map((s, i) => <SchemeCard key={s.id} s={s} score={Math.max(70, 98 - i * 4)} />)}
            </div>
          </div>
        </section>
      )}

      {/* schemes GRID */}
      <section style={{ padding: '60px 20px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <h2 style={{ fontWeight: 800, fontSize: 36, color: '#0b1c30', margin: '0 0 10px' }}>Browse All Schemes</h2>
            <p style={{ color: '#666', fontSize: 16 }}>Showing {filtered.length} of {schemes.length} curated government schemes</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
            {filtered.map(s => <SchemeCard key={s.id} s={s} />)}
          </div>
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#888' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
              <p>No schemes match your filters. Try clearing the search.</p>
            </div>
          )}
        </div>
      </section>

      {/* CATEGORIES */}
      <section id="categories" style={{ padding: '60px 20px', background: 'white' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <h2 style={{ fontWeight: 800, fontSize: 36, color: '#0b1c30', margin: '0 0 10px' }}>Scheme Categories</h2>
            <p style={{ color: '#666' }}>Find schemes by who they&apos;re for</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16 }}>
            {CATEGORIES.slice(1).map(c => (
              <button key={c.id} onClick={() => { setCategory(c.id); document.getElementById('browse-schemes')?.scrollIntoView({ behavior: 'smooth' }) }}
                style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 16, padding: '24px 12px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
                onMouseOver={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#0055A4'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 24px rgba(0,85,164,0.15)'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)' }}
                onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#e2e8f0'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'; (e.currentTarget as HTMLButtonElement).style.transform = 'none' }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>{c.emoji}</div>
                <div style={{ fontWeight: 700, color: '#0b1c30', fontSize: 14 }}>{c.label}</div>
                <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>{schemes.filter(s => s.category === c.id).length} schemes</div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ padding: '60px 20px', background: 'linear-gradient(135deg, #0055A4 0%, #003e7a 100%)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontWeight: 800, fontSize: 36, color: 'white', margin: '0 0 10px' }}>How It Works</h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: 48 }}>Find your perfect scheme in 3 simple steps</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {[
              { step: '1', icon: '👤', title: 'Fill Your Profile', desc: 'Tell us your age, occupation, income, state and category.' },
              { step: '2', icon: '🤖', title: 'AI Analysis', desc: 'Our AI analyzes all 35+ schemes against your profile in seconds.' },
              { step: '3', icon: '🎯', title: 'Get Matched', desc: 'Receive personalized scheme recommendations with eligibility scores.' },
            ].map(s => (
              <div key={s.step} style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 20, padding: 28, backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.15)' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>{s.icon}</div>
                <div style={{ fontWeight: 800, fontSize: 22, color: '#FF9933', marginBottom: 8 }}>Step {s.step}</div>
                <div style={{ fontWeight: 700, color: 'white', fontSize: 16, marginBottom: 8 }}>{s.title}</div>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, lineHeight: 1.6 }}>{s.desc}</div>
              </div>
            ))}
          </div>
          <button onClick={() => setShowForm(true)}
            style={{ marginTop: 40, padding: '16px 40px', background: '#FF9933', color: 'white', border: 'none', borderRadius: 30, fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: '0 8px 30px rgba(255,153,51,0.4)' }}>
            ✨ Start Eligibility Check Now
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: '#0b1c30', color: 'rgba(255,255,255,0.7)', padding: '40px 20px', textAlign: 'center' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', marginBottom: 16 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #0055A4, #28A745)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>✨</div>
            <span style={{ fontWeight: 800, color: 'white', fontSize: 18 }}>SchemeSeva AI</span>
          </div>
          <p style={{ margin: '0 0 8px', fontSize: 14 }}>Inspired by MyScheme.gov.in • AI-Powered Scheme Discovery • Data updated 2025</p>
          <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>This is an information aggregator. Always verify on official government portals before applying.</p>
        </div>
      </footer>

      {/* ELIGIBILITY MODAL */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget) setShowForm(false) }}>
          <div style={{ background: 'white', borderRadius: 24, padding: 32, maxWidth: 600, width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
              <div>
                <h2 style={{ margin: 0, fontWeight: 800, fontSize: 22, color: '#0b1c30' }}>✨ AI Eligibility Checker</h2>
                <p style={{ margin: '4px 0 0', color: '#666', fontSize: 14 }}>Step {formStep} of 2 — {formStep === 1 ? 'Personal Details' : 'Socio-Economic Profile'}</p>
              </div>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#666' }}>✕</button>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
              {[1, 2].map(s => <div key={s} style={{ flex: 1, height: 4, borderRadius: 4, background: formStep >= s ? '#0055A4' : '#e2e8f0' }} />)}
            </div>
            {formStep === 1 ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {[
                  { label: 'Full Name', key: 'name', ph: 'Arjun Sharma', type: 'text' },
                  { label: 'Age *', key: 'age', ph: '25', type: 'number' },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ fontWeight: 600, fontSize: 13, color: '#444', display: 'block', marginBottom: 6 }}>{f.label}</label>
                    <input value={(profile as any)[f.key]} onChange={e => setProfile(p => ({ ...p, [f.key]: e.target.value }))} type={f.type} placeholder={f.ph}
                      style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 14, fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                ))}
                {[
                  { label: 'Gender', key: 'gender', opts: ['Male', 'Female', 'Other'] },
                  { label: 'State', key: 'state', opts: STATES },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ fontWeight: 600, fontSize: 13, color: '#444', display: 'block', marginBottom: 6 }}>{f.label}</label>
                    <select value={(profile as any)[f.key]} onChange={e => setProfile(p => ({ ...p, [f.key]: e.target.value }))}
                      style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 14, fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' }}>
                      <option value="">Select...</option>
                      {f.opts.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {[
                  { label: 'Occupation', key: 'occupation', opts: ['Student', 'Farmer', 'Business Owner', 'Startup Founder', 'Government Employee', 'Private Employee', 'Unemployed', 'Senior Citizen'] },
                  { label: 'Annual Income (₹)', key: 'income', opts: ['Below ₹1 Lakh', '₹1-3 Lakh', '₹3-5 Lakh', '₹5-8 Lakh', 'Above ₹8 Lakh'] },
                  { label: 'Category', key: 'category', opts: ['General', 'OBC', 'SC', 'ST', 'EWS'] },
                  { label: 'Education', key: 'education', opts: ['School Student', 'College Student', 'Diploma', 'Graduate', 'Postgraduate', 'Research Scholar'] },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ fontWeight: 600, fontSize: 13, color: '#444', display: 'block', marginBottom: 6 }}>{f.label}</label>
                    <select value={(profile as any)[f.key]} onChange={e => setProfile(p => ({ ...p, [f.key]: e.target.value }))}
                      style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 14, fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' }}>
                      <option value="">Select...</option>
                      {f.opts.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
                    <input type="checkbox" checked={profile.disability} onChange={e => setProfile(p => ({ ...p, disability: e.target.checked }))} style={{ width: 16, height: 16 }} />
                    I have a disability (40%+ disability certificate)
                  </label>
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
              {formStep === 2 && <button onClick={() => setFormStep(1)} style={{ flex: 1, padding: '12px', border: '1.5px solid #ddd', borderRadius: 12, background: 'white', cursor: 'pointer', fontWeight: 600, fontSize: 15 }}>← Back</button>}
              {formStep === 1 ? (
                <button onClick={() => setFormStep(2)} style={{ flex: 2, padding: '12px', background: '#0055A4', color: 'white', border: 'none', borderRadius: 12, cursor: 'pointer', fontWeight: 700, fontSize: 15 }}>Next Step →</button>
              ) : (
                <button onClick={analyzeEligibility} disabled={analyzing}
                  style={{ flex: 2, padding: '12px', background: 'linear-gradient(135deg, #0055A4, #28A745)', color: 'white', border: 'none', borderRadius: 12, cursor: analyzing ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 15 }}>
                  {analyzing ? '🔄 Analyzing with AI...' : '✨ Analyze My Eligibility'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI CHATBOT */}
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 90 }}>
        {chatOpen && (
          <div style={{ position: 'absolute', bottom: 70, right: 0, width: 340, background: 'white', borderRadius: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ background: 'linear-gradient(135deg, #0055A4, #28A745)', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ color: 'white' }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>🤖 SchemeSeva Bot</div>
                <div style={{ fontSize: 11, opacity: 0.8 }}>Online • Hindi & English</div>
              </div>
              <button onClick={() => setChatOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: 18 }}>✕</button>
            </div>
            <div style={{ maxHeight: 300, overflowY: 'auto', padding: '16px' }}>
              {chatHistory.map((m, i) => (
                <div key={i} style={{ marginBottom: 12, textAlign: m.role === 'user' ? 'right' : 'left' }}>
                  <div style={{ display: 'inline-block', maxWidth: '80%', padding: '8px 14px', borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                    background: m.role === 'user' ? '#0055A4' : '#f3f4f6', color: m.role === 'user' ? 'white' : '#333', fontSize: 13, lineHeight: 1.5 }}>
                    {m.text}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: '12px 16px', borderTop: '1px solid #eee', display: 'flex', gap: 8 }}>
              <input value={chatMsg} onChange={e => setChatMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat()}
                placeholder="Ask about any scheme..."
                style={{ flex: 1, padding: '8px 12px', border: '1px solid #ddd', borderRadius: 20, fontSize: 13, fontFamily: 'Inter, sans-serif', outline: 'none' }} />
              <button onClick={sendChat} style={{ padding: '8px 14px', background: '#0055A4', color: 'white', border: 'none', borderRadius: 20, cursor: 'pointer', fontSize: 14 }}>→</button>
            </div>
          </div>
        )}
        <button onClick={() => setChatOpen(o => !o)}
          style={{ width: 56, height: 56, background: 'linear-gradient(135deg, #0055A4, #28A745)', border: 'none', borderRadius: '50%', cursor: 'pointer', fontSize: 24, boxShadow: '0 8px 24px rgba(0,85,164,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
          {chatOpen ? '✕' : '🤖'}
        </button>
      </div>
    </div>
  )
}

function SchemeCard({ s, score }: { s: any, score?: number }) {
  const catColor = CAT_COLORS[s.category] || 'bg-gray-100 text-gray-700'
  return (
    <div style={{ background: 'white', borderRadius: 18, border: '1px solid #e8eef8', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', overflow: 'hidden', transition: 'all 0.25s', display: 'flex', flexDirection: 'column' }}
      onMouseOver={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 12px 40px rgba(0,85,164,0.15)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)' }}
      onMouseOut={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.05)'; (e.currentTarget as HTMLDivElement).style.transform = 'none' }}>
      <div style={{ padding: '18px 18px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 12 }} className={catColor}>
            {s.category}
          </span>
          {score != null && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: '#888' }}>Match</div>
              <div style={{ fontWeight: 800, fontSize: 18, color: score >= 80 ? '#28A745' : score >= 60 ? '#0055A4' : '#FF9933' }}>{score}%</div>
            </div>
          )}
        </div>
        <h3 style={{ fontWeight: 700, fontSize: 15, color: '#0b1c30', margin: '0 0 4px', lineHeight: 1.4 }}>{s.name}</h3>
        <p style={{ fontSize: 12, color: '#888', margin: '0 0 12px' }}>🏛 {s.ministry}</p>
        <div style={{ background: 'linear-gradient(135deg, #f0fdf4, #eff6ff)', borderRadius: 10, padding: '10px 12px', marginBottom: 12 }}>
          <div style={{ fontSize: 10, color: '#28A745', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Benefit</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#0b1c30' }}>{s.benefit}</div>
        </div>
      </div>
      <div style={{ padding: '0 18px 18px', marginTop: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, fontSize: 12, color: '#888' }}>
          <span>📊 {s.popularity}% popular</span>
          <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 8, background: s.status === 'Open' ? '#f0fdf4' : '#fff7ed', color: s.status === 'Open' ? '#28A745' : '#FF9933', fontWeight: 600 }}>{s.status}</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ flex: 1, padding: '9px', border: '1.5px solid #e2e8f0', borderRadius: 10, background: 'white', cursor: 'pointer', fontWeight: 600, fontSize: 13, color: '#444' }}>Details</button>
          <a href={s.applyUrl} target="_blank" rel="noreferrer" style={{ flex: 1, padding: '9px', background: '#0055A4', color: 'white', borderRadius: 10, textAlign: 'center', textDecoration: 'none', fontWeight: 600, fontSize: 13 }}>Apply ↗</a>
        </div>
      </div>
    </div>
  )
}

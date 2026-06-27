'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Search, Sparkles, GraduationCap, Sprout, HeartHandshake, Home, Briefcase, Heart,
  Rocket, Users, Accessibility, ChevronRight, CheckCircle2, AlertTriangle, XCircle,
  Loader2, ArrowRight, Bell, ShieldCheck, TrendingUp, MapPin, Calendar, ExternalLink,
  Bot, FileText, Globe2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'

const CATEGORY_ICONS = {
  Student: GraduationCap, Farmer: Sprout, Women: HeartHandshake, Housing: Home,
  Employment: Briefcase, Health: Heart, Startup: Rocket, 'Senior Citizen': Users, Disability: Accessibility
}

const CATEGORY_LIST = ['Student','Farmer','Women','Housing','Employment','Health','Startup','Senior Citizen','Disability']
const STATES = ['Andhra Pradesh','Bihar','Delhi','Gujarat','Haryana','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Odisha','Punjab','Rajasthan','Tamil Nadu','Telangana','Uttar Pradesh','Uttarakhand','West Bengal']

function Navbar({ onCheckEligibility }) {
  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-white/70 border-b border-slate-200">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 via-blue-500 to-emerald-500 flex items-center justify-center shadow-md">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-lg text-slate-900 leading-none">SchemeSeva <span className="text-blue-600">AI</span></div>
            <div className="text-[10px] text-slate-500 leading-none mt-0.5">Government of India inspired • AI-powered</div>
          </div>
        </div>
        <nav className="hidden md:flex items-center gap-6 text-sm text-slate-700">
          <a href="#browse" className="hover:text-blue-600">Browse Schemes</a>
          <a href="#eligibility" className="hover:text-blue-600">Check Eligibility</a>
          <a href="#categories" className="hover:text-blue-600">Categories</a>
          <a href="#trending" className="hover:text-blue-600">Trending</a>
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="hidden md:inline-flex"><Globe2 className="w-4 h-4 mr-1"/>EN</Button>
          <Button onClick={onCheckEligibility} size="sm" className="bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white shadow-md">
            <Sparkles className="w-4 h-4 mr-1"/>Check Eligibility
          </Button>
        </div>
      </div>
    </header>
  )
}

function Hero({ onCheckEligibility, onBrowse }) {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-emerald-50"/>
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-blue-300/30 rounded-full blur-3xl"/>
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-emerald-300/30 rounded-full blur-3xl"/>
      <div className="absolute top-20 right-1/3 w-64 h-64 bg-orange-300/20 rounded-full blur-3xl"/>
      <div className="container mx-auto px-4 py-20 md:py-28 relative">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{duration:0.5}}>
            <Badge className="mb-4 bg-white/80 text-blue-700 border border-blue-200 hover:bg-white">
              <Sparkles className="w-3 h-3 mr-1"/>Powered by Claude Sonnet 4.5 • 36 schemes
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-slate-900 leading-tight">
              Find Government Schemes <br/>
              <span className="bg-gradient-to-r from-blue-600 via-emerald-600 to-orange-500 bg-clip-text text-transparent">
                You Are Eligible For
              </span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-slate-600 max-w-2xl mx-auto">
              Discover government benefits, scholarships, subsidies and welfare schemes tailored to your profile using AI.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={onCheckEligibility} size="lg" className="bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white shadow-lg shadow-blue-500/30 text-base px-8">
                <Sparkles className="w-5 h-5 mr-2"/>Check My Eligibility
              </Button>
              <Button onClick={onBrowse} variant="outline" size="lg" className="bg-white/80 border-slate-300 text-base px-8">
                Browse Schemes <ArrowRight className="w-4 h-4 ml-2"/>
              </Button>
            </div>
            <div className="mt-10 grid grid-cols-3 max-w-2xl mx-auto gap-4">
              {[
                { k: '36+', v: 'Curated Schemes' },
                { k: 'AI', v: 'Powered Analysis' },
                { k: '< 5s', v: 'Eligibility Check' }
              ].map(s => (
                <div key={s.v} className="backdrop-blur-md bg-white/60 border border-white/80 rounded-2xl p-4 shadow-sm">
                  <div className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">{s.k}</div>
                  <div className="text-xs md:text-sm text-slate-600 mt-1">{s.v}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

function CategoryChips({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      <button onClick={() => onChange('all')} className={`px-4 py-2 rounded-full text-sm font-medium transition ${value==='all' ? 'bg-blue-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}>All</button>
      {CATEGORY_LIST.map(c => {
        const Icon = CATEGORY_ICONS[c]
        const active = value === c
        return (
          <button key={c} onClick={() => onChange(c)} className={`px-4 py-2 rounded-full text-sm font-medium transition flex items-center gap-1.5 ${active ? 'bg-blue-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
            <Icon className="w-4 h-4"/>{c}
          </button>
        )
      })}
    </div>
  )
}

function SchemeCard({ s, onView, score, aiNote, badge }) {
  const Icon = CATEGORY_ICONS[s.category] || Briefcase
  return (
    <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} className="h-full">
      <Card className="h-full backdrop-blur-md bg-white/80 border-slate-200/80 hover:shadow-xl hover:border-blue-300 transition-all duration-300">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-emerald-100 flex items-center justify-center text-blue-700">
                <Icon className="w-5 h-5"/>
              </div>
              <Badge variant="outline" className="text-xs">{s.category}</Badge>
            </div>
            {score != null && (
              <div className="text-right">
                <div className="text-xs text-slate-500">Match</div>
                <div className={`text-lg font-bold ${score >= 80 ? 'text-emerald-600' : score >= 60 ? 'text-blue-600' : 'text-orange-600'}`}>{score}%</div>
              </div>
            )}
            {badge}
          </div>
          <CardTitle className="text-base mt-2 leading-snug">{s.name}</CardTitle>
          <CardDescription className="text-xs flex items-center gap-1"><ShieldCheck className="w-3 h-3"/>{s.ministry}</CardDescription>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          <div className="bg-gradient-to-r from-emerald-50 to-blue-50 rounded-lg p-2.5 border border-emerald-100">
            <div className="text-[11px] uppercase text-emerald-700 font-semibold tracking-wider">Benefit</div>
            <div className="text-sm font-medium text-slate-800 mt-0.5">{s.benefit}</div>
          </div>
          {aiNote && (
            <div className="flex gap-1.5 text-xs text-slate-700 bg-blue-50 p-2 rounded-lg border border-blue-100">
              <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5"/><span className="italic">{aiNote}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3"/>{s.deadline}</span>
            <Badge variant={s.status === 'Open' ? 'default' : 'secondary'} className={`text-[10px] ${s.status === 'Open' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : ''}`}>{s.status}</Badge>
          </div>
          <div className="flex gap-2 pt-1">
            <Button onClick={() => onView(s)} size="sm" variant="outline" className="flex-1">View Details</Button>
            <Button asChild size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700">
              <a href={s.applyUrl} target="_blank" rel="noreferrer">Apply <ExternalLink className="w-3 h-3 ml-1"/></a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function BrowseSection({ onView }) {
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('all')
  const [sort, setSort] = useState('popularity')
  const [schemes, setSchemes] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (category !== 'all') params.set('category', category)
    params.set('sort', sort)
    fetch(`/api/schemes?${params}`).then(r => r.json()).then(d => {
      if (active) setSchemes(d.schemes || [])
    }).finally(() => active && setLoading(false))
    return () => { active = false }
  }, [q, category, sort])

  return (
    <section id="browse" className="py-20 bg-slate-50/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900">Browse All Schemes</h2>
          <p className="text-slate-600 mt-2">Discover {schemes.length} schemes from across India’s ministries</p>
        </div>
        <div className="max-w-3xl mx-auto mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"/>
            <Input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search Government Schemes, Scholarships, Subsidies, Benefits..." className="pl-12 pr-4 h-14 text-base bg-white border-slate-200 rounded-2xl shadow-sm"/>
          </div>
        </div>
        <div className="flex flex-col gap-4 items-center mb-8">
          <CategoryChips value={category} onChange={setCategory}/>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">Sort:</span>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-44 h-9 bg-white"><SelectValue/></SelectTrigger>
              <SelectContent>
                <SelectItem value="popularity">Most Popular</SelectItem>
                <SelectItem value="applications">Most Applied</SelectItem>
                <SelectItem value="name">A — Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600"/></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {schemes.map(s => <SchemeCard key={s.id} s={s} onView={onView}/>)}
          </div>
        )}
        {!loading && schemes.length === 0 && (
          <div className="text-center py-16 text-slate-500">No schemes match your filters. Try clearing.</div>
        )}
      </div>
    </section>
  )
}

function EligibilityForm({ open, onOpenChange, onResults }) {
  const [form, setForm] = useState({
    fullName: '', age: '', gender: '', maritalStatus: '', state: '', area: 'Rural',
    occupation: '', annualIncome: '', category: '', education: '', disability: false
  })
  const [loading, setLoading] = useState(false)
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  async function submit() {
    if (!form.age || !form.annualIncome) {
      toast.error('Please fill at least Age and Annual Income')
      return
    }
    setLoading(true)
    try {
      const payload = { ...form, age: Number(form.age), annualIncome: Number(form.annualIncome) }
      const res = await fetch('/api/eligibility/analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      })
      const data = await res.json()
      onResults(data, payload)
      onOpenChange(false)
      toast.success(`Found ${data.stats?.eligible || 0} matching schemes for you!`)
    } catch (e) {
      toast.error('Failed to analyze. Try again.')
    } finally { setLoading(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl"><Sparkles className="w-6 h-6 text-blue-600"/>AI Eligibility Checker</DialogTitle>
          <DialogDescription>Fill your profile — our AI will analyze all 36 schemes and rank your best matches with personalized notes.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          <div className="space-y-1.5">
            <Label>Full Name</Label>
            <Input value={form.fullName} onChange={e=>set('fullName', e.target.value)} placeholder="Your name"/>
          </div>
          <div className="space-y-1.5">
            <Label>Age *</Label>
            <Input type="number" value={form.age} onChange={e=>set('age', e.target.value)} placeholder="e.g. 25"/>
          </div>
          <div className="space-y-1.5">
            <Label>Gender</Label>
            <Select value={form.gender} onValueChange={v=>set('gender', v)}>
              <SelectTrigger><SelectValue placeholder="Select"/></SelectTrigger>
              <SelectContent>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Marital Status</Label>
            <Select value={form.maritalStatus} onValueChange={v=>set('maritalStatus', v)}>
              <SelectTrigger><SelectValue placeholder="Select"/></SelectTrigger>
              <SelectContent>
                <SelectItem value="Single">Single</SelectItem>
                <SelectItem value="Married">Married</SelectItem>
                <SelectItem value="Widowed">Widowed</SelectItem>
                <SelectItem value="Divorced">Divorced</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>State</Label>
            <Select value={form.state} onValueChange={v=>set('state', v)}>
              <SelectTrigger><SelectValue placeholder="Select state"/></SelectTrigger>
              <SelectContent className="max-h-60">
                {STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Area</Label>
            <Select value={form.area} onValueChange={v=>set('area', v)}>
              <SelectTrigger><SelectValue/></SelectTrigger>
              <SelectContent>
                <SelectItem value="Rural">Rural</SelectItem>
                <SelectItem value="Urban">Urban</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Occupation</Label>
            <Select value={form.occupation} onValueChange={v=>set('occupation', v)}>
              <SelectTrigger><SelectValue placeholder="Select"/></SelectTrigger>
              <SelectContent>
                {['Student','Farmer','Business Owner','Startup Founder','Government Employee','Private Employee','Unemployed','Senior Citizen'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Annual Income (₹) *</Label>
            <Input type="number" value={form.annualIncome} onChange={e=>set('annualIncome', e.target.value)} placeholder="e.g. 200000"/>
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={form.category} onValueChange={v=>set('category', v)}>
              <SelectTrigger><SelectValue placeholder="Select"/></SelectTrigger>
              <SelectContent>
                {['General','OBC','SC','ST','EWS'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Education</Label>
            <Select value={form.education} onValueChange={v=>set('education', v)}>
              <SelectTrigger><SelectValue placeholder="Select"/></SelectTrigger>
              <SelectContent>
                {['School Student','College Student','Diploma','Graduate','Postgraduate','Research Scholar'].map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.disability} onChange={e=>set('disability', e.target.checked)} className="w-4 h-4 rounded"/>
              I have a disability (40%+)
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={()=>onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={loading} className="bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700">
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin"/>Analyzing with AI...</> : <><Sparkles className="w-4 h-4 mr-2"/>Analyze My Eligibility</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ResultsSection({ results, profile, onView }) {
  if (!results) return null
  const { aiSummary, aiPriorityAdvice, aiPowered, stats, eligible, potential, notEligible } = results
  return (
    <section id="results" className="py-16 bg-gradient-to-b from-blue-50/50 to-white">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          <div className="backdrop-blur-xl bg-white/80 border border-blue-100 rounded-3xl p-6 md:p-8 shadow-xl mb-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-emerald-500 flex items-center justify-center shrink-0">
                <Bot className="w-6 h-6 text-white"/>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl md:text-2xl font-bold text-slate-900">Your Personalized Eligibility Report</h2>
                  {aiPowered && <Badge className="bg-gradient-to-r from-blue-600 to-emerald-600 text-white border-0"><Sparkles className="w-3 h-3 mr-1"/>Claude AI</Badge>}
                </div>
                <p className="text-slate-700 mt-2 leading-relaxed">{aiSummary}</p>
                {aiPriorityAdvice && (
                  <div className="mt-3 p-3 rounded-xl bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200">
                    <div className="flex items-start gap-2">
                      <TrendingUp className="w-4 h-4 text-orange-600 mt-0.5 shrink-0"/>
                      <div className="text-sm text-slate-800"><span className="font-semibold text-orange-700">Priority Action: </span>{aiPriorityAdvice}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-6">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-emerald-700">{stats.eligible}</div>
                <div className="text-xs text-emerald-600 font-medium">Eligible</div>
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-orange-700">{stats.potential}</div>
                <div className="text-xs text-orange-600 font-medium">Potential</div>
              </div>
              <div className="bg-slate-100 border border-slate-200 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-slate-700">{stats.total}</div>
                <div className="text-xs text-slate-600 font-medium">Total Analyzed</div>
              </div>
            </div>
          </div>

          <Tabs defaultValue="eligible" className="w-full">
            <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto">
              <TabsTrigger value="eligible"><CheckCircle2 className="w-4 h-4 mr-1 text-emerald-600"/>Eligible ({eligible.length})</TabsTrigger>
              <TabsTrigger value="potential"><AlertTriangle className="w-4 h-4 mr-1 text-orange-600"/>Potential ({potential.length})</TabsTrigger>
              <TabsTrigger value="notEligible"><XCircle className="w-4 h-4 mr-1 text-slate-500"/>Not Eligible</TabsTrigger>
            </TabsList>
            <TabsContent value="eligible" className="mt-6">
              {eligible.length === 0 ? <p className="text-center text-slate-500 py-8">No fully eligible schemes. Check Potential tab.</p> :
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {eligible.map(s => <SchemeCard key={s.schemeId} s={{...s, id: s.schemeId}} onView={onView} score={s.matchScore} aiNote={s.aiNote}/>)}
                </div>}
            </TabsContent>
            <TabsContent value="potential" className="mt-6">
              <p className="text-center text-sm text-slate-600 mb-4">These need a few more profile details to confirm eligibility.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {potential.slice(0,8).map(s => <SchemeCard key={s.schemeId} s={{...s, id: s.schemeId}} onView={onView} score={s.matchScore}/>)}
              </div>
            </TabsContent>
            <TabsContent value="notEligible" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {notEligible.slice(0,8).map(s => <SchemeCard key={s.schemeId} s={{...s, id: s.schemeId}} onView={onView} score={s.matchScore}/>)}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </section>
  )
}

function CategoriesSection({ counts, onPick }) {
  return (
    <section id="categories" className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900">Scheme Categories</h2>
          <p className="text-slate-600 mt-2">Find schemes by who they’re for</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {CATEGORY_LIST.map(c => {
            const Icon = CATEGORY_ICONS[c]
            return (
              <button key={c} onClick={() => onPick(c)} className="group relative backdrop-blur-md bg-white/80 border border-slate-200 rounded-2xl p-5 text-left hover:border-blue-400 hover:shadow-xl transition-all">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center text-white mb-3 group-hover:scale-110 transition">
                  <Icon className="w-6 h-6"/>
                </div>
                <div className="font-semibold text-slate-900">{c}</div>
                <div className="text-xs text-slate-500 mt-1">{counts[c] || 0} schemes</div>
                <ChevronRight className="absolute top-5 right-5 w-4 h-4 text-slate-400 group-hover:text-blue-600"/>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function SchemeDetail({ s, onClose }) {
  if (!s) return null
  const Icon = CATEGORY_ICONS[s.category] || Briefcase
  return (
    <Dialog open={!!s} onOpenChange={(o)=>!o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-emerald-100 flex items-center justify-center text-blue-700 shrink-0">
              <Icon className="w-6 h-6"/>
            </div>
            <div>
              <DialogTitle className="text-xl leading-snug">{s.name}</DialogTitle>
              <DialogDescription className="flex items-center gap-1 mt-1"><ShieldCheck className="w-3 h-3"/>{s.ministry}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{s.category}</Badge>
            <Badge variant="outline">{s.schemeType}</Badge>
            <Badge className={s.status === 'Open' ? 'bg-emerald-100 text-emerald-700' : ''}>{s.status}</Badge>
          </div>
          <div className="bg-gradient-to-r from-emerald-50 to-blue-50 rounded-xl p-4 border border-emerald-100">
            <div className="text-xs uppercase font-semibold text-emerald-700 tracking-wider">Benefit</div>
            <div className="text-lg font-semibold text-slate-900 mt-1">{s.benefit}</div>
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 mb-1">About this scheme</h4>
            <p className="text-sm text-slate-700 leading-relaxed">{s.description}</p>
          </div>
          {s.eligibility?.notes && (
            <div>
              <h4 className="font-semibold text-slate-900 mb-1">Eligibility notes</h4>
              <p className="text-sm text-slate-700">{s.eligibility.notes}</p>
            </div>
          )}
          {s.documents && (
            <div>
              <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-1"><FileText className="w-4 h-4"/>Required Documents</h4>
              <div className="flex flex-wrap gap-1.5">
                {s.documents.map(d => <Badge key={d} variant="secondary" className="text-xs">{d}</Badge>)}
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Calendar className="w-4 h-4"/><span>Deadline: <strong>{s.deadline}</strong></span>
          </div>
        </div>
        <DialogFooter>
          <Button asChild className="bg-blue-600 hover:bg-blue-700 w-full">
            <a href={s.applyUrl} target="_blank" rel="noreferrer">Apply on Official Portal <ExternalLink className="w-4 h-4 ml-2"/></a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50/50 py-8">
      <div className="container mx-auto px-4 text-center text-sm text-slate-600">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-blue-600"/>
          <span className="font-semibold">SchemeSeva AI</span>
        </div>
        <p>Inspired by MyScheme.gov.in • Built with Claude Sonnet 4.5 • Data updated for 2025</p>
        <p className="mt-1 text-xs text-slate-500">This is an information aggregator. Always verify on official government portals before applying.</p>
      </div>
    </footer>
  )
}

function App() {
  const [showForm, setShowForm] = useState(false)
  const [results, setResults] = useState(null)
  const [profile, setProfile] = useState(null)
  const [selected, setSelected] = useState(null)
  const [counts, setCounts] = useState({})

  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(d => setCounts(d.counts || {}))
  }, [])

  const openForm = () => setShowForm(true)
  const onResults = (data, p) => { setResults(data); setProfile(p); setTimeout(() => document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' }), 300) }
  const pickCategory = (c) => { document.getElementById('browse')?.scrollIntoView({ behavior: 'smooth' }) }

  return (
    <div className="min-h-screen bg-white">
      <Navbar onCheckEligibility={openForm}/>
      <Hero onCheckEligibility={openForm} onBrowse={() => document.getElementById('browse')?.scrollIntoView({ behavior: 'smooth' })}/>
      <ResultsSection results={results} profile={profile} onView={setSelected}/>
      <CategoriesSection counts={counts} onPick={pickCategory}/>
      <BrowseSection onView={setSelected}/>
      <Footer/>
      <EligibilityForm open={showForm} onOpenChange={setShowForm} onResults={onResults}/>
      <SchemeDetail s={selected} onClose={() => setSelected(null)}/>
      <button onClick={openForm} className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-blue-600 to-emerald-600 hover:scale-105 text-white px-5 py-3 rounded-full shadow-2xl shadow-blue-500/40 flex items-center gap-2 transition">
        <Sparkles className="w-5 h-5"/><span className="font-medium">AI Check</span>
      </button>
    </div>
  )
}

export default App

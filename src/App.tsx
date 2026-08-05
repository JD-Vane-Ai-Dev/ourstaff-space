import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { CustomEase } from 'gsap/CustomEase'
import {
  Truck,
  FileText,
  CalendarClock,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react'

gsap.registerPlugin(ScrollTrigger, CustomEase)
CustomEase.create('smoothOut', '0.25, 1, 0.5, 1')

/* ---------------------------------- hooks --------------------------------- */

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

/* ------------------------- hero canvas particle swarm --------------------- */

type Particle = { x: number; y: number; vx: number; vy: number; r: number }

function ParticleField({ reduced }: { reduced: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const COUNT = 240
    const CONNECT_DIST = 120
    const REPEL_DIST = 140
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    let width = 0
    let height = 0
    let raf = 0
    let particles: Particle[] = []
    const mouse = { x: -9999, y: -9999 }

    const resize = () => {
      const parent = canvas.parentElement
      if (!parent) return
      const rect = parent.getBoundingClientRect()
      width = rect.width
      height = rect.height
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const seed = () => {
      particles = Array.from({ length: COUNT }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        r: Math.random() * 1.4 + 0.6,
      }))
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height)

      ctx.lineWidth = 0.5
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i]
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const dist = Math.hypot(dx, dy)
          if (dist < CONNECT_DIST) {
            const alpha = (1 - dist / CONNECT_DIST) * 0.22
            ctx.strokeStyle = `rgba(0, 229, 201, ${alpha.toFixed(3)})`
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
          }
        }
      }

      ctx.fillStyle = 'rgba(0, 229, 201, 0.3)'
      for (const p of particles) {
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const step = () => {
      for (const p of particles) {
        // gentle mouse repulsion
        const dx = p.x - mouse.x
        const dy = p.y - mouse.y
        const dist = Math.hypot(dx, dy)
        if (dist < REPEL_DIST && dist > 0.01) {
          const force = ((REPEL_DIST - dist) / REPEL_DIST) * 0.02
          p.vx += (dx / dist) * force
          p.vy += (dy / dist) * force
        }

        // cap speed so the field stays calm
        const speed = Math.hypot(p.vx, p.vy)
        const max = 0.35
        if (speed > max) {
          p.vx = (p.vx / speed) * max
          p.vy = (p.vy / speed) * max
        }

        p.x += p.vx
        p.y += p.vy

        if (p.x < -10) p.x = width + 10
        if (p.x > width + 10) p.x = -10
        if (p.y < -10) p.y = height + 10
        if (p.y > height + 10) p.y = -10
      }
      draw()
      raf = requestAnimationFrame(step)
    }

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouse.x = e.clientX - rect.left
      mouse.y = e.clientY - rect.top
    }
    const onMouseLeave = () => {
      mouse.x = -9999
      mouse.y = -9999
    }
    const onResize = () => {
      resize()
      if (reduced) draw()
    }

    resize()
    seed()

    const host = canvas.parentElement
    if (reduced) {
      draw() // static frame only
    } else {
      raf = requestAnimationFrame(step)
      host?.addEventListener('mousemove', onMouseMove)
      host?.addEventListener('mouseleave', onMouseLeave)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      host?.removeEventListener('mousemove', onMouseMove)
      host?.removeEventListener('mouseleave', onMouseLeave)
    }
  }, [reduced])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0"
    />
  )
}

/* ------------------------------ scramble text ----------------------------- */

const SCRAMBLE_CHARS = '!<>-_\\/[]{}=+*^?#ABCDEFGHJKMNPQRSTUVWXYZ0123456789'

function ScrambleText({
  text,
  reduced,
  className,
}: {
  text: string
  reduced: boolean
  className?: string
}) {
  const [display, setDisplay] = useState('')

  useEffect(() => {
    if (reduced) return
    const duration = 1200
    const start = performance.now()
    let raf = 0

    const tick = (now: number) => {
      const linear = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - linear, 3)
      const reveal = Math.floor(eased * text.length)
      let out = text.slice(0, reveal)
      for (let i = reveal; i < text.length; i++) {
        out +=
          text[i] === ' '
            ? ' '
            : SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)]
      }
      setDisplay(out)
      if (linear < 1) raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [text, reduced])

  return (
    <span className={className} aria-label={text}>
      {reduced ? text : display}
    </span>
  )
}

/* --------------------------------- section -------------------------------- */

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="font-mono text-xs uppercase tracking-[0.1em] text-subtle">
      {children}
    </p>
  )
}

/* ---------------------------------- hero ---------------------------------- */

function Hero({ reduced }: { reduced: boolean }) {
  const subRef = useRef<HTMLParagraphElement>(null)
  const ctaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const sub = subRef.current
    const cta = ctaRef.current
    if (!sub || !cta) return

    if (reduced) {
      gsap.set([sub, cta], { opacity: 1, y: 0 })
      return
    }

    gsap.set([sub, cta], { opacity: 0, y: 14 })
    const tl = gsap.timeline()
    tl.to(sub, { opacity: 1, y: 0, duration: 0.8, ease: 'smoothOut' }, 0.15).to(
      cta,
      { opacity: 1, y: 0, duration: 0.8, ease: 'smoothOut' },
      0.3,
    )
    return () => {
      tl.kill()
    }
  }, [reduced])

  return (
    <section className="relative flex min-h-screen items-center overflow-hidden">
      <ParticleField reduced={reduced} />
      <div className="relative z-10 mx-auto w-full max-w-[1280px] px-6 py-[120px]">
        <div className="max-w-[640px] text-center md:text-left">
          <h1 className="font-display text-[42px] font-bold leading-[1.05] tracking-[-0.02em] text-white md:text-[56px] lg:text-[72px]">
            <ScrambleText
              text="Your Operations Team, Autonomous."
              reduced={reduced}
            />
          </h1>
          <p
            ref={subRef}
            className="mt-6 text-base leading-[1.6] text-body md:text-lg"
          >
            Eliminate scheduling overhead by 70%. Remove coverage gaps. Let
            agents handle logistics, content, and workforce coordination —
            while your team focuses on guests.
          </p>
          <div
            ref={ctaRef}
            className="mt-10 flex flex-col items-center gap-4 sm:flex-row md:items-start"
          >
            <a
              href="#pilot"
              className="inline-flex items-center justify-center rounded-lg bg-teal px-7 py-3.5 text-sm font-semibold text-obsidian transition-colors duration-300 hover:bg-white"
            >
              See the Live Pilot
            </a>
            <a
              href="#audit"
              className="inline-flex items-center justify-center rounded-lg border border-line bg-transparent px-7 py-3.5 text-sm font-semibold text-white transition-colors duration-300 hover:border-teal hover:text-teal"
            >
              Talk to Our Team
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------ agent swarm ------------------------------- */

type AgentCardProps = {
  icon: React.ComponentType<{ className?: string }>
  title: string
  body: string
  className?: string
}

function AgentCard({ icon: Icon, title, body, className = '' }: AgentCardProps) {
  return (
    <article
      className={`agent-card group relative overflow-hidden rounded-xl border border-line bg-ink p-8 transition-colors duration-300 hover:border-teal ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-[radial-gradient(circle_at_center,rgba(0,229,201,0.05),transparent_70%)]" />
      <div className="relative flex h-full flex-col">
        <Icon className="h-6 w-6 text-teal" />
        <h3 className="mt-6 font-display text-xl font-bold tracking-[-0.02em] text-white">
          {title}
        </h3>
        <p className="mt-3 text-sm leading-[1.6] text-body">{body}</p>
        <a
          href="#pilot"
          className="mt-auto inline-flex items-center gap-1.5 pt-6 text-sm font-medium text-teal transition-colors duration-300 hover:text-white"
        >
          See how it works
          <ArrowRight className="h-4 w-4" />
        </a>
      </div>
    </article>
  )
}

/** Code-drawn swarm-link tile: three agent nodes exchanging state. */
function SwarmLinkTile() {
  return (
    <div className="agent-card relative hidden items-center justify-center overflow-hidden rounded-xl border border-line bg-ink p-8 lg:flex">
      <svg
        viewBox="0 0 200 120"
        className="h-full w-full"
        aria-hidden="true"
      >
        <line x1="40" y1="30" x2="160" y2="30" stroke="#27272A" strokeWidth="1" />
        <line x1="40" y1="30" x2="100" y2="95" stroke="#27272A" strokeWidth="1" />
        <line x1="160" y1="30" x2="100" y2="95" stroke="#27272A" strokeWidth="1" />
        <circle cx="40" cy="30" r="4" fill="#00E5C9" />
        <circle cx="160" cy="30" r="4" fill="#00E5C9" />
        <circle cx="100" cy="95" r="4" fill="#00E5C9" />
        <circle cx="100" cy="30" r="2" fill="#FF6B35">
          <animate attributeName="cx" values="40;160" dur="2.4s" repeatCount="indefinite" />
        </circle>
        <circle cx="70" cy="62" r="2" fill="#00E5C9" opacity="0.7">
          <animate attributeName="cx" values="40;100" dur="2s" repeatCount="indefinite" />
          <animate attributeName="cy" values="30;95" dur="2s" repeatCount="indefinite" />
        </circle>
        <circle cx="130" cy="62" r="2" fill="#00E5C9" opacity="0.7">
          <animate attributeName="cx" values="160;100" dur="2.8s" repeatCount="indefinite" />
          <animate attributeName="cy" values="30;95" dur="2.8s" repeatCount="indefinite" />
        </circle>
      </svg>
      <p className="absolute bottom-4 left-0 right-0 text-center font-mono text-[10px] uppercase tracking-[0.1em] text-faint">
        Swarm state sync · 40ms
      </p>
    </div>
  )
}

function AgentSwarm({ reduced }: { reduced: boolean }) {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray<HTMLElement>('.agent-card')
      if (reduced) {
        gsap.set(cards, { opacity: 1, y: 0 })
        return
      }
      gsap.fromTo(
        cards,
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          stagger: 0.1,
          ease: 'smoothOut',
          scrollTrigger: { trigger: sectionRef.current, start: 'top 75%' },
        },
      )
    }, sectionRef)
    return () => ctx.revert()
  }, [reduced])

  return (
    <section ref={sectionRef} className="py-[120px]">
      <div className="mx-auto max-w-[1280px] px-6">
        <SectionLabel>THE AGENT SWARM</SectionLabel>
        <h2 className="mt-4 max-w-[720px] font-display text-3xl font-bold tracking-[-0.02em] text-white md:text-5xl">
          Three Agents. One Coordinated System.
        </h2>
        <p className="mt-4 max-w-[640px] text-base leading-[1.6] text-body">
          Each agent operates independently, shares state with the swarm, and
          escalates to humans only when needed.
        </p>

        <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <AgentCard
            icon={Truck}
            title="Logistics Agent"
            body="Real-time vendor coordination, supply chain monitoring, and procurement automation. Reorders before you run out."
            className="md:col-span-2"
          />
          <AgentCard
            icon={CalendarClock}
            title="Scheduling Agent"
            body="Autonomous shift allocation, coverage prediction, labor law compliance, and overtime prevention."
            className="lg:row-span-2"
          />
          <AgentCard icon={FileText} title="Content Agent" body="Automated marketing copy, menu updates, and social scheduling across all channels." />
          <SwarmLinkTile />
        </div>
      </div>
    </section>
  )
}

/* ------------------------------ active pilot ------------------------------ */

const SPARKLINE_DATA = [1820, 1950, 1880, 2100, 2240, 2190, 2380, 2510, 2460, 2847]

function Sparkline() {
  const w = 120
  const h = 32
  const min = Math.min(...SPARKLINE_DATA)
  const max = Math.max(...SPARKLINE_DATA)
  const points = SPARKLINE_DATA.map((v, i) => {
    const x = (i / (SPARKLINE_DATA.length - 1)) * w
    const y = h - 2 - ((v - min) / (max - min)) * (h - 4)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-3 h-8 w-[120px]" aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        stroke="#00E5C9"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

function PilotDashboard({ reduced }: { reduced: boolean }) {
  const sectionRef = useRef<HTMLElement>(null)
  const blockRef = useRef<HTMLDivElement>(null)
  const countRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      const block = blockRef.current
      const count = countRef.current
      if (!block || !count) return

      if (reduced) {
        gsap.set(block, { opacity: 1, scale: 1 })
        count.textContent = '2,847'
        return
      }

      gsap.fromTo(
        block,
        { opacity: 0, scale: 0.98 },
        {
          opacity: 1,
          scale: 1,
          duration: 0.8,
          ease: 'smoothOut',
          scrollTrigger: { trigger: block, start: 'top 70%' },
        },
      )

      const target = { v: 0 }
      gsap.to(target, {
        v: 2847,
        duration: 1.5,
        ease: 'smoothOut',
        scrollTrigger: { trigger: block, start: 'top 70%' },
        onUpdate: () => {
          count.textContent = Math.round(target.v).toLocaleString('en-US')
        },
      })
    }, sectionRef)
    return () => ctx.revert()
  }, [reduced])

  return (
    <section id="pilot" ref={sectionRef} className="py-[120px]">
      <div className="mx-auto max-w-[1280px] px-6">
        <SectionLabel>THE ACTIVE PILOT</SectionLabel>
        <h2 className="mt-4 max-w-[720px] font-display text-3xl font-bold tracking-[-0.02em] text-white md:text-5xl">
          Currently Deployed at Grand Harbor Resort.
        </h2>
        <p className="mt-4 max-w-[640px] text-base leading-[1.6] text-body">
          Live metrics from a 340-room property running 24/7 operations.
        </p>

        <div
          ref={blockRef}
          className="mx-auto mt-12 max-w-[960px] rounded-xl border border-line bg-screen bg-[radial-gradient(ellipse_at_top,rgba(0,229,201,0.04),transparent_60%)] p-8"
        >
          {/* top bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-mono text-sm text-body">
              Venue: <span className="text-white">Grand Harbor Resort</span>
            </p>
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-amber opacity-75 motion-safe:animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-amber" />
              </span>
              <span className="font-mono text-xs uppercase tracking-[0.1em] text-amber">
                Live
              </span>
              <span className="font-mono text-xs text-subtle">
                System Operational
              </span>
            </div>
          </div>

          {/* metrics */}
          <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs uppercase tracking-[0.1em] text-subtle">
                Labor Cost Saved
              </p>
              <p className="mt-2 font-mono text-[32px] font-medium leading-none text-white">
                $1.24M
              </p>
              <p className="mt-2 text-sm text-teal">+12% vs last quarter</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.1em] text-subtle">
                Coverage Uptime
              </p>
              <p className="mt-2 font-mono text-[32px] font-medium leading-none text-white">
                99.7%
              </p>
              <p className="mt-2 text-sm text-subtle">
                Last outage: 187 days ago
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.1em] text-subtle">
                Tasks Completed Today
              </p>
              <p className="mt-2 font-mono text-[32px] font-medium leading-none text-white">
                <span ref={countRef}>0</span>
              </p>
              <Sparkline />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.1em] text-subtle">
                Scheduling Decisions
              </p>
              <p className="mt-2 font-mono text-[32px] font-medium leading-none text-white">
                340K+
              </p>
              <p className="mt-2 text-sm text-subtle">Made autonomously</p>
            </div>
          </div>

          <div className="my-8 h-px bg-line" />

          <p className="font-mono text-xs leading-relaxed text-subtle">
            12 venues deployed · 340,000+ autonomous decisions · 0 manual
            escalations today
          </p>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------ lead capture ------------------------------ */

/**
 * Email that receives audit-request notifications via FormSubmit's free AJAX
 * API (no account needed). Replace with your address, submit the form once,
 * then click the one-time activation link FormSubmit emails you.
 * While the placeholder is in place, submissions are only stored locally.
 */
const FORM_NOTIFY_EMAIL = 'legendreally@icloud.com'
const FORM_ENDPOINT = `https://formsubmit.co/ajax/${FORM_NOTIFY_EMAIL}`
const FORM_CONFIGURED = !FORM_NOTIFY_EMAIL.startsWith('YOUR_EMAIL')

/**
 * Free phone push alerts via ntfy.sh — no account, no signup.
 * Install the ntfy app (iOS/Android) and subscribe to this topic;
 * every audit request then pings your phone like a text.
 */
const NTFY_TOPIC = 'ourstaff-audit-6d56d11d80de'
const NTFY_ENDPOINT = `https://ntfy.sh/${NTFY_TOPIC}`

function LeadCapture({ reduced }: { reduced: boolean }) {
  const sectionRef = useRef<HTMLElement>(null)
  const [submitted, setSubmitted] = useState(false)
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [venues, setVenues] = useState('')

  const saveLead = (delivery: { notified: boolean; pushed: boolean }) => {
    try {
      const key = 'ourstaff_audit_requests'
      const existing = JSON.parse(
        localStorage.getItem(key) ?? '[]',
      ) as unknown[]
      existing.push({
        email,
        company,
        venues,
        requestedAt: new Date().toISOString(),
        ...delivery,
      })
      localStorage.setItem(key, JSON.stringify(existing))
    } catch {
      // storage unavailable (private mode etc.) — success state still shows
    }
  }

  const notifyByEmail = async (): Promise<boolean> => {
    if (!FORM_CONFIGURED) return false
    try {
      const res = await fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          _subject: `Audit request — ${company}`,
          email,
          company,
          venues,
        }),
      })
      return res.ok
    } catch {
      return false
    }
  }

  const notifyByPush = async (): Promise<boolean> => {
    try {
      const res = await fetch(NTFY_ENDPOINT, {
        method: 'POST',
        headers: {
          Title: `Audit request - ${company}`,
          Priority: '4',
          Tags: 'telephone_receiver',
        },
        body: `${email}\n${company} · ${venues} venues`,
      })
      return res.ok
    } catch {
      return false
    }
  }

  useEffect(() => {
    const ctx = gsap.context(() => {
      const fields = gsap.utils.toArray<HTMLElement>('.audit-field')
      if (reduced) {
        gsap.set(fields, { opacity: 1, y: 0 })
        return
      }
      gsap.fromTo(
        fields,
        { opacity: 0, y: 16 },
        {
          opacity: 1,
          y: 0,
          duration: 0.5,
          stagger: 0.05,
          ease: 'smoothOut',
          scrollTrigger: { trigger: sectionRef.current, start: 'top 75%' },
        },
      )
    }, sectionRef)
    return () => ctx.revert()
  }, [reduced, submitted])

  const inputClass =
    'w-full rounded-lg border border-line bg-transparent px-4 py-3.5 text-sm text-white placeholder:text-faint outline-none transition-all duration-300 focus:border-teal focus:shadow-[0_0_0_3px_rgba(0,229,201,0.12)]'

  return (
    <section id="audit" ref={sectionRef} className="py-[120px]">
      <div className="mx-auto max-w-[1280px] px-4 md:px-6">
        <div className="mx-auto max-w-[480px] text-center">
          <h2 className="font-display text-3xl font-bold tracking-[-0.02em] text-white md:text-5xl">
            Get an Operational Audit.
          </h2>
          <p className="mt-4 text-base leading-[1.6] text-body">
            See exactly where AI agents can replace your manual workflows. No
            sales pitch.
          </p>

          {submitted ? (
            <div className="audit-field mt-10 flex items-center justify-center gap-3 rounded-lg border border-teal bg-ink px-6 py-5">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-teal" />
              <p className="text-left text-sm leading-[1.6] text-white">
                Audit request received. We'll be in touch within 24 hours.
              </p>
            </div>
          ) : (
            <form
              className="mt-10 flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault()
                setSubmitted(true)
                void Promise.all([notifyByEmail(), notifyByPush()]).then(
                  ([notified, pushed]) => saveLead({ notified, pushed }),
                )
              }}
            >
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Work Email"
                aria-label="Work Email"
                className={`audit-field ${inputClass}`}
              />
              <input
                type="text"
                required
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Company Name"
                aria-label="Company Name"
                className={`audit-field ${inputClass}`}
              />
              <select
                required
                value={venues}
                onChange={(e) => setVenues(e.target.value)}
                aria-label="Venue Count"
                className={`audit-field ${inputClass} appearance-none bg-obsidian ${venues === '' ? 'text-faint' : 'text-white'}`}
              >
                <option value="" disabled>
                  Venue Count
                </option>
                <option value="1-5">1–5</option>
                <option value="6-20">6–20</option>
                <option value="21+">21+</option>
              </select>
              <button
                type="submit"
                className="audit-field w-full rounded-lg bg-teal px-4 py-3.5 text-sm font-semibold text-white transition-colors duration-300 hover:bg-white hover:text-obsidian"
              >
                Request Audit
              </button>
              <p className="audit-field text-xs text-faint">
                We don't share your data. Unsubscribe anytime.
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}

/* --------------------------------- footer --------------------------------- */

function Footer() {
  return (
    <footer className="border-t border-line py-12">
      <div className="mx-auto flex max-w-[1280px] flex-col items-center justify-between gap-4 px-6 sm:flex-row">
        <p className="text-sm text-faint">© 2025 OurStaff.Space</p>
        <div className="flex items-center gap-6">
          <a href="#" className="text-sm text-faint transition-colors duration-300 hover:text-body">
            Privacy
          </a>
          <a href="#" className="text-sm text-faint transition-colors duration-300 hover:text-body">
            Terms
          </a>
        </div>
      </div>
    </footer>
  )
}

/* ----------------------------------- app ----------------------------------- */

export default function App() {
  const reduced = useReducedMotion()

  useEffect(() => {
    return () => {
      ScrollTrigger.getAll().forEach((t) => t.kill())
    }
  }, [])

  return (
    <main className="min-h-screen bg-obsidian">
      <Hero reduced={reduced} />
      <AgentSwarm reduced={reduced} />
      <PilotDashboard reduced={reduced} />
      <LeadCapture reduced={reduced} />
      <Footer />
    </main>
  )
}

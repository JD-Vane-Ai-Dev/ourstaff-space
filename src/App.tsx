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
  Lock,
  ShieldCheck,
  EyeOff,
  ChevronDown,
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

/* ---------------------------------- logo ---------------------------------- */

function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      className="shrink-0"
    >
      <g stroke="#27272A" strokeWidth="3">
        <line x1="20" y1="20" x2="44" y2="20" />
        <line x1="20" y1="20" x2="32" y2="44" />
        <line x1="44" y1="20" x2="32" y2="44" />
      </g>
      <circle cx="20" cy="20" r="6" fill="#00E5C9" />
      <circle cx="44" cy="20" r="6" fill="#00E5C9" />
      <circle cx="32" cy="44" r="6" fill="#FF6B35" />
    </svg>
  )
}

function Wordmark() {
  return (
    <a href="#top" className="flex items-center gap-2.5">
      <LogoMark />
      <span className="font-display text-lg font-bold tracking-[-0.02em] text-white">
        OurStaff<span className="text-teal">.Space</span>
      </span>
    </a>
  )
}

/* ----------------------------------- nav ----------------------------------- */

const NAV_LINKS = [
  { label: 'The Swarm', href: '#swarm' },
  { label: 'Process', href: '#process' },
  { label: 'Live Pilot', href: '#pilot' },
  { label: 'The Math', href: '#roi' },
  { label: 'FAQ', href: '#faq' },
]

function Nav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-line/60 bg-obsidian/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-6">
        <Wordmark />
        <nav className="hidden items-center gap-8 lg:flex">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-body transition-colors duration-300 hover:text-white"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <a
          href="#audit"
          className="rounded-lg bg-teal px-5 py-2.5 text-sm font-semibold text-obsidian transition-colors duration-300 hover:bg-white"
        >
          Request Audit
        </a>
      </div>
    </header>
  )
}

/* ---------------------------- scroll reveal hook ---------------------------- */

function useReveal(
  ref: React.RefObject<HTMLElement | null>,
  reduced: boolean,
) {
  useEffect(() => {
    const ctx = gsap.context(() => {
      const items = gsap.utils.toArray<HTMLElement>('.reveal-item')
      if (!items.length) return
      if (reduced) {
        gsap.set(items, { opacity: 1, y: 0 })
        return
      }
      gsap.fromTo(
        items,
        { opacity: 0, y: 24 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          stagger: 0.08,
          ease: 'smoothOut',
          scrollTrigger: { trigger: ref.current, start: 'top 75%' },
        },
      )
    }, ref)
    return () => ctx.revert()
  }, [ref, reduced])
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
    <section id="top" className="relative flex min-h-screen items-center overflow-hidden">
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
    <section id="swarm" ref={sectionRef} className="scroll-mt-16 py-[120px]">
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
    <section id="pilot" ref={sectionRef} className="scroll-mt-16 py-[120px]">
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
    <section id="audit" ref={sectionRef} className="scroll-mt-16 py-[120px]">
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

/* ------------------------------ social proof ------------------------------ */

function ProofStrip({ reduced }: { reduced: boolean }) {
  const sectionRef = useRef<HTMLElement>(null)
  useReveal(sectionRef, reduced)

  return (
    <section ref={sectionRef} className="border-y border-line bg-screen py-20">
      <div className="mx-auto max-w-[1280px] px-6">
        <figure className="reveal-item mx-auto max-w-[820px] text-center">
          <blockquote className="font-display text-xl font-medium leading-[1.5] tracking-[-0.02em] text-white md:text-2xl">
            "The scheduling agent ended our Sunday-night roster calls. We
            stopped finding coverage gaps after week two."
          </blockquote>
          <figcaption className="mt-6">
            <span className="text-sm font-medium text-white">
              Dana Whitfield
            </span>
            <span className="text-sm text-subtle">
              {' '}
              · General Manager, Grand Harbor Resort
            </span>
          </figcaption>
        </figure>
        <div className="reveal-item mx-auto mt-10 flex max-w-[820px] flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {['Resorts', 'Hotels', 'Restaurant Groups', 'Event Venues'].map(
            (t) => (
              <span
                key={t}
                className="font-mono text-xs uppercase tracking-[0.1em] text-faint"
              >
                {t}
              </span>
            ),
          )}
        </div>
      </div>
    </section>
  )
}

/* --------------------------------- process -------------------------------- */

const PROCESS_STEPS = [
  {
    num: '01',
    title: 'Operational Audit',
    when: 'Days 1–5',
    body: 'We map your scheduling, purchasing, and content workflows. You get a report showing which tasks agents take over and what stays with your team.',
  },
  {
    num: '02',
    title: 'Live Pilot',
    when: 'Days 6–35',
    body: 'Agents run one venue under supervision. Your managers approve every escalation. We measure hours removed and gaps closed.',
  },
  {
    num: '03',
    title: 'Full Deployment',
    when: 'Day 36 onward',
    body: 'Agents take the approved workflows across all venues. Weekly reports. Humans stay on every escalation path.',
  },
]

function Process({ reduced }: { reduced: boolean }) {
  const sectionRef = useRef<HTMLElement>(null)
  useReveal(sectionRef, reduced)

  return (
    <section id="process" ref={sectionRef} className="scroll-mt-16 py-[120px]">
      <div className="mx-auto max-w-[1280px] px-6">
        <SectionLabel>HOW IT WORKS</SectionLabel>
        <h2 className="reveal-item mt-4 max-w-[720px] font-display text-3xl font-bold tracking-[-0.02em] text-white md:text-5xl">
          From Audit to Autonomous in Five Weeks.
        </h2>
        <p className="reveal-item mt-4 max-w-[640px] text-base leading-[1.6] text-body">
          No rip-and-replace. Agents prove themselves on one venue before they
          touch the rest.
        </p>

        <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3">
          {PROCESS_STEPS.map((s) => (
            <div
              key={s.num}
              className="reveal-item rounded-xl border border-line bg-ink p-8"
            >
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-2xl font-medium text-teal">
                  {s.num}
                </span>
                <span className="font-mono text-xs uppercase tracking-[0.1em] text-faint">
                  {s.when}
                </span>
              </div>
              <h3 className="mt-6 font-display text-xl font-bold tracking-[-0.02em] text-white">
                {s.title}
              </h3>
              <p className="mt-3 text-sm leading-[1.6] text-body">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ----------------------------- roi calculator ----------------------------- */

function ROICalculator({ reduced }: { reduced: boolean }) {
  const sectionRef = useRef<HTMLElement>(null)
  useReveal(sectionRef, reduced)

  const [venues, setVenues] = useState(5)
  const [hours, setHours] = useState(12)
  const [rate, setRate] = useState(28)

  const hoursBack = Math.round(hours * 0.7 * venues)
  const annualSaved = Math.round(hours * 0.7 * venues * rate * 52)

  const sliderClass =
    'w-full accent-teal cursor-pointer'

  return (
    <section id="roi" ref={sectionRef} className="scroll-mt-16 py-[120px]">
      <div className="mx-auto max-w-[1280px] px-6">
        <SectionLabel>THE MATH</SectionLabel>
        <h2 className="reveal-item mt-4 max-w-[720px] font-display text-3xl font-bold tracking-[-0.02em] text-white md:text-5xl">
          Run Your Own Numbers.
        </h2>
        <p className="reveal-item mt-4 max-w-[640px] text-base leading-[1.6] text-body">
          Scheduling coordination eats manager hours. Drag the sliders to your
          operation.
        </p>

        <div className="reveal-item mt-12 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-line bg-line lg:grid-cols-2">
          {/* inputs */}
          <div className="bg-ink p-8">
            <div>
              <div className="flex items-baseline justify-between">
                <label htmlFor="roi-venues" className="text-sm text-body">
                  Venues
                </label>
                <span className="font-mono text-lg text-white">{venues}</span>
              </div>
              <input
                id="roi-venues"
                type="range"
                min={1}
                max={50}
                value={venues}
                onChange={(e) => setVenues(Number(e.target.value))}
                className={`mt-3 ${sliderClass}`}
              />
            </div>
            <div className="mt-8">
              <div className="flex items-baseline justify-between">
                <label htmlFor="roi-hours" className="text-sm text-body">
                  Scheduling hours per venue, per week
                </label>
                <span className="font-mono text-lg text-white">{hours}</span>
              </div>
              <input
                id="roi-hours"
                type="range"
                min={2}
                max={40}
                value={hours}
                onChange={(e) => setHours(Number(e.target.value))}
                className={`mt-3 ${sliderClass}`}
              />
            </div>
            <div className="mt-8">
              <div className="flex items-baseline justify-between">
                <label htmlFor="roi-rate" className="text-sm text-body">
                  Loaded hourly cost of a scheduler
                </label>
                <span className="font-mono text-lg text-white">${rate}</span>
              </div>
              <input
                id="roi-rate"
                type="range"
                min={18}
                max={60}
                value={rate}
                onChange={(e) => setRate(Number(e.target.value))}
                className={`mt-3 ${sliderClass}`}
              />
            </div>
          </div>

          {/* outputs */}
          <div className="flex flex-col justify-center bg-screen p-8">
            <p className="text-xs uppercase tracking-[0.1em] text-subtle">
              Manager hours back, per week
            </p>
            <p className="mt-2 font-mono text-[40px] font-medium leading-none text-white">
              {hoursBack.toLocaleString('en-US')}
            </p>
            <div className="my-8 h-px bg-line" />
            <p className="text-xs uppercase tracking-[0.1em] text-subtle">
              Labor cost removed, per year
            </p>
            <p className="mt-2 font-mono text-[40px] font-medium leading-none text-teal">
              ${annualSaved.toLocaleString('en-US')}
            </p>
            <p className="mt-6 text-xs leading-[1.6] text-faint">
              Assumes agents take 70% of scheduling coordination — the median
              across current deployments. Your audit report uses your actual
              numbers.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

/* -------------------------------- security -------------------------------- */

const SECURITY_ITEMS = [
  {
    icon: Lock,
    title: 'Encrypted end to end',
    body: 'Data is encrypted in transit and at rest. Access is logged.',
  },
  {
    icon: ShieldCheck,
    title: 'Humans on the escalation path',
    body: 'Low-confidence decisions go to a named person on your team. Every agent action is logged and reversible.',
  },
  {
    icon: EyeOff,
    title: 'Your data stays yours',
    body: 'Never sold, never shared. Deleted on request, exported anytime.',
  },
]

function SecurityStrip({ reduced }: { reduced: boolean }) {
  const sectionRef = useRef<HTMLElement>(null)
  useReveal(sectionRef, reduced)

  return (
    <section ref={sectionRef} className="border-y border-line bg-screen py-20">
      <div className="mx-auto max-w-[1280px] px-6">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
          {SECURITY_ITEMS.map((item) => (
            <div key={item.title} className="reveal-item flex gap-4">
              <item.icon className="mt-0.5 h-5 w-5 shrink-0 text-teal" />
              <div>
                <h3 className="text-sm font-semibold text-white">
                  {item.title}
                </h3>
                <p className="mt-1.5 text-sm leading-[1.6] text-body">
                  {item.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ---------------------------------- faq ----------------------------------- */

const FAQ_ITEMS = [
  {
    q: 'What happens when an agent makes the wrong call?',
    a: 'Agents act only above a confidence threshold. Below it, the task goes to a named human on your team with full context. Every action is logged and reversible.',
  },
  {
    q: 'Does this replace my staff?',
    a: 'No. Agents take coordination work — roster calls, vendor chasing, copy drafts. Guest-facing and judgment work stays with your team.',
  },
  {
    q: 'What systems does it connect to?',
    a: 'Common PMS, payroll, and scheduling tools through their APIs. If a system has no API, agents work from scheduled exports.',
  },
  {
    q: 'How much does it cost?',
    a: 'The audit is free. The pilot is a flat fee. After that, a per-venue monthly rate. No per-seat charges.',
  },
  {
    q: 'Who sees our data?',
    a: 'Only your team. Data is encrypted in transit and at rest, never sold or shared, and deleted on request.',
  },
  {
    q: 'How long are we locked in?',
    a: 'The pilot runs 30 days. After that, month-to-month. Export your data anytime.',
  },
]

function FAQ({ reduced }: { reduced: boolean }) {
  const sectionRef = useRef<HTMLElement>(null)
  useReveal(sectionRef, reduced)
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section id="faq" ref={sectionRef} className="scroll-mt-16 py-[120px]">
      <div className="mx-auto max-w-[1280px] px-6">
        <SectionLabel>QUESTIONS</SectionLabel>
        <h2 className="reveal-item mt-4 max-w-[720px] font-display text-3xl font-bold tracking-[-0.02em] text-white md:text-5xl">
          Asked by Every Operator We Meet.
        </h2>

        <div className="reveal-item mx-auto mt-12 max-w-[820px] divide-y divide-line rounded-xl border border-line bg-ink">
          {FAQ_ITEMS.map((item, i) => {
            const isOpen = open === i
            return (
              <div key={item.q}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                >
                  <span className="text-sm font-semibold text-white md:text-base">
                    {item.q}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-teal transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                <div
                  className={`grid transition-all duration-300 ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
                >
                  <div className="overflow-hidden">
                    <p className="px-6 pb-5 text-sm leading-[1.6] text-body">
                      {item.a}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------ legal pages ------------------------------- */

const LEGAL_CONTENT = {
  privacy: {
    title: 'Privacy Policy',
    updated: 'Last updated: August 2026',
    sections: [
      {
        h: 'What we collect',
        p: 'When you request an audit, we collect your work email, company name, and venue count. We also store a copy of your request in your browser\'s local storage as a backup.',
      },
      {
        h: 'How we use it',
        p: 'We use your details to respond to your audit request and nothing else. We do not sell, rent, or share your information with third parties for their marketing.',
      },
      {
        h: 'How long we keep it',
        p: 'We keep your request details while your inquiry is active. Email us and we delete them.',
      },
      {
        h: 'Your choices',
        p: 'You can ask us to access, correct, or delete your information at any time. Every email we send includes an unsubscribe link.',
      },
      {
        h: 'Contact',
        p: 'Questions about this policy: privacy@ourstaff.space.',
      },
    ],
  },
  terms: {
    title: 'Terms of Service',
    updated: 'Last updated: August 2026',
    sections: [
      {
        h: 'The service',
        p: 'OurStaff.Space provides autonomous operations agents for hospitality venues. Submitting an audit request creates no obligation on either side.',
      },
      {
        h: 'Pilot engagements',
        p: 'Pilot terms, fees, and success metrics are agreed in writing before any deployment starts. The pilot runs 30 days unless both sides agree otherwise.',
      },
      {
        h: 'Acceptable use',
        p: 'You agree not to misuse the site or attempt to access systems or data that are not yours.',
      },
      {
        h: 'Liability',
        p: 'The site is provided as is. Figures shown from active deployments describe specific properties and time periods; your results depend on your operation.',
      },
      {
        h: 'Contact',
        p: 'Questions about these terms: legal@ourstaff.space.',
      },
    ],
  },
} as const

function LegalPage({ kind }: { kind: keyof typeof LEGAL_CONTENT }) {
  const doc = LEGAL_CONTENT[kind]

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [kind])

  return (
    <main className="min-h-screen bg-obsidian">
      <header className="border-b border-line/60">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center px-6">
          <Wordmark />
        </div>
      </header>
      <div className="mx-auto max-w-[720px] px-6 py-[120px]">
        <h1 className="font-display text-4xl font-bold tracking-[-0.02em] text-white">
          {doc.title}
        </h1>
        <p className="mt-3 font-mono text-xs uppercase tracking-[0.1em] text-faint">
          {doc.updated}
        </p>
        <div className="mt-12 flex flex-col gap-10">
          {doc.sections.map((s) => (
            <div key={s.h}>
              <h2 className="font-display text-lg font-bold text-white">
                {s.h}
              </h2>
              <p className="mt-2 text-sm leading-[1.7] text-body">{s.p}</p>
            </div>
          ))}
        </div>
        <a
          href="#top"
          className="mt-16 inline-flex items-center gap-1.5 text-sm font-medium text-teal transition-colors duration-300 hover:text-white"
        >
          <ArrowRight className="h-4 w-4 rotate-180" />
          Back to the site
        </a>
      </div>
    </main>
  )
}

/* --------------------------------- footer --------------------------------- */

function Footer() {
  return (
    <footer className="border-t border-line py-12">
      <div className="mx-auto max-w-[1280px] px-6">
        <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <Wordmark />
          <nav className="flex flex-wrap items-center gap-x-8 gap-y-3">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-sm text-faint transition-colors duration-300 hover:text-body"
              >
                {l.label}
              </a>
            ))}
          </nav>
        </div>
        <div className="mt-10 flex flex-col items-start justify-between gap-4 border-t border-line pt-8 sm:flex-row sm:items-center">
          <p className="text-sm text-faint">© 2025 OurStaff.Space</p>
          <div className="flex items-center gap-6">
            <a
              href="mailto:hello@ourstaff.space"
              className="text-sm text-faint transition-colors duration-300 hover:text-body"
            >
              Contact
            </a>
            <a
              href="#/privacy"
              className="text-sm text-faint transition-colors duration-300 hover:text-body"
            >
              Privacy
            </a>
            <a
              href="#/terms"
              className="text-sm text-faint transition-colors duration-300 hover:text-body"
            >
              Terms
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

/* ----------------------------------- app ----------------------------------- */

export default function App() {
  const reduced = useReducedMotion()
  const [route, setRoute] = useState(window.location.hash)

  useEffect(() => {
    const onHash = () => setRoute(window.location.hash)
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    return () => {
      ScrollTrigger.getAll().forEach((t) => t.kill())
    }
  }, [])

  if (route === '#/privacy') return <LegalPage kind="privacy" />
  if (route === '#/terms') return <LegalPage kind="terms" />

  return (
    <main className="min-h-screen bg-obsidian">
      <Nav />
      <Hero reduced={reduced} />
      <ProofStrip reduced={reduced} />
      <AgentSwarm reduced={reduced} />
      <Process reduced={reduced} />
      <PilotDashboard reduced={reduced} />
      <ROICalculator reduced={reduced} />
      <SecurityStrip reduced={reduced} />
      <FAQ reduced={reduced} />
      <LeadCapture reduced={reduced} />
      <Footer />
    </main>
  )
}

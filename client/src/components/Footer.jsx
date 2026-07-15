import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Minus, Plus } from 'lucide-react'

const FOOTER_SECTIONS = [
  {
    id: 'shop',
    title: 'SHOP',
    links: [
      { to: '/shop', label: 'All Shirts' },
      { to: '/shop?sort=newest', label: 'New Arrivals' },
      { to: '/shop?featured=true', label: 'Featured' },
    ],
  },
  {
    id: 'account',
    title: 'MY ACCOUNT',
    links: [
      { to: '/account', label: 'My Account' },
      { to: '/track', label: 'Track Order' },
      { to: '/account/orders', label: 'My Orders' },
    ],
  },
  {
    id: 'policies',
    title: 'POLICIES',
    links: [
      { to: '/help/policies', label: 'Shipping & Cancellation' },
      { to: '/help/privacy', label: 'Privacy Policy' },
      { to: '/help/returns', label: 'Return & Refund' },
      { to: '/help/terms', label: 'Terms of Service' },
    ],
  },
  {
    id: 'contact',
    title: 'CONTACT',
    links: [
      { to: '/contact', label: 'Contact Us' },
      { to: '/about', label: 'About Us' },
    ],
  },
]

function FooterLinks({ links, className = '' }) {
  return (
    <ul className={`space-y-3 ${className}`}>
      {links.map((link) => (
        <li key={link.to + link.label}>
          <Link to={link.to} className="text-gray-400 hover:text-white text-sm transition-colors">
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  )
}

function AccordionSection({ section, open, onToggle }) {
  const ToggleIcon = open ? Minus : Plus

  return (
    <div className="border-b border-gray-800">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between py-5 text-left"
      >
        <span className="text-sm font-semibold tracking-[0.15em] text-white">{section.title}</span>
        <ToggleIcon className="w-4 h-4 text-gray-400 flex-shrink-0" strokeWidth={1.75} />
      </button>
      {open ? (
        <div className="pb-5">
          <FooterLinks links={section.links} />
        </div>
      ) : null}
    </div>
  )
}

export default function Footer() {
  const [openSection, setOpenSection] = useState(null)
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)

  const toggleSection = (id) => {
    setOpenSection((current) => (current === id ? null : id))
  }

  const handleSubscribe = (e) => {
    e.preventDefault()
    if (!email.trim()) return
    setSubscribed(true)
    setEmail('')
  }

  return (
    <footer className="bg-black text-white mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
        {/* Mobile: keep in touch + accordions (reference style) */}
        <div className="sm:hidden">
          <div className="mb-10">
            <h3 className="text-sm font-semibold tracking-[0.2em] mb-2">KEEP IN TOUCH</h3>
            <p className="text-gray-400 text-sm leading-relaxed mb-5">
              Stay in the loop with exclusive offers and new arrivals.
            </p>
            {subscribed ? (
              <p className="text-sm text-amber-400">Thanks — you&apos;re on the list.</p>
            ) : (
              <form
                onSubmit={handleSubscribe}
                className="flex items-center border border-gray-700 focus-within:border-gray-500"
              >
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email address"
                  className="flex-1 min-w-0 bg-transparent px-3 py-3 text-sm text-white placeholder:text-gray-500 outline-none"
                />
                <button
                  type="submit"
                  className="shrink-0 px-4 py-3 text-sm font-medium text-white hover:text-amber-400 transition-colors"
                >
                  Subscribe
                </button>
              </form>
            )}
          </div>

          <div className="border-t border-gray-800">
            {FOOTER_SECTIONS.map((section) => (
              <AccordionSection
                key={section.id}
                section={section}
                open={openSection === section.id}
                onToggle={() => toggleSection(section.id)}
              />
            ))}
          </div>

          <div className="pt-8">
            <p className="text-sm font-semibold tracking-[0.2em] mb-3">SOCIAL</p>
            <a
              href="https://www.instagram.com/labelnine_in"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Instagram
            </a>
          </div>

          <p className="text-gray-500 text-xs mt-10">Copyright © 2026 Label Nine</p>
        </div>

        {/* Desktop / tablet: multi-column */}
        <div className="hidden sm:block">
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-8">
            <div>
              <h3 className="text-2xl font-bold tracking-[0.3em] mb-4">LABEL NINE</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Premium men&apos;s shirts crafted with precision and passion. Made for the modern Indian man.
              </p>
              <Link to="/about" className="inline-block mt-3 text-sm text-gray-400 hover:text-white transition-colors">
                About Us →
              </Link>
            </div>

            {FOOTER_SECTIONS.map((section) => (
              <div key={section.id}>
                <h4 className="text-sm font-semibold tracking-wider mb-4 text-gray-300">{section.title}</h4>
                <FooterLinks links={section.links} />
              </div>
            ))}
          </div>

          <div className="border-t border-gray-800 mt-10 pt-6 flex items-center justify-between gap-4">
            <a
              href="https://www.instagram.com/labelnine_in"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Instagram
            </a>
            <p className="text-gray-500 text-xs">© 2026 Label Nine. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  )
}

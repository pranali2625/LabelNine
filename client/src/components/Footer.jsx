import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'

const InstagramIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
  </svg>
)

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
    ],
  },
]

function FooterLinks({ links }) {
  return (
    <ul className="space-y-2.5">
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
  return (
    <div className="border-b border-gray-800">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between py-3.5 text-left"
      >
        <span className="text-sm font-semibold tracking-wider text-gray-300">{section.title}</span>
        <ChevronDown
          className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          strokeWidth={1.75}
        />
      </button>
      {open ? (
        <div className="pb-4">
          <FooterLinks links={section.links} />
        </div>
      ) : null}
    </div>
  )
}

export default function Footer() {
  const [openSection, setOpenSection] = useState(null)

  const toggleSection = (id) => {
    setOpenSection((current) => (current === id ? null : id))
  }

  return (
    <footer className="bg-black text-white mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
        {/* Brand */}
        <div className="mb-8 sm:mb-0 sm:hidden">
          <h3 className="text-2xl font-bold tracking-[0.3em] mb-3">LABEL NINE</h3>
          <p className="text-gray-400 text-sm leading-relaxed max-w-sm">
            Premium men&apos;s shirts crafted with precision and passion. Made for the modern Indian man.
          </p>
          <Link to="/about" className="inline-block mt-3 text-sm text-gray-400 hover:text-white transition-colors">
            About Us →
          </Link>
        </div>

        {/* Mobile: accordion menus */}
        <div className="sm:hidden border-t border-gray-800">
          {FOOTER_SECTIONS.map((section) => (
            <AccordionSection
              key={section.id}
              section={section}
              open={openSection === section.id}
              onToggle={() => toggleSection(section.id)}
            />
          ))}
        </div>

        {/* Desktop / tablet: multi-column */}
        <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-5 gap-8">
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

        {/* Social + copyright */}
        <div className="border-t border-gray-800 mt-8 sm:mt-10 pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold tracking-wider text-gray-500 sm:hidden">FOLLOW US</span>
            <a
              href="https://www.instagram.com/labelnine_in"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="inline-flex text-gray-400 hover:text-white transition-colors"
            >
              <InstagramIcon />
            </a>
          </div>
          <p className="text-gray-500 text-xs">© 2026 Label Nine. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

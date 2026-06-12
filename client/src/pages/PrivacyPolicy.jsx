import {
  Shield,
  Database,
  Eye,
  Lock,
  Share2,
  Cookie,
  UserCheck,
  Mail,
  Phone,
  ChevronRight
} from 'lucide-react'

const BRAND = 'Label Nine'
const EMAIL = 'hello@labelnine.com'
const PHONE = '+91 00000 00000'

function SectionCard({ icon: Icon, title, children }) {
  return (
    <div className="bg-white border border-gray-200 p-6 md:p-8">
      <div className="flex items-start gap-4 mb-5">
        <div className="p-2.5 bg-black text-white shrink-0">
          <Icon className="w-5 h-5" />
        </div>
        <h3 className="text-lg font-bold tracking-tight pt-1">{title}</h3>
      </div>
      <div className="text-gray-600 leading-relaxed text-sm md:text-base pl-0 md:pl-14">
        {children}
      </div>
    </div>
  )
}

function BulletList({ items }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5">
          <ChevronRight className="w-4 h-4 text-amber-500 shrink-0 mt-1" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

export default function PrivacyPolicy() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-black text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-black/95 to-amber-900/25 z-10" />
        <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 py-20 md:py-28">
          <p className="text-amber-400 text-sm tracking-[0.4em] mb-4 font-medium">HELP CENTER</p>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 max-w-2xl">
            Privacy Policy
          </h1>
          <p className="text-gray-300 max-w-xl leading-relaxed">
            Welcome to {BRAND}. We value your privacy and are committed to protecting your personal information.
          </p>
          <p className="text-gray-500 text-sm mt-6">Last updated June 2026</p>
        </div>
      </section>

      {/* Content */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 md:py-20">
        <div className="grid md:grid-cols-2 gap-5 md:gap-6">
          <SectionCard icon={Database} title="Information We Collect">
            <p className="mb-4">
              When you visit our website, place an order, or contact us, we may collect:
            </p>
            <BulletList items={[
              'Name',
              'Email address',
              'Phone number',
              'Shipping and billing address',
              'Payment information (processed securely through payment gateways)',
              'Website usage information and cookies'
            ]} />
          </SectionCard>

          <SectionCard icon={Eye} title="How We Use Your Information">
            <p className="mb-4">We use your information to:</p>
            <BulletList items={[
              'Process and deliver orders',
              'Provide customer support',
              'Send order updates',
              'Improve our products and services',
              'Prevent fraud and unauthorized transactions',
              'Send promotional communications (only if you opt-in)'
            ]} />
          </SectionCard>

          <SectionCard icon={Lock} title="Data Security">
            <p>
              We implement reasonable security measures to protect your information. However, no method of internet transmission is 100% secure.
            </p>
          </SectionCard>

          <SectionCard icon={Share2} title="Sharing of Information">
            <p className="mb-4">We do not sell your personal information. We may share information with:</p>
            <BulletList items={[
              'Payment processors',
              'Shipping and logistics partners',
              'Government authorities when legally required'
            ]} />
          </SectionCard>

          <SectionCard icon={Cookie} title="Cookies">
            <p>
              Our website may use cookies to improve user experience and website functionality.
            </p>
          </SectionCard>

          <SectionCard icon={UserCheck} title="Your Rights">
            <p>
              You may request access, correction, or deletion of your personal information by contacting us.
            </p>
          </SectionCard>
        </div>
      </section>

      {/* Contact */}
      <section className="bg-black text-white py-14 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
            <div>
              <p className="text-amber-400 text-xs tracking-[0.3em] mb-3 font-medium">PRIVACY INQUIRIES</p>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
                <Shield className="w-7 h-7 text-amber-400 hidden sm:block" />
                Contact Us
              </h2>
              <p className="text-gray-400 text-sm max-w-md">
                For privacy-related inquiries regarding your personal data, reach out to {BRAND} during business hours.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href={`mailto:${EMAIL}`}
                className="inline-flex items-center justify-center gap-2 bg-white text-black px-6 py-3.5 text-sm font-semibold tracking-wide hover:bg-amber-400 transition-colors"
              >
                <Mail className="w-4 h-4" /> {EMAIL}
              </a>
              <a
                href={`tel:${PHONE.replace(/\s/g, '')}`}
                className="inline-flex items-center justify-center gap-2 border border-gray-600 text-white px-6 py-3.5 text-sm font-semibold tracking-wide hover:border-amber-400 hover:text-amber-400 transition-colors"
              >
                <Phone className="w-4 h-4" /> {PHONE}
              </a>
            </div>
          </div>
          <p className="text-gray-600 text-xs mt-8">Mon–Sat, 10am–6pm IST</p>
        </div>
      </section>
    </div>
  )
}

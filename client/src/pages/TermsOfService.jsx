import { Link } from 'react-router-dom'
import {
  FileText,
  CheckCircle,
  Tag,
  ShoppingBag,
  Copyright,
  UserX,
  Scale,
  Truck,
  RefreshCw,
  Gavel,
  Mail,
  Phone,
  MapPin,
  ChevronRight
} from 'lucide-react'

const BRAND = 'Label Nine'
const EMAIL = 'hello@labelnine.com'
const PHONE = '+91 00000 00000'
const ADDRESS = 'Kolhapur, Maharashtra, India'

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

export default function TermsOfService() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-black text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-black/95 to-amber-900/25 z-10" />
        <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 py-20 md:py-28">
          <p className="text-amber-400 text-sm tracking-[0.4em] mb-4 font-medium">LEGAL</p>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 max-w-2xl">
            Terms of Service
          </h1>
          <p className="text-gray-300 max-w-xl leading-relaxed">
            By using the website of {BRAND}, you agree to the following Terms of Service.
          </p>
          <p className="text-gray-500 text-sm mt-6">Last updated June 2026</p>
        </div>
      </section>

      {/* Content */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 md:py-20">
        <div className="grid md:grid-cols-2 gap-5 md:gap-6">
          <SectionCard icon={CheckCircle} title="Acceptance of Terms">
            <p>
              By accessing our website, you agree to comply with these terms and applicable laws.
            </p>
          </SectionCard>

          <SectionCard icon={Tag} title="Products and Pricing">
            <p className="mb-4">
              We strive to ensure accurate product descriptions and pricing. However, errors may occasionally occur.
            </p>
            <p className="mb-4">We reserve the right to:</p>
            <BulletList items={[
              'Modify prices without prior notice',
              'Discontinue products',
              'Refuse or cancel orders if pricing errors are identified'
            ]} />
          </SectionCard>

          <SectionCard icon={ShoppingBag} title="Orders">
            <p className="mb-4">We reserve the right to:</p>
            <BulletList items={[
              'Reject suspicious or fraudulent orders',
              'Limit quantities purchased per customer',
              'Request additional verification when necessary'
            ]} />
          </SectionCard>

          <SectionCard icon={Copyright} title="Intellectual Property">
            <p className="mb-4">All content on this website, including:</p>
            <BulletList items={[
              'Logos',
              'Images',
              'Product designs',
              'Text',
              'Graphics'
            ]} />
            <p className="mt-4">
              is the property of {BRAND} and may not be copied or used without permission.
            </p>
          </SectionCard>

          <SectionCard icon={UserX} title="User Conduct">
            <p className="mb-4">Users must not:</p>
            <BulletList items={[
              'Violate applicable laws',
              'Attempt unauthorized access to the website',
              'Use the website for fraudulent activities',
              'Interfere with website operations'
            ]} />
          </SectionCard>

          <SectionCard icon={Scale} title="Limitation of Liability">
            <p>
              {BRAND} shall not be liable for indirect, incidental, or consequential damages arising from the use of our website or products.
            </p>
          </SectionCard>

          <SectionCard icon={Truck} title="Shipping">
            <p className="mb-4">
              Delivery timelines are estimates and may vary due to factors beyond our control.
            </p>
            <Link
              to="/help/policies"
              className="text-sm font-medium text-black underline hover:text-amber-600 transition-colors"
            >
              View shipping policy →
            </Link>
          </SectionCard>

          <SectionCard icon={RefreshCw} title="Changes to Terms">
            <p>
              We reserve the right to update these Terms of Service at any time. Changes become effective upon publication on the website.
            </p>
          </SectionCard>

          <SectionCard icon={Gavel} title="Governing Law">
            <p className="mb-4">These terms shall be governed by the laws of India.</p>
            <p>
              Any disputes shall be subject to the jurisdiction of courts in Kolhapur, Maharashtra, India.
            </p>
          </SectionCard>
        </div>
      </section>

      {/* Contact */}
      <section className="bg-black text-white py-14 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8">
            <div>
              <p className="text-amber-400 text-xs tracking-[0.3em] mb-3 font-medium">CONTACT</p>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-4 flex items-center gap-3">
                <FileText className="w-7 h-7 text-amber-400 hidden sm:block" />
                Contact Information
              </h2>
              <p className="font-semibold text-white mb-4">{BRAND}</p>
              <ul className="space-y-3 text-sm text-gray-400">
                <li className="flex items-center gap-2">
                  <Mail className="w-4 h-4 shrink-0 text-amber-400" />
                  <a href={`mailto:${EMAIL}`} className="hover:text-white transition-colors">{EMAIL}</a>
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="w-4 h-4 shrink-0 text-amber-400" />
                  <a href={`tel:${PHONE.replace(/\s/g, '')}`} className="hover:text-white transition-colors">{PHONE}</a>
                </li>
                <li className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                  <span>{ADDRESS}</span>
                </li>
              </ul>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 md:pt-12">
              <a
                href={`mailto:${EMAIL}`}
                className="inline-flex items-center justify-center gap-2 bg-white text-black px-6 py-3.5 text-sm font-semibold tracking-wide hover:bg-amber-400 transition-colors"
              >
                <Mail className="w-4 h-4" /> Email Us
              </a>
              <a
                href={`tel:${PHONE.replace(/\s/g, '')}`}
                className="inline-flex items-center justify-center gap-2 border border-gray-600 text-white px-6 py-3.5 text-sm font-semibold tracking-wide hover:border-amber-400 hover:text-amber-400 transition-colors"
              >
                <Phone className="w-4 h-4" /> Call Us
              </a>
            </div>
          </div>
          <p className="text-gray-600 text-xs mt-8">Mon–Sat, 10am–6pm IST</p>
        </div>
      </section>
    </div>
  )
}

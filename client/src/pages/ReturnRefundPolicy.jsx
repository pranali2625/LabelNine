import { Link } from 'react-router-dom'
import { SUPPORT_EMAIL as EMAIL, SUPPORT_PHONE, SUPPORT_PHONE_DISPLAY as PHONE } from '../constants/contact'
import {
  PackageCheck,
  ClipboardList,
  XCircle,
  Mail,
  Phone,
  RotateCcw,
  RefreshCw,
  Ban,
  ChevronRight
} from 'lucide-react'

const BRAND = 'Label Nine'

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

export default function ReturnRefundPolicy() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-black text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-black/95 to-amber-900/25 z-10" />
        <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 py-20 md:py-28">
          <p className="text-amber-400 text-sm tracking-[0.4em] mb-4 font-medium">HELP CENTER</p>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 max-w-2xl">
            Return &amp; Refund Policy
          </h1>
          <p className="text-gray-300 max-w-xl leading-relaxed">
            At {BRAND}, customer satisfaction is important to us.
          </p>
          <p className="text-gray-500 text-sm mt-6">Last updated June 2026</p>
        </div>
      </section>

      {/* Quick note */}
      <section className="bg-amber-400 text-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <p className="text-sm md:text-base font-medium text-center">
            Return requests must be submitted within <strong>3 days</strong> of delivery.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 md:py-20">
        <div className="grid md:grid-cols-2 gap-5 md:gap-6">
          <SectionCard icon={PackageCheck} title="Return Eligibility">
            <p className="mb-4">Products can be returned if:</p>
            <BulletList items={[
              'The item is damaged upon delivery.',
              'The wrong item was delivered.',
              'The product has a manufacturing defect.'
            ]} />
            <p className="mt-4 text-sm font-medium text-black">
              Returns must be requested within 3 days of delivery.
            </p>
          </SectionCard>

          <SectionCard icon={ClipboardList} title="Conditions for Return">
            <p className="mb-4">Items must:</p>
            <BulletList items={[
              'Be unused and unwashed',
              'Have original tags attached',
              'Be returned in original packaging',
              'Not show signs of wear or damage caused by the customer'
            ]} />
          </SectionCard>

          <SectionCard icon={XCircle} title="Non-Returnable Items">
            <p className="mb-4">We do not accept returns for:</p>
            <BulletList items={[
              'Used or washed products',
              'Products without tags',
              'Products damaged by misuse',
              'Clearance or final-sale items (if applicable)'
            ]} />
          </SectionCard>

          <SectionCard icon={Mail} title="Return Process">
            <p className="mb-4">To initiate a return:</p>
            <BulletList items={[
              <>Email us at <a href={`mailto:${EMAIL}`} className="text-black font-medium underline hover:text-amber-600 transition-colors">{EMAIL}</a></>,
              'Share your order number',
              'Attach photos of the issue',
              'Our team will review the request within 2–3 business days'
            ]} />
          </SectionCard>

          <SectionCard icon={RotateCcw} title="Refunds">
            <p className="mb-4">Once the returned product is received and inspected:</p>
            <BulletList items={[
              'Refunds will be processed within 7–10 business days.',
              'Refunds will be credited to the original payment method.'
            ]} />
            <p className="mt-4">
              To be eligible for a full refund, items must be returned in their original condition—unused, unwashed, and with all original tags and packaging intact. We reserve the right to refuse a refund or apply a restocking fee if the returned item is found to be used, altered, or damaged.
            </p>
          </SectionCard>

          <SectionCard icon={RefreshCw} title="Exchange Policy">
            <p>
              We currently offer exchanges subject to stock availability.
            </p>
          </SectionCard>

          <SectionCard icon={Ban} title="Cancellation Policy">
            <p className="mb-4">
              Orders may be cancelled before dispatch. Once shipped, cancellation requests may not be accepted.
            </p>
            <Link
              to="/help/policies#cancellation"
              className="text-sm font-medium text-black underline hover:text-amber-600 transition-colors"
            >
              View full cancellation policy →
            </Link>
          </SectionCard>
        </div>
      </section>

      {/* Contact */}
      <section className="bg-black text-white py-14 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
            <div>
              <p className="text-amber-400 text-xs tracking-[0.3em] mb-3 font-medium">RETURNS &amp; REFUNDS</p>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">Need to return an item?</h2>
              <p className="text-gray-400 text-sm max-w-md">
                Email us with your order number and photos. Our team will guide you through the next steps.
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
                href={`tel:+91${SUPPORT_PHONE}`}
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

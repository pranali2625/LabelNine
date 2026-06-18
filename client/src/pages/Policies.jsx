import {
  Truck,
  Package,
  MapPin,
  Clock,
  RotateCcw,
  Ban,
  AlertTriangle,
  Mail,
  Phone,
  ChevronRight
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { SUPPORT_EMAIL as EMAIL, SUPPORT_PHONE, SUPPORT_PHONE_DISPLAY as PHONE } from '../constants/contact'

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

export default function Policies() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-black text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-black/95 to-amber-900/25 z-10" />
        <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 py-20 md:py-28">
          <p className="text-amber-400 text-sm tracking-[0.4em] mb-4 font-medium">HELP CENTER</p>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 max-w-2xl">
            Shipping &amp; Cancellation
          </h1>
          <p className="text-gray-300 max-w-xl leading-relaxed">
            Everything you need to know about how we deliver your orders and handle cancellations.
          </p>
          <p className="text-gray-500 text-sm mt-6">Last updated June 2026</p>
        </div>
      </section>

      {/* Quick stats */}
      <section className="bg-amber-400 text-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 md:gap-8">
            <div className="text-center sm:text-left">
              <p className="text-xs font-semibold tracking-[0.2em] mb-1">PROCESSING</p>
              <p className="text-2xl font-bold">1–3 days</p>
              <p className="text-sm opacity-80 mt-1">After payment confirmation</p>
            </div>
            <div className="text-center sm:text-left sm:border-x sm:border-black/10 sm:px-8">
              <p className="text-xs font-semibold tracking-[0.2em] mb-1">MAHARASHTRA</p>
              <p className="text-2xl font-bold">2–5 days</p>
              <p className="text-sm opacity-80 mt-1">Estimated delivery</p>
            </div>
            <div className="text-center sm:text-left">
              <p className="text-xs font-semibold tracking-[0.2em] mb-1">REST OF INDIA</p>
              <p className="text-2xl font-bold">4–8 days</p>
              <p className="text-sm opacity-80 mt-1">Estimated delivery</p>
            </div>
          </div>
        </div>
      </section>

      {/* Shipping Policy */}
      <section id="shipping" className="scroll-mt-24 max-w-7xl mx-auto px-4 sm:px-6 py-16 md:py-20">
        <div className="mb-10 md:mb-12">
          <p className="text-xs tracking-[0.3em] text-gray-500 mb-2">POLICY 01</p>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-3">Shipping Policy</h2>
          <p className="text-gray-600 max-w-2xl leading-relaxed">
            At {BRAND}, we are committed to delivering your orders safely and on time.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-5 md:gap-6">
          <SectionCard icon={Clock} title="Order Processing">
            <BulletList items={[
              'Orders are usually processed within 1–3 business days after payment confirmation.',
              'Orders placed on weekends or public holidays will be processed on the next working day.',
              'During sales, festive seasons, or special promotions, processing times may be slightly longer.'
            ]} />
          </SectionCard>

          <SectionCard icon={MapPin} title="Shipping Coverage">
            <p>
              We currently ship across India and plan to expand to international markets in the future.
            </p>
          </SectionCard>

          <SectionCard icon={Truck} title="Shipping Charges">
            <BulletList items={[
              'Shipping charges, if applicable, will be displayed at checkout before payment.',
            ]} />
          </SectionCard>

          <SectionCard icon={Package} title="Order Tracking">
            <p>
              Once your order is shipped, tracking details will be shared via email, SMS, or WhatsApp (if available).
            </p>
          </SectionCard>

          <SectionCard icon={Truck} title="Delivery Timeline">
            <p className="mb-4">Estimated delivery times:</p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-gray-50 border border-gray-100 p-4 text-center">
                <p className="text-xs tracking-wide text-gray-500 mb-1">Maharashtra</p>
                <p className="font-bold text-black">2–5 days</p>
              </div>
              <div className="bg-gray-50 border border-gray-100 p-4 text-center">
                <p className="text-xs tracking-wide text-gray-500 mb-1">Rest of India</p>
                <p className="font-bold text-black">4–8 days</p>
              </div>
            </div>
            <p className="text-sm">
              Timelines are estimates and may vary due to weather, logistics issues, remote locations, public holidays, or other unforeseen circumstances.
            </p>
          </SectionCard>

          <SectionCard icon={AlertTriangle} title="Delivery Attempts">
            <p>
              Our courier partners may make multiple delivery attempts. If delivery cannot be completed due to incorrect address details or customer unavailability, additional shipping charges may apply for re-shipment.
            </p>
          </SectionCard>

          <SectionCard icon={Package} title="Damaged Package">
            <p className="mb-4">If the package appears damaged at the time of delivery:</p>
            <BulletList items={[
              'Take photos before opening.',
              'Contact us within 24 hours of delivery.',
              <>Email us at <a href={`mailto:${EMAIL}`} className="text-black font-medium underline hover:text-amber-600 transition-colors">{EMAIL}</a> with your order details and photographs.</>
            ]} />
          </SectionCard>
        </div>
      </section>

      {/* Cancellation Policy */}
      <section id="cancellation" className="scroll-mt-24 bg-gray-50 py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="mb-10 md:mb-12">
            <p className="text-xs tracking-[0.3em] text-gray-500 mb-2">POLICY 02</p>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-3">Cancellation Policy</h2>
            <p className="text-gray-600 max-w-2xl leading-relaxed">
              At {BRAND}, we understand that sometimes you may need to cancel an order.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-5 md:gap-6">
            <SectionCard icon={Ban} title="Order Cancellation by Customer">
              <p className="mb-4">Orders can be cancelled before they are shipped or dispatched from our warehouse. Cancellation requests must be submitted as soon as possible after placing the order.</p>
              <p className="text-sm font-medium text-black mb-2">To request a cancellation, contact us:</p>
              <div className="space-y-2 text-sm">
                <a href={`mailto:${EMAIL}`} className="flex items-center gap-2 hover:text-black transition-colors">
                  <Mail className="w-4 h-4 shrink-0" /> {EMAIL}
                </a>
                <a href={`tel:+91${SUPPORT_PHONE}`} className="flex items-center gap-2 hover:text-black transition-colors">
                  <Phone className="w-4 h-4 shrink-0" /> {PHONE}
                </a>
              </div>
            </SectionCard>

            <SectionCard icon={Truck} title="Orders Already Shipped">
              <p>
                Once an order has been shipped, it cannot be cancelled. Customers may refer to our{' '}
                <Link to="/help/returns" className="text-black font-medium underline hover:text-amber-600 transition-colors">
                  Return &amp; Refund Policy
                </Link>{' '}
                for eligible return requests after delivery.
              </p>
            </SectionCard>

            <SectionCard icon={RotateCcw} title="Refund for Cancelled Orders">
              <BulletList items={[
                'If an order is successfully cancelled before shipment, a full refund will be processed.',
                'Refunds are usually credited within 5–10 business days to the original payment method.'
              ]} />
            </SectionCard>

            <SectionCard icon={AlertTriangle} title={`Cancellation by ${BRAND}`}>
              <p className="mb-4">We reserve the right to cancel orders in the following situations:</p>
              <BulletList items={[
                'Product unavailable or out of stock',
                'Payment not received or payment verification failure',
                'Suspected fraudulent activity',
                'Incorrect pricing or product information due to technical errors',
                'Delivery location not serviceable by our logistics partners'
              ]} />
              <p className="mt-4 text-sm">In such cases, a full refund will be issued.</p>
            </SectionCard>

            <SectionCard icon={Package} title="Modification of Orders">
              <p className="mb-4">If you wish to change your shipping address, contact details, or product size (before dispatch), please contact us immediately.</p>
              <p>We will try our best to accommodate changes before the order is shipped.</p>
            </SectionCard>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="bg-black text-white py-14 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
            <div>
              <p className="text-amber-400 text-xs tracking-[0.3em] mb-3 font-medium">NEED HELP?</p>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">We're here for you</h2>
              <p className="text-gray-400 text-sm max-w-md">
                For shipping, cancellation, or order-related inquiries — reach out anytime during business hours.
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

import { Mail, Phone, Clock } from 'lucide-react'
import { SUPPORT_EMAIL, SUPPORT_PHONE, SUPPORT_PHONE_DISPLAY } from '../constants/contact'

export default function Contact() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
      <p className="text-xs text-gray-500 tracking-[0.2em] mb-2">SUPPORT</p>
      <h1 className="text-2xl md:text-3xl font-bold mb-3">Contact Us</h1>
      <p className="text-gray-600 text-sm mb-10 leading-relaxed">
        Have a question about your order, sizing, or delivery? Reach out and we&apos;ll get back to you.
      </p>

      <div className="space-y-6 border border-gray-200 p-6 sm:p-8">
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="flex items-start gap-4 group"
        >
          <div className="w-10 h-10 border border-gray-200 flex items-center justify-center flex-shrink-0 group-hover:border-black transition-colors">
            <Mail className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wider text-gray-500 mb-1">EMAIL</p>
            <p className="font-medium group-hover:underline">{SUPPORT_EMAIL}</p>
          </div>
        </a>

        <a
          href={`tel:+91${SUPPORT_PHONE}`}
          className="flex items-start gap-4 group"
        >
          <div className="w-10 h-10 border border-gray-200 flex items-center justify-center flex-shrink-0 group-hover:border-black transition-colors">
            <Phone className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wider text-gray-500 mb-1">PHONE</p>
            <p className="font-medium group-hover:underline">{SUPPORT_PHONE_DISPLAY}</p>
          </div>
        </a>

        <div className="flex items-start gap-4">
          <div className="w-10 h-10 border border-gray-200 flex items-center justify-center flex-shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wider text-gray-500 mb-1">HOURS</p>
            <p className="font-medium">Mon–Sat, 10am–6pm IST</p>
          </div>
        </div>
      </div>
    </div>
  )
}

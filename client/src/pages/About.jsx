import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Target,
  Eye,
  Check,
  MapPin,
  Users,
  Heart,
  Sparkles
} from 'lucide-react'

const PROMISES = [
  'Premium fabrics and craftsmanship',
  'Honest and affordable pricing',
  'Comfort without compromise',
  'Continuous focus on quality',
  "Supporting women's growth and opportunities",
  'Proudly built in Maharashtra, India'
]

export default function About() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-black text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-black/90 to-amber-900/20 z-10" />
        <div
          className="absolute inset-0 bg-cover bg-center opacity-25"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1400')" }}
        />
        <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 py-24 md:py-32">
          <p className="text-amber-400 text-sm tracking-[0.4em] mb-4 font-medium">ABOUT US</p>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight tracking-tight max-w-3xl">
            Crafted with Purpose.<br />
            <span className="text-amber-400">Designed for Everyone.</span>
          </h1>
          <p className="text-gray-300 text-lg md:text-xl max-w-2xl leading-relaxed">
            We started this brand with a simple belief: premium quality clothing should not come with a premium price tag.
          </p>
        </div>
      </section>

      {/* Origin story */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 md:py-24">
        <div className="grid md:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <p className="text-xs tracking-[0.3em] text-gray-500 mb-2">OUR ORIGIN</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 tracking-tight">
              Born in Maharashtra,<br />Built for India
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Born in a small city of Maharashtra, our journey began with a dream to create clothing that combines exceptional quality, timeless style, and everyday affordability. We believe that every individual deserves to experience well-made garments that look great, feel comfortable, and last longer—without paying luxury brand prices.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Every fabric we select, every stitch we make, and every design we create is guided by one goal: to deliver international-quality clothing tailored for Indian lifestyles and budgets. We draw inspiration from global standards while keeping the needs and preferences of Indian customers at the center of everything we do.
            </p>
          </div>
          <div className="relative">
            <div
              className="aspect-[4/5] bg-cover bg-center"
              style={{ backgroundImage: "url('https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=800')" }}
            />
            <div className="absolute -bottom-4 -left-4 bg-amber-400 text-black px-6 py-4 hidden sm:block">
              <p className="text-xs font-semibold tracking-[0.2em]">FROM MAHARASHTRA</p>
              <p className="text-sm font-bold tracking-wide">TO THE WORLD</p>
            </div>
          </div>
        </div>
      </section>

      {/* Founder & empowerment */}
      <section className="bg-gray-50 py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-2 gap-12 lg:gap-16 items-start">
            <div className="order-2 md:order-1">
              <div
                className="aspect-[4/3] bg-cover bg-center mb-6"
                style={{ backgroundImage: "url('https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800')" }}
              />
              <div className="flex items-center gap-3 text-amber-600">
                <MapPin className="w-5 h-5 shrink-0" />
                <p className="text-sm font-medium tracking-wide">Proudly rooted in Maharashtra, India</p>
              </div>
            </div>
            <div className="order-1 md:order-2">
              <p className="text-xs tracking-[0.3em] text-gray-500 mb-2">OUR FOUNDER</p>
              <h2 className="text-3xl md:text-4xl font-bold mb-6 tracking-tight">
                A Vision Bigger<br />Than Herself
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                Our founder, a determined woman from a middle-class family and a small village in Maharashtra, built this brand with a vision far bigger than herself. Growing up, she saw how talent, hard work, and ambition often go unnoticed due to limited opportunities. This inspired her to create not just a clothing brand, but a platform that empowers people to grow together.
              </p>
              <p className="text-gray-600 leading-relaxed mb-8">
                At the heart of our mission is a commitment to supporting and creating opportunities for women. As we grow, we aim to work with, train, and empower more women, helping them become part of a journey built on confidence, independence, and shared success.
              </p>
              <div className="flex items-start gap-4 p-5 bg-white border border-gray-200">
                <div className="p-2 bg-amber-400 shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-sm tracking-wide mb-1">EMPOWERING WOMEN</p>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Creating meaningful opportunities for women to grow, learn, and succeed alongside us.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Growth vision */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 md:py-24">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <p className="text-xs tracking-[0.3em] text-gray-500 mb-2">THE JOURNEY AHEAD</p>
          <h2 className="text-3xl md:text-4xl font-bold mb-6 tracking-tight">This Is Just the Beginning</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            What started as a dream in Maharashtra is now a growing vision to reach customers across India and eventually around the world. We are proud of our roots, and we carry the values of honesty, quality, and hard work into every product we create.
          </p>
          <p className="text-gray-600 leading-relaxed">
            Thank you for being part of our journey as we build a brand that stands for quality, affordability, and empowerment.
          </p>
        </div>

        <div className="bg-black text-white text-center py-10 px-6">
          <p className="text-amber-400 text-xs tracking-[0.35em] mb-3 font-medium">OUR TAGLINE</p>
          <p className="text-xl md:text-2xl font-bold tracking-tight leading-snug max-w-4xl mx-auto">
            From Maharashtra to the World — Premium Quality, Honest Pricing, Endless Ambition.
          </p>
        </div>
      </section>

      {/* Mission, Vision, Promise */}
      <section className="bg-gray-50 py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* Mission */}
            <div className="bg-white p-8 md:p-10 border border-gray-200">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2.5 bg-black text-white">
                  <Target className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold tracking-tight">Our Mission</h3>
              </div>
              <p className="text-gray-600 leading-relaxed">
                To provide premium-quality clothing at affordable prices while creating meaningful opportunities for women and building a globally respected brand from India.
              </p>
            </div>

            {/* Vision */}
            <div className="bg-white p-8 md:p-10 border border-gray-200">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2.5 bg-black text-white">
                  <Eye className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold tracking-tight">Our Vision</h3>
              </div>
              <p className="text-gray-600 leading-relaxed">
                To become a trusted global clothing brand that represents Indian craftsmanship, empowers communities, and makes premium fashion accessible to everyone.
              </p>
            </div>
          </div>

          {/* Promise */}
          <div className="bg-white p-8 md:p-10 border border-gray-200">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2.5 bg-amber-400 text-black">
                <Heart className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold tracking-tight">Our Promise</h3>
            </div>
            <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {PROMISES.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <span className="text-gray-700 text-sm leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-black text-white py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <Sparkles className="w-8 h-8 text-amber-400 mx-auto mb-6" />
          <p className="text-2xl md:text-3xl font-bold tracking-tight mb-3">
            Made with ambition. Built with purpose. Worn with pride.
          </p>
          <p className="text-gray-400 mb-8 max-w-lg mx-auto">
            Discover clothing that reflects our values — quality you can feel, prices you can trust.
          </p>
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 bg-white text-black px-8 py-4 font-semibold tracking-wide hover:bg-amber-400 transition-colors duration-200"
          >
            EXPLORE COLLECTION <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  )
}

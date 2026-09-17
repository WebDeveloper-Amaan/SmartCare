import { Link } from 'react-router-dom'

const parentItems = [
  'Browse verified babysitters with detailed profiles and reviews',
  'Book sessions for specific dates and flexible time slots',
  'Access live video monitoring during babysitting sessions',
  'Secure payments held in escrow until session completes',
]

const sitterItems = [
  'Create your verified profile with skills and experience',
  'Set your own hourly rates and weekly availability',
  'Receive booking requests from verified parents only',
  'Get paid directly to your account weekly or monthly',
]

export default function ForWho() {
  return (
    <section className="py-20" style={{ background: 'linear-gradient(to right, rgba(249,202,218,0.18) 0%, rgba(255,255,255,0.95) 50%, rgba(110,193,228,0.18) 100%)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="text-[#6EC1E4] font-semibold text-xs uppercase tracking-widest">Who It's For</span>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mt-2 mb-3">Built for Both Sides</h2>
          <p className="text-gray-500 text-sm max-w-xl mx-auto nunito">Whether you're a parent looking for trusted care or a sitter looking for flexible work</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Parents */}
          <div className="rounded-2xl border border-[#6EC1E4]/20 bg-gradient-to-br from-[#6EC1E4]/5 via-white to-white p-8 hover:shadow-lg hover:border-[#6EC1E4]/40 transition-all duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-[#6EC1E4] rounded-xl flex items-center justify-center shadow-lg shadow-[#6EC1E4]/30">
                <i className="fas fa-user-friends text-white text-lg"></i>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">For Parents</h3>
                <p className="text-gray-400 text-xs">Find trusted care for your child</p>
              </div>
            </div>
            <ul className="space-y-3 mb-7">
              {parentItems.map(item => (
                <li key={item} className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-[#6EC1E4]/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <i className="fas fa-check text-[#6EC1E4] text-[10px]"></i>
                  </div>
                  <p className="text-gray-600 nunito text-sm">{item}</p>
                </li>
              ))}
            </ul>
            <Link to="/signup"
              className="inline-flex items-center gap-2 bg-[#6EC1E4] text-white px-6 py-3 rounded-xl text-sm font-semibold hover:opacity-90 transition shadow-lg shadow-[#6EC1E4]/30">
              Join as Parent <i className="fas fa-arrow-right text-xs"></i>
            </Link>
          </div>

          {/* Babysitters */}
          <div className="rounded-2xl border border-pink-100 bg-gradient-to-br from-pink-50/60 via-white to-white p-8 hover:shadow-lg hover:border-pink-200 transition-all duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-pink-400 rounded-xl flex items-center justify-center shadow-lg shadow-pink-400/30">
                <i className="fas fa-heart text-white text-lg"></i>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">For Babysitters</h3>
                <p className="text-gray-400 text-xs">Earn flexibly doing what you love</p>
              </div>
            </div>
            <ul className="space-y-3 mb-7">
              {sitterItems.map(item => (
                <li key={item} className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-pink-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <i className="fas fa-check text-pink-400 text-[10px]"></i>
                  </div>
                  <p className="text-gray-600 nunito text-sm">{item}</p>
                </li>
              ))}
            </ul>
            <Link to="/signup"
              className="inline-flex items-center gap-2 bg-pink-400 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:opacity-90 transition shadow-lg shadow-pink-400/30">
              Join as Babysitter <i className="fas fa-arrow-right text-xs"></i>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

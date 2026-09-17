import { Link } from 'react-router-dom'

export default function CTA() {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 gradient-bg opacity-95"></div>
      {/* Decorative blobs */}
      <div className="blob w-96 h-96 bg-white/10 -top-20 -right-20"></div>
      <div className="blob w-64 h-64 bg-white/10 bottom-0 left-10"></div>
      <div className="blob w-48 h-48 bg-white/5 top-1/2 left-1/2 -translate-x-1/2"></div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur px-4 py-2 rounded-full mb-6 border border-white/30">
          <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
          <span className="text-white text-xs font-medium">Join 500+ families in Delhi NCR</span>
        </div>

        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
          Ready to Find the<br />
          <span className="text-white/90">Perfect Babysitter?</span>
        </h2>
        <p className="text-white/80 text-sm mb-10 nunito max-w-xl mx-auto leading-relaxed">
          Thousands of parents trust FindBabysitter for safe, verified childcare. Get started for free today — no credit card required.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
          <Link to="/signup"
            className="bg-white text-[#6EC1E4] px-8 py-3.5 rounded-xl font-bold hover:bg-gray-50 transition shadow-xl flex items-center justify-center gap-2 text-sm">
            <i className="fas fa-user-plus"></i> Sign Up as Parent
          </Link>
          <Link to="/signup"
            className="bg-white/10 backdrop-blur border-2 border-white/40 text-white px-8 py-3.5 rounded-xl font-bold hover:bg-white/20 transition flex items-center justify-center gap-2 text-sm">
            <i className="fas fa-heart"></i> Become a Babysitter
          </Link>
        </div>

        {/* Trust row */}
        <div className="flex flex-wrap justify-center gap-6 text-white/70 text-xs">
          {[
            { icon: 'fa-check-circle', text: 'Free to join' },
            { icon: 'fa-shield-alt', text: 'KYC verified sitters' },
            { icon: 'fa-lock', text: 'Secure payments' },
            { icon: 'fa-headset', text: '24/7 support' },
          ].map(i => (
            <div key={i.text} className="flex items-center gap-1.5">
              <i className={`fas ${i.icon} text-white/90`}></i>
              <span>{i.text}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

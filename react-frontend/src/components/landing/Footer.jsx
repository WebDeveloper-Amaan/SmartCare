import { Link } from 'react-router-dom'

const quickLinks = [['Find Babysitters', '/search'], ['Sign Up', '/signup'], ['Login', '/login']]
const support = ['Help Center', 'Safety Guidelines', 'Terms of Service', 'Privacy Policy', 'Contact Us']
const areas = ['South Delhi', 'North Delhi', 'Gurgaon', 'Noida', 'Dwarka', 'Faridabad']
const socials = [
  { icon: 'fa-facebook-f', href: '#' },
  { icon: 'fa-instagram', href: '#' },
  { icon: 'fa-twitter', href: '#' },
  { icon: 'fa-linkedin-in', href: '#' },
]

export default function Footer() {
  return (
    <footer className="bg-gray-950 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">
        <div className="grid md:grid-cols-4 gap-12 mb-12">

          {/* Brand */}
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-5">
              <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
                <i className="fas fa-baby text-white"></i>
              </div>
              <span className="text-xl font-bold">SmartCare</span>
            </Link>
            <p className="text-gray-400 nunito text-sm leading-relaxed mb-6">
              India's most trusted platform connecting parents with KYC-verified babysitters across Delhi NCR.
            </p>
            <div className="flex gap-3">
              {socials.map(s => (
                <a key={s.icon} href={s.href}
                  className="w-9 h-9 bg-gray-800 rounded-xl flex items-center justify-center text-gray-400 hover:bg-[#6EC1E4] hover:text-white transition text-sm">
                  <i className={`fab ${s.icon}`}></i>
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-bold text-sm uppercase tracking-widest text-gray-400 mb-5">Quick Links</h4>
            <ul className="space-y-3">
              {quickLinks.map(([label, to]) => (
                <li key={label}>
                  <Link to={to} className="text-gray-400 hover:text-white transition text-sm nunito flex items-center gap-2">
                    <i className="fas fa-chevron-right text-xs text-[#6EC1E4]"></i> {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-bold text-sm uppercase tracking-widest text-gray-400 mb-5">Support</h4>
            <ul className="space-y-3">
              {support.map(item => (
                <li key={item}>
                  <a href="#" className="text-gray-400 hover:text-white transition text-sm nunito flex items-center gap-2">
                    <i className="fas fa-chevron-right text-xs text-[#6EC1E4]"></i> {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Service Areas */}
          <div>
            <h4 className="font-bold text-sm uppercase tracking-widest text-gray-400 mb-5">Service Areas</h4>
            <ul className="space-y-3">
              {areas.map(area => (
                <li key={area}>
                  <a href="#" className="text-gray-400 hover:text-white transition text-sm nunito flex items-center gap-2">
                    <i className="fas fa-map-marker-alt text-xs text-[#6EC1E4]"></i> {area}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Contact bar */}
        <div className="border-t border-gray-800 pt-8 mb-6">
          <div className="flex flex-wrap gap-6 justify-center md:justify-start">
            {[
              { icon: 'fa-envelope', text: 'support@smartcare.in' },
              { icon: 'fa-phone', text: '+91 98765 43210' },
              { icon: 'fa-map-marker-alt', text: 'Delhi NCR, India' },
            ].map(c => (
              <div key={c.text} className="flex items-center gap-2 text-gray-400 text-sm">
                <i className={`fas ${c.icon} text-[#6EC1E4] text-xs`}></i>
                <span>{c.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-gray-800 pt-6 flex flex-col md:flex-row justify-between items-center gap-3">
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} SmartCare. All rights reserved. Made with ❤️ for parents in India 🇮🇳
          </p>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-gray-500 text-xs">All systems operational</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

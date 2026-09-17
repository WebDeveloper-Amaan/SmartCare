import { useAuth } from '../context/useAuth'
import Navbar from '../components/Navbar'
import Hero from '../components/landing/Hero'
import Stats from '../components/landing/Stats'
import HowItWorks from '../components/landing/HowItWorks'
import Features from '../components/landing/Features'
import ForWho from '../components/landing/ForWho'
import Testimonials from '../components/landing/Testimonials'
import CTA from '../components/landing/CTA'
import Footer from '../components/landing/Footer'

export default function Landing() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(to right, rgba(110,193,228,0.12) 0%, rgba(255,255,255,1) 50%, rgba(249,202,218,0.15) 100%)' }}>
      <Navbar />
      <Hero />
      <Stats />
      {!user && <HowItWorks />}
      <Features />
      {!user && <ForWho />}
      <Testimonials />
      {!user && <CTA />}
      <Footer />
    </div>
  )
}

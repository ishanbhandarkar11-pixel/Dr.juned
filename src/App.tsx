import React, { useState } from 'react';
import { Phone, Navigation, Clock, Star, HeartPulse, ShieldPlus, MapPin, Activity, Calendar, X, CheckCircle, ChevronRight, Users, Award, Stethoscope } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    date: '',
    time: 'Morning (8 AM - 12 PM)',
    symptoms: ''
  });

  const whatsappNumber = "09325678652";
  const whatsappLink = `https://wa.me/919325678652`;
  const address = "In front of Ramnagar Police Station, T B Toli, Kumbhare Nagar, Ramnagar, Gondia, Kudwa, Maharashtra 441614";
  const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

  const handleBookAppointment = (e: React.FormEvent) => {
    e.preventDefault();

    // Construct WhatsApp Message
    const message = `*New Appointment Request*%0A%0A*Name:* ${formData.name}%0A*Phone:* ${formData.phone}%0A*Date:* ${formData.date}%0A*Time:* ${formData.time}%0A*Symptoms:* ${formData.symptoms || 'None provided'}`;
    const directWhatsappUrl = `https://wa.me/919325678652?text=${message}`;
    
    // Open WhatsApp in a new tab
    window.open(directWhatsappUrl, '_blank');

    setBookingSuccess(true);
    setTimeout(() => {
      setIsBookingOpen(false);
      setBookingSuccess(false);
      // Reset form
      setFormData({
        name: '',
        phone: '',
        date: '',
        time: 'Morning (8 AM - 12 PM)',
        symptoms: ''
      });
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-teal-100 selection:text-teal-900">
      
      {/* Top Bar */}
      <div className="bg-teal-700 text-white text-sm py-2 px-4 hidden md:block">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-2"><Clock size={14} /> Open 24 Hours, 7 Days a week</span>
            <span className="flex items-center gap-2"><MapPin size={14} /> Ramnagar, Gondia</span>
          </div>
          <div className="flex items-center gap-4">
            <a href={`tel:${whatsappNumber}`} className="flex items-center gap-1 hover:text-teal-200 transition-colors">
              <Phone size={14} /> +91 93256 78652
            </a>
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-teal-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-teal-600/20">
              <HeartPulse size={28} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-xl font-bold leading-tight text-slate-900">Dr. Juned</h1>
              <p className="text-xs font-semibold text-teal-600 uppercase tracking-wider">Piles Centre</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <nav className="flex gap-6 text-sm font-medium text-slate-600 mr-4">
              <a href="#about" className="hover:text-teal-600 transition-colors">About</a>
              <a href="#services" className="hover:text-teal-600 transition-colors">Treatments</a>
              <a href="#reviews" className="hover:text-teal-600 transition-colors">Reviews</a>
            </nav>
            <button 
              onClick={() => setIsBookingOpen(true)}
              className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2.5 rounded-full font-semibold transition-all shadow-md shadow-teal-600/20 flex items-center gap-2 active:scale-95"
            >
              <Calendar size={18} />
              Book Appointment
            </button>
          </div>
          <button 
            onClick={() => setIsBookingOpen(true)}
            className="md:hidden bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-full font-semibold transition-all shadow-md shadow-teal-600/20 flex items-center gap-2 text-sm"
          >
            <Calendar size={16} />
            Book
          </button>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative bg-white pt-12 pb-20 lg:pt-20 lg:pb-28 border-b border-slate-100 overflow-hidden">
          <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-teal-100 via-transparent to-transparent" />
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="max-w-2xl"
              >
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 font-semibold text-sm mb-6 border border-amber-200">
                  <Star size={14} className="fill-amber-500 text-amber-500" />
                  5.0 Google Rating (81+ Reviews)
                </div>
                
                <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 mb-4">
                  Advanced Care for <br/>
                  <span className="text-teal-600">Piles & Fissures</span>
                </h2>
                <h3 className="text-xl text-slate-500 font-medium mb-6 font-serif">
                  डॉ. जुनेद (पाइल्स सेंटर) - HealthCare Clinic
                </h3>
                
                <p className="text-lg text-slate-600 mb-8 leading-relaxed max-w-xl">
                  Providing painless, modern, and effective treatments for piles, fissures, and general healthcare. Trusted by hundreds of patients in Gondia.
                </p>

                <div className="flex flex-wrap items-center gap-4 mb-10">
                  <button 
                    onClick={() => setIsBookingOpen(true)}
                    className="flex-1 sm:flex-none justify-center flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-8 py-4 rounded-xl font-bold transition-all shadow-lg shadow-teal-600/30 text-lg hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <Calendar size={20} />
                    Book Appointment
                  </button>
                  <a 
                    href={whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 sm:flex-none justify-center flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-200 px-8 py-4 rounded-xl font-bold transition-all hover:border-slate-300 text-lg"
                  >
                    <Phone size={20} className="text-green-600" />
                    WhatsApp Us
                  </a>
                </div>

                <div className="flex items-center gap-8 pt-6 border-t border-slate-200">
                  <div>
                    <p className="text-3xl font-bold text-slate-900">24/7</p>
                    <p className="text-sm font-medium text-slate-500">Emergency Care</p>
                  </div>
                  <div className="w-px h-12 bg-slate-200"></div>
                  <div>
                    <p className="text-3xl font-bold text-slate-900">81+</p>
                    <p className="text-sm font-medium text-slate-500">Happy Patients</p>
                  </div>
                </div>
              </motion.div>

              {/* Doctor Image */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="relative lg:ml-auto"
              >
                <div className="relative w-full max-w-md mx-auto aspect-[4/5] rounded-[2rem] overflow-hidden shadow-2xl">
                  <img 
                    src="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=800" 
                    alt="Dr. Juned" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent"></div>
                  <div className="absolute bottom-0 left-0 w-full p-8 text-white">
                    <div className="bg-white/20 backdrop-blur-md border border-white/30 rounded-2xl p-4">
                      <h3 className="text-2xl font-bold">Dr. Juned</h3>
                      <p className="text-teal-100 font-medium mb-3">Specialist in Piles & General Medicine</p>
                      <div className="flex items-center gap-2 text-sm">
                        <Award size={16} className="text-amber-400" />
                        <span>Highly Experienced</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Floating Badge */}
                <div className="absolute -right-6 top-12 bg-white p-4 rounded-2xl shadow-xl border border-slate-100 hidden md:flex items-center gap-4 animate-bounce" style={{ animationDuration: '3s' }}>
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                    <ShieldPlus size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 font-medium">Verified</p>
                    <p className="font-bold text-slate-900">Healthcare Clinic</p>
                  </div>
                </div>
              </motion.div>

            </div>
          </div>
        </section>

        {/* Services Section */}
        <section id="services" className="py-20 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-teal-600 font-bold tracking-wide uppercase text-sm mb-2">Our Expertise</h2>
              <h3 className="text-3xl md:text-4xl font-extrabold text-slate-900">Specialized Treatments</h3>
              <p className="mt-4 text-lg text-slate-600">We offer modern, minimally invasive procedures and effective treatments for various ano-rectal and general health conditions.</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                { title: "Piles Treatment", desc: "Advanced and painless treatment options for internal and external hemorrhoids, tailored to your condition.", icon: Activity },
                { title: "Fissure Care", desc: "Expert diagnosis and medication-based or minor surgical interventions for anal fissures ensuring quick recovery.", icon: HeartPulse },
                { title: "Fistula Management", desc: "Comprehensive care for anal fistulas using modern techniques with high success and low recurrence rates.", icon: ShieldPlus },
                { title: "General Consultation", desc: "Routine check-ups, diagnosis, and medical advice for general health issues and seasonal illnesses.", icon: Stethoscope },
                { title: "Emergency Care", desc: "Round-the-clock emergency medical assistance and pain management for acute conditions.", icon: Clock },
                { title: "Diet & Lifestyle Counseling", desc: "Personalized advice to prevent recurrence of piles and maintain optimal digestive health.", icon: Users },
              ].map((service, idx) => (
                <div key={idx} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow group">
                  <div className="w-14 h-14 bg-teal-50 rounded-xl flex items-center justify-center text-teal-600 mb-6 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                    <service.icon size={28} />
                  </div>
                  <h4 className="text-xl font-bold text-slate-900 mb-3">{service.title}</h4>
                  <p className="text-slate-600 leading-relaxed">{service.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* About Section */}
        <section id="about" className="py-20 bg-white border-t border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <img 
                  src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=800" 
                  alt="Clinic Environment" 
                  className="rounded-2xl shadow-lg border border-slate-200"
                />
              </div>
              <div>
                <h2 className="text-teal-600 font-bold tracking-wide uppercase text-sm mb-2">About The Clinic</h2>
                <h3 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-6">Dedicated to Your Health & Well-being</h3>
                <p className="text-lg text-slate-600 mb-6">
                  At Dr. Juned Piles Centre, we understand the discomfort and anxiety associated with ano-rectal conditions. Our mission is to provide a safe, confidential, and highly effective treatment environment.
                </p>
                <p className="text-lg text-slate-600 mb-8">
                  With years of experience and a patient-first approach, we ensure that every individual receives personalized care, right from diagnosis to complete recovery.
                </p>
                <ul className="space-y-4 mb-8">
                  {[
                    "Highly experienced specialist doctor",
                    "Modern clinic with hygienic environment",
                    "Confidential and compassionate care",
                    "Affordable consultation and treatment"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-slate-700 font-medium">
                      <CheckCircle className="text-teal-600" size={20} />
                      {item}
                    </li>
                  ))}
                </ul>
                <button 
                  onClick={() => setIsBookingOpen(true)}
                  className="text-teal-600 font-bold flex items-center gap-2 hover:text-teal-800 transition-colors"
                >
                  Book your consultation today <ChevronRight size={20} />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Location & Info Section */}
        <section className="py-20 bg-slate-900 text-slate-300">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-3 gap-12">
              
              <div className="lg:col-span-1">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-teal-600 rounded-xl flex items-center justify-center text-white">
                    <HeartPulse size={28} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white">Dr. Juned</h1>
                    <p className="text-sm font-medium text-teal-400">HealthCare Clinic</p>
                  </div>
                </div>
                <p className="text-slate-400 leading-relaxed mb-6">
                  Specialized care for Piles and general medical conditions in Gondia. Available 24 hours a day for emergency support.
                </p>
                <div className="flex gap-4">
                   <a 
                    href={whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-green-600 hover:text-white transition-colors"
                  >
                    <Phone size={18} />
                  </a>
                  <a 
                    href={mapsLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-teal-600 hover:text-white transition-colors"
                  >
                    <MapPin size={18} />
                  </a>
                </div>
              </div>

              <div className="lg:col-span-2 grid sm:grid-cols-2 gap-8">
                {/* Contact Card */}
                <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                  <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center text-teal-400 mb-4">
                    <MapPin size={20} />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Clinic Address</h3>
                  <p className="text-slate-400 leading-relaxed mb-4">
                    In front of Ramnagar Police Station, T B Toli, Kumbhare Nagar, Ramnagar, Gondia, Kudwa, Maharashtra 441614
                  </p>
                  <a href={mapsLink} target="_blank" rel="noopener noreferrer" className="text-teal-400 text-sm font-semibold hover:text-teal-300">
                    Get Directions &rarr;
                  </a>
                </div>

                {/* Hours Card */}
                <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                  <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center text-teal-400 mb-4">
                    <Clock size={20} />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Opening Hours</h3>
                  <ul className="space-y-2 text-slate-400">
                    <li className="flex justify-between">
                      <span>Monday - Sunday</span>
                      <span className="text-teal-400 font-semibold">Open 24 Hrs</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Emergency</span>
                      <span className="text-teal-400 font-semibold">24/7 Available</span>
                    </li>
                  </ul>
                  <div className="mt-4 pt-4 border-t border-slate-700">
                    <a href={`tel:${whatsappNumber}`} className="flex items-center gap-2 text-white font-bold">
                      <Phone size={18} className="text-teal-400" /> 093256 78652
                    </a>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-500 py-6 border-t border-slate-800/50 text-center text-sm">
        <p>&copy; {new Date().getFullYear()} डॉ. जुनेद (पाइल्स सेंटर) HealthCare Clinic. All rights reserved.</p>
      </footer>

      {/* Booking Modal Overlay */}
      <AnimatePresence>
        {isBookingOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsBookingOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="text-teal-600" /> Book an Appointment
                </h3>
                <button 
                  onClick={() => setIsBookingOpen(false)}
                  className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-2 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6">
                {bookingSuccess ? (
                  <div className="text-center py-10">
                    <div className="w-16 h-16 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle size={32} />
                    </div>
                    <h4 className="text-2xl font-bold text-slate-900 mb-2">Request Sent!</h4>
                    <p className="text-slate-600">Your appointment request has been received. Our clinic will contact you shortly to confirm the exact time.</p>
                  </div>
                ) : (
                  <form onSubmit={handleBookAppointment} className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Patient Name</label>
                      <input 
                        required 
                        type="text" 
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        placeholder="Enter full name" 
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none transition-all" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Phone Number</label>
                      <input 
                        required 
                        type="tel" 
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        placeholder="Mobile number" 
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none transition-all" 
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Date</label>
                        <input 
                          required 
                          type="date" 
                          value={formData.date}
                          onChange={(e) => setFormData({...formData, date: e.target.value})}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none transition-all" 
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Time Preference</label>
                        <select 
                          value={formData.time}
                          onChange={(e) => setFormData({...formData, time: e.target.value})}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none transition-all bg-white"
                        >
                          <option>Morning (8 AM - 12 PM)</option>
                          <option>Afternoon (12 PM - 4 PM)</option>
                          <option>Evening (4 PM - 9 PM)</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Symptoms/Reason for visit (Optional)</label>
                      <textarea 
                        rows={3} 
                        value={formData.symptoms}
                        onChange={(e) => setFormData({...formData, symptoms: e.target.value})}
                        placeholder="Briefly describe your problem" 
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none transition-all resize-none"
                      ></textarea>
                    </div>
                    <div className="pt-2">
                      <button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 rounded-xl shadow-md shadow-teal-600/20 transition-all active:scale-[0.98]">
                        Confirm Booking
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

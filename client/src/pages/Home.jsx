import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Bot, 
  FileText, 
  Mail, 
  AlertTriangle, 
  Container, 
  Binary, 
  Key, 
  Calendar,
  ArrowUpRight,
  ShieldCheck,
  Zap,
  Users,
  Brain,
  ChevronRight,
  Scan,
  Activity
} from "lucide-react";
import { Link } from "react-router-dom";

const services = [
  { 
    icon: Binary, 
    title: "Static & Dynamic Analysis", 
    desc: "Detect vulnerabilities in code and runtime behavior using a powerful static and dynamic analysis engine.",
    isInteractive: true 
  },
  { icon: Bot, title: "AI-Powered Fix Suggestions", desc: "Integrated AI assistant explains vulnerabilities and suggests smart, contextual code fixes." },
  { icon: FileText, title: "Multi-format Report", desc: "Download your scan results as PDF, JSON, or CSV to document, share, or archive findings." },
  { icon: Mail, title: "Email Alerts & Notifications", desc: "Get notified instantly when a scan finishes or a high-risk issue is discovered." },
  { icon: AlertTriangle, title: "Risk Scoring & OWASP Mapping", desc: "Each issue is ranked by severity and mapped to OWASP Mobile Top 10 for industry relevance." },
  { icon: Container, title: "CI/CD Integration", desc: "Push code, trigger scans, and receive results — right inside your DevOps pipeline." },
  { icon: Key, title: "Secret & Key Detection", desc: "Automatically detects hardcoded secrets, API tokens, and sensitive data before release." },
  { icon: Calendar, title: "Scheduled Weekly Scans", desc: "Regularly audit your apps for new common vulnerabilities and exposures (CVEs)." }
];

const stats = [
  { label: "BROWSER BASED APK SCANNING", value: "100%", icon: Zap },
  { label: "INTERESTED CLIENTS", value: "999+", icon: Users },
  { label: "RELEVANT RISK SCORING YOU CAN ACT ON", value: "RELEVANT", icon: ShieldCheck },
  { label: "SMARTER CODE REMEDIATION", value: "Ai", icon: Brain },
];

const featuredProjects = [
  { id: 'upguard', name: 'Upguard Investar', desc: 'Financial security infrastructure' },
  { id: 'inga', name: 'Inga Motors', desc: 'IoT automotive safety' },
  { id: 'sigma', name: 'Onboarding with Sigma', desc: 'Enterprise data protection' },
];

function Home() {
  const [expandedIndex, setExpandedIndex] = useState(null);

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center px-6 overflow-hidden">
        <div className="max-w-[1400px] mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="z-10"
          >
            <h1 className="text-5xl md:text-7xl font-display font-extrabold leading-tight mb-6">
              LAUNCH MOBILE APPS WITH <br />
              <span className="text-brand-red">CONFIDENCE,</span> <br />
              NOT VULNERABILITIES.
            </h1>
            <p className="text-gray-400 text-lg md:text-xl max-w-xl mb-10 leading-relaxed">
              MobAudit is a mobile security platform that lets you upload APKs, run powerful static and dynamic scans, and download vulnerability reports in minutes. Built for developers.
            </p>
            <Link 
              to="/dashboard"
              className="inline-block bg-transparent border-2 border-white hover:bg-white hover:text-black text-white font-bold px-10 py-4 rounded-sm transition-all text-sm tracking-widest"
            >
              START FREE SCAN
            </Link>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="absolute inset-0 bg-brand-red/20 blur-[120px] rounded-full"></div>
            <img 
              src="https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&q=80&w=1000" 
              alt="Security Illustration" 
              className="relative z-10 w-full max-w-[600px] mx-auto filter drop-shadow-[0_0_50px_rgba(255,31,31,0.2)] rounded-2xl"
            />
          </motion.div>
        </div>
      </section>
      
      {/* Services Section */}
      <section className="py-24 bg-brand-secondary/30">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-4">
              Our <span className="text-brand-red">Services</span>
            </h2>
            <p className="text-gray-500">We Provide End-to-End Android App Security Testing for Developers</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((s, i) => {
              const isExpanded = expandedIndex === i;

              return (
                <div key={i} className="relative h-full">
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    onClick={() => s.isInteractive && setExpandedIndex(isExpanded ? null : i)}
                    className={`group bg-brand-secondary border h-full p-8 rounded-xl transition-all relative overflow-hidden flex flex-col ${
                      s.isInteractive ? 'cursor-pointer' : ''
                    } ${isExpanded ? 'border-brand-red ring-1 ring-brand-red/20' : 'border-brand-border hover:border-brand-red/50'}`}
                  >
                    <AnimatePresence mode="wait">
                      {!isExpanded ? (
                        <motion.div
                          key="normal"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex flex-col h-full"
                        >
                          <div className="absolute top-4 right-4 text-brand-red opacity-0 group-hover:opacity-100 transition-opacity">
                            <ArrowUpRight className="w-5 h-5" />
                          </div>
                          <div className="w-12 h-12 bg-white/5 rounded-lg flex items-center justify-center mb-6 group-hover:bg-brand-red/10 transition-colors">
                            <s.icon className="text-brand-red w-6 h-6" />
                          </div>
                          <h3 className="text-xl font-bold mb-4 group-hover:text-brand-red transition-colors">{s.title}</h3>
                          <p className="text-gray-400 leading-relaxed text-sm">{s.desc}</p>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="options"
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="flex flex-col h-full justify-center space-y-4"
                        >
                          <h4 className="text-sm font-bold tracking-widest text-brand-red mb-2 text-center">SELECT ANALYSIS TYPE</h4>
                          
                          <Link 
                            to="/dashboard"
                            className="flex items-center justify-between bg-brand-dark/50 hover:bg-brand-red text-white p-4 rounded-lg border border-brand-border hover:border-brand-red transition-all group/opt"
                          >
                            <div className="flex items-center space-x-3">
                              <Scan className="w-5 h-5 text-brand-red group-hover/opt:text-white" />
                              <span className="font-bold text-sm">Static Analysis</span>
                            </div>
                            <ChevronRight className="w-4 h-4" />
                          </Link>

                          <Link 
                            to="/dashboard"
                            className="flex items-center justify-between bg-brand-dark/50 hover:bg-brand-red text-white p-4 rounded-lg border border-brand-border hover:border-brand-red transition-all group/opt"
                          >
                            <div className="flex items-center space-x-3">
                              <Activity className="w-5 h-5 text-brand-red group-hover/opt:text-white" />
                              <span className="font-bold text-sm">Dynamic Analysis</span>
                            </div>
                            <ChevronRight className="w-4 h-4" />
                          </Link>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Why Us Section */}
      <section className="py-24 border-y border-white/5">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div>
              <h2 className="text-5xl md:text-6xl font-display font-bold mb-8">
                Why <span className="text-brand-red">Us?</span>
              </h2>
              <p className="text-gray-400 text-lg leading-relaxed mb-12">
                MobAudit makes Mobile app security fast, accessible, and developer-friendly. We combine powerful analysis tools with AI-assisted fixes, so you can scan, secure, and ship with confidence no security team required.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-10">
              {stats.map((s, i) => (
                <div key={i} className="flex flex-col space-y-2">
                  <div className="flex items-center space-x-3 mb-2">
                     <s.icon className="text-brand-red w-8 h-8" />
                     <span className="text-4xl font-display font-bold">{s.value}</span>
                  </div>
                  <span className="text-xs font-bold tracking-widest text-gray-500 uppercase">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Work Section */}
      <section className="py-24">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="text-center mb-20">
             <h2 className="text-5xl font-display font-bold mb-4">
              Featured <span className="text-brand-red">Work</span>
            </h2>
            <p className="text-gray-500">Our team of creative professionals work in a collaborative fashion to craft tangible solutions.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-4 space-y-12">
              {featuredProjects.map((p, i) => (
                <div key={i} className={`border-l-4 pl-8 py-2 transition-all ${i === 0 ? 'border-brand-red' : 'border-white/10 opacity-30 shadow-none'}`}>
                  <h3 className={`text-2xl font-bold mb-2 ${i === 0 ? 'text-brand-red' : ''}`}>{p.name}</h3>
                  <p className="text-sm font-medium underline underline-offset-8 decoration-gray-700">Case Study</p>
                </div>
              ))}
            </div>
            <div className="lg:col-span-8 bg-brand-secondary border border-brand-border rounded-2xl overflow-hidden shadow-2xl shadow-brand-red/5">
              <img 
                src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=1500" 
                alt="Featured Project" 
                className="w-full h-auto object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Innovation CTA */}
      <section className="px-6 py-12">
        <div className="max-w-[1200px] mx-auto bg-brand-secondary border border-brand-border rounded-2xl p-12 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-red/5 blur-3xl group-hover:bg-brand-red/10 transition-all"></div>
          <div className="relative z-10 max-w-xl">
            <h2 className="text-4xl font-display font-bold mb-4">
              Ready to <span className="text-brand-red">Innovate</span>
            </h2>
            <p className="text-gray-400">Contact us to schedule an in-depth discussion about your project to find out how we can fulfil your technical needs!</p>
          </div>
          <button className="relative z-10 border border-white hover:bg-white hover:text-black text-white px-8 py-3 rounded-md flex items-center space-x-3 transition-all">
            <span className="font-bold text-sm tracking-widest">LET'S CONNECT</span>
            <ArrowUpRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* Customers Section */}
      <section className="py-24 bg-[url('https://upload.wikimedia.org/wikipedia/commons/e/ec/World_map_blank_without_borders.svg')] bg-center bg-no-repeat bg-contain bg-fixed opacity-80 filter invert grayscale">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-display font-bold mb-10">
              Our <span className="text-brand-red">Customer</span>
            </h2>
            <div className="flex justify-center space-x-6">
              <span className="flex items-center space-x-2 text-sm font-medium">
                <span className="w-3 h-3 bg-white rounded-full"></span>
                <span className="text-gray-300">Satisfied customers</span>
              </span>
              <span className="flex items-center space-x-2 text-sm font-medium">
                <span className="w-3 h-3 bg-brand-red rounded-full"></span>
                <span className="text-gray-300">customers reviews</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-4xl mx-auto">
            <div className="bg-brand-secondary p-8 rounded-2xl border border-brand-border shadow-xl">
              <span className="text-brand-red text-6xl font-serif block mb-4 opacity-50">“</span>
              <p className="text-gray-300 mb-8 italic">I am very proud of the team at MobAudit, they are a very smart group of people and I highly recommend them.</p>
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gray-700 rounded-full"></div>
                <div>
                  <h4 className="font-bold text-brand-red">Asghar Hussain</h4>
                  <p className="text-xs text-gray-500">Co-founder & CEO, HA ENG CON INTERNATIONAL</p>
                </div>
              </div>
            </div>
            <div className="bg-brand-secondary p-8 rounded-2xl border border-brand-border shadow-xl">
               <span className="text-brand-red text-6xl font-serif block mb-4 opacity-50">“</span>
              <p className="text-gray-300 mb-8 italic">I am very proud of the team at MobAudit, they are a very smart group of people and I highly recommend them.</p>
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gray-700 rounded-full"></div>
                <div>
                  <h4 className="font-bold text-brand-red">Tilly Firth</h4>
                  <p className="text-xs text-gray-500">Co-founder & CEO, Impala</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5 bg-brand-secondary/50">
        <div className="max-w-[1400px] mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-brand-red text-2xl font-display font-bold">M</span>
            <span className="text-white text-lg font-display font-extrabold tracking-widest italic">MOBAUDIT</span>
          </Link>
          <p className="text-gray-500 text-sm">© 2026 MOBAUDIT. All Rights Reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default Home;

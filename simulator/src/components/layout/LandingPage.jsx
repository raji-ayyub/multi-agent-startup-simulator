
// import React, { useState, useEffect } from "react";

// // ================= Hero Section =================
// function HeroSection() {
//   const [isVisible, setIsVisible] = useState(false);

//   useEffect(() => {
//     setIsVisible(true);
//   }, []);

//   return (
//     <section className="relative bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 min-h-[90vh] flex flex-col md:flex-row items-center justify-center px-6 md:px-20 text-white overflow-hidden">
      
//       {/* Animated background elements - using inline styles for animations */}
//       <div className="absolute inset-0 w-full h-full">
//         <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20" 
//              style={{ animation: 'blob 7s infinite' }}></div>
//         <div className="absolute top-40 right-10 w-72 h-72 bg-yellow-500 rounded-full mix-blend-multiply filter blur-xl opacity-20" 
//              style={{ animation: 'blob 7s infinite', animationDelay: '2s' }}></div>
//         <div className="absolute bottom-20 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20" 
//              style={{ animation: 'blob 7s infinite', animationDelay: '4s' }}></div>
//       </div>

//       {/* Left: Text Content */}
//       <div className={`flex-1 text-center md:text-left mb-12 md:mb-0 z-10 transform transition-all duration-1000 ${isVisible ? 'translate-x-0 opacity-100' : '-translate-x-20 opacity-0'}`}>
//         <div className="inline-block px-3 py-1 bg-white/10 rounded-full text-sm font-medium mb-6 backdrop-blur-sm">
//           🚀 AI-Powered Startup Platform
//         </div>
//         <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
//           <span className="bg-gradient-to-r from-yellow-300 to-pink-300 bg-clip-text text-transparent">
//             PentraAI
//           </span>
//         </h1>
//         <p className="text-xl md:text-2xl mb-8 max-w-lg text-gray-200">
//           Simulate, Strategize, Succeed — AI-Powered Startup Guidance
//         </p>

//         {/* CTA Buttons */}
//         <div className="flex justify-center md:justify-start gap-4">
//           <a
//             href="/signup"
//             className="group relative bg-white text-gray-900 font-semibold px-8 py-4 rounded-full shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 overflow-hidden"
//           >
//             <span className="relative z-10">Get Started Free</span>
//             <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-pink-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
//           </a>
//           <a
//             href="/login"
//             className="bg-transparent border-2 border-white/30 text-white font-semibold px-8 py-4 rounded-full hover:bg-white/10 hover:border-white transition-all duration-300 backdrop-blur-sm"
//           >
//             Log In
//           </a>
//         </div>

//         {/* Social proof */}
//         <div className="mt-12 flex items-center justify-center md:justify-start gap-4">
//           <div className="flex -space-x-2">
//             {[1, 2, 3, 4].map((i) => (
//               <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-gradient-to-br from-purple-400 to-pink-400"></div>
//             ))}
//           </div>
//           <p className="text-sm text-gray-300">
//             <span className="font-bold text-white">2,000+</span> startups already using PentraAI
//           </p>
//         </div>
//       </div>

//       {/* Right: Visual element */}
//       <div className={`flex-1 flex justify-center items-center transform transition-all duration-1000 delay-300 ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-20 opacity-0'}`}>
//         <div className="relative w-72 h-72 md:w-96 md:h-96">
//           <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-pink-400 rounded-2xl rotate-6 opacity-50 blur-lg"></div>
//           <div className="absolute inset-0 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 flex items-center justify-center">
//             <div className="text-center">
//               <div className="text-6xl mb-4">🤖</div>
//               <div className="font-mono text-sm">Multi-Agent System</div>
//               <div className="flex gap-2 mt-4">
//                 <span className="px-2 py-1 bg-white/20 rounded text-xs">Investor</span>
//                 <span className="px-2 py-1 bg-white/20 rounded text-xs">Customer</span>
//                 <span className="px-2 py-1 bg-white/20 rounded text-xs">Analyst</span>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </section>
//   );
// }

// // ================= Full Landing Page =================
// export default function LandingPage() {
//   // Add animation styles to document head
//   useEffect(() => {
//     const style = document.createElement('style');
//     style.textContent = `
//       @keyframes blob {
//         0% { transform: translate(0px, 0px) scale(1); }
//         33% { transform: translate(30px, -50px) scale(1.1); }
//         66% { transform: translate(-20px, 20px) scale(0.9); }
//         100% { transform: translate(0px, 0px) scale(1); }
//       }
//     `;
//     document.head.appendChild(style);
    
//     return () => {
//       document.head.removeChild(style);
//     };
//   }, []);

//   const features = [
//     {
//       title: "Multi-Agent Expertise",
//       description:
//         "Each AI agent simulates a startup stakeholder—Investor, Customer, Market Analyst—to provide diverse perspectives.",
//       icon: "🎯",
//       color: "from-blue-500 to-cyan-500"
//     },
//     {
//       title: "Data-Driven Insights",
//       description:
//         "Make decisions based on real-time market context and AI analysis.",
//       icon: "📊",
//       color: "from-purple-500 to-pink-500"
//     },
//     {
//       title: "Rapid Iteration",
//       description:
//         "Test and refine your startup ideas without costly mistakes.",
//       icon: "⚡",
//       color: "from-orange-500 to-red-500"
//     },
//     {
//       title: "Market Analysis",
//       description:
//         "Get comprehensive market research and competitor analysis instantly.",
//       icon: "📈",
//       color: "from-green-500 to-emerald-500"
//     },
//     {
//       title: "Risk Assessment",
//       description:
//         "Identify potential pitfalls and opportunities before investing resources.",
//       icon: "🛡️",
//       color: "from-indigo-500 to-blue-500"
//     },
//     {
//       title: "24/7 Availability",
//       description:
//         "Access AI insights anytime, anywhere, on any device.",
//       icon: "🌙",
//       color: "from-violet-500 to-purple-500"
//     }
//   ];

//   const steps = [
//     {
//       title: "Submit Your Idea",
//       description: "Share your startup concept with our AI platform",
//       icon: "📝"
//     },
//     {
//       title: "AI Analysis",
//       description: "Our multi-agent system evaluates your idea from all angles",
//       icon: "🤖"
//     },
//     {
//       title: "Get Insights",
//       description: "Receive comprehensive recommendations and strategies",
//       icon: "💡"
//     },
//     {
//       title: "Iterate & Optimize",
//       description: "Refine your approach based on AI-powered feedback",
//       icon: "🔄"
//     }
//   ];

//   const stats = [
//     { value: "95%", label: "Accuracy Rate" },
//     { value: "2x", label: "Faster Validation" },
//     { value: "50k+", label: "Simulations Run" },
//     { value: "4.9/5", label: "User Rating" }
//   ];

//   return (
//     <div className="font-sans bg-white text-gray-900 relative">
//       {/* Header */}
//       <header className="w-full flex justify-between items-center p-6 absolute top-0 left-0 z-50">
//         <div className="text-2xl font-bold text-white flex items-center gap-2">
//           <span className="bg-gradient-to-r from-yellow-300 to-pink-300 bg-clip-text text-transparent">
//             PentraAI
//           </span>
//           <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Beta</span>
//         </div>
//         <nav className="hidden md:flex items-center space-x-8">
//           <a href="#features" className="text-white/90 hover:text-white transition">
//             Features
//           </a>
//           <a href="#how-it-works" className="text-white/90 hover:text-white transition">
//             How It Works
//           </a>
//           <a href="#pricing" className="text-white/90 hover:text-white transition">
//             Pricing
//           </a>
//           <a
//             href="/login"
//             className="text-white font-semibold hover:text-white/80 transition"
//           >
//             Log In
//           </a>
//           <a
//             href="/signup"
//             className="bg-white text-indigo-900 px-6 py-2.5 rounded-full font-semibold hover:shadow-lg hover:scale-105 transition-all duration-300"
//           >
//             Get Started
//           </a>
//         </nav>
//         {/* Mobile menu button */}
//         <button className="md:hidden text-white p-2">
//           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
//           </svg>
//         </button>
//       </header>

//       {/* Hero Section */}
//       <HeroSection />

//       {/* Stats Section */}
//       <section className="py-16 bg-white border-y border-gray-100">
//         <div className="max-w-6xl mx-auto px-6">
//           <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
//             {stats.map((stat, i) => (
//               <div key={i} className="text-center">
//                 <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
//                   {stat.value}
//                 </div>
//                 <div className="text-sm text-gray-600 mt-2">{stat.label}</div>
//               </div>
//             ))}
//           </div>
//         </div>
//       </section>

//       {/* Features Section */}
//       <section id="features" className="py-24 px-6 relative">
//         <div className="max-w-7xl mx-auto">
//           <div className="text-center mb-16">
//             <span className="text-sm font-semibold text-indigo-600 uppercase tracking-wider">Features</span>
//             <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-6">
//               Everything You Need to
//               <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent block">
//                 Validate Your Startup
//               </span>
//             </h2>
//             <p className="text-xl text-gray-600 max-w-3xl mx-auto">
//               Our AI-powered platform provides comprehensive tools and insights to help you make data-driven decisions.
//             </p>
//           </div>

//           <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
//             {features.map((f, i) => (
//               <div
//                 key={i}
//                 className="group relative bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-100 overflow-hidden"
//               >
//                 <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${f.color} opacity-0 group-hover:opacity-10 rounded-full -mr-16 -mt-16 transition-opacity duration-300`}></div>
//                 <div className="text-4xl mb-4">{f.icon}</div>
//                 <h3 className="text-xl font-bold mb-3 group-hover:text-indigo-600 transition">
//                   {f.title}
//                 </h3>
//                 <p className="text-gray-600 leading-relaxed">{f.description}</p>
//               </div>
//             ))}
//           </div>
//         </div>
//       </section>

//       {/* How It Works Section */}
//       <section id="how-it-works" className="py-24 px-6 bg-gradient-to-br from-gray-50 to-white">
//         <div className="max-w-7xl mx-auto">
//           <div className="text-center mb-16">
//             <span className="text-sm font-semibold text-indigo-600 uppercase tracking-wider">Process</span>
//             <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-6">
//               From Idea to Execution in
//               <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent block">
//                 Four Simple Steps
//               </span>
//             </h2>
//           </div>

//           <div className="grid md:grid-cols-4 gap-8 relative">
//             {/* Connection line */}
//             <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-gradient-to-r from-indigo-200 via-purple-200 to-pink-200 -translate-y-1/2"></div>
            
//             {steps.map((step, i) => (
//               <div key={i} className="relative group">
//                 <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 text-center relative z-10">
//                   <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center text-white text-2xl mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
//                     {step.icon}
//                   </div>
//                   <h3 className="text-lg font-bold mb-3">{step.title}</h3>
//                   <p className="text-gray-600 text-sm">{step.description}</p>
//                 </div>
//                 {/* Step number */}
//                 <div className="absolute -top-3 -right-3 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-bold z-20">
//                   {i + 1}
//                 </div>
//               </div>
//             ))}
//           </div>
//         </div>
//       </section>

//       {/* CTA Section */}
//       <section className="py-24 px-6 relative overflow-hidden">
//         <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600">
//           <div className="absolute inset-0 opacity-20" 
//                style={{ 
//                  backgroundImage: `url('data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.05"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')`,
//                  backgroundRepeat: 'repeat'
//                }}>
//           </div>
//         </div>
//         <div className="relative z-10 max-w-4xl mx-auto text-center text-white">
//           <h2 className="text-4xl md:text-5xl font-bold mb-6">
//             Ready to Transform Your Startup Journey?
//           </h2>
//           <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto">
//             Join thousands of entrepreneurs who are already using PentraAI to validate and optimize their business ideas.
//           </p>
//           <div className="flex flex-col sm:flex-row gap-4 justify-center">
//             <a
//               href="/signup"
//               className="bg-white text-indigo-600 font-semibold px-8 py-4 rounded-full shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300"
//             >
//               Start Free Trial
//             </a>
//             <a
//               href="/demo"
//               className="bg-transparent border-2 border-white text-white font-semibold px-8 py-4 rounded-full hover:bg-white/10 transition-all duration-300"
//             >
//               Watch Demo
//             </a>
//           </div>
//           <p className="text-sm text-white/70 mt-6">
//             No credit card required • 14-day free trial • Cancel anytime
//           </p>
//         </div>
//       </section>

//       {/* Footer */}
//       <footer className="bg-gray-900 text-gray-400 py-16">
//         <div className="max-w-7xl mx-auto px-6">
//           <div className="grid md:grid-cols-4 gap-8 mb-12">
//             <div>
//               <div className="text-2xl font-bold text-white mb-4">PentraAI</div>
//               <p className="text-sm">AI-powered startup validation platform for modern entrepreneurs.</p>
//             </div>
//             <div>
//               <h4 className="text-white font-semibold mb-4">Product</h4>
//               <ul className="space-y-2 text-sm">
//                 <li><a href="#" className="hover:text-white transition">Features</a></li>
//                 <li><a href="#" className="hover:text-white transition">Pricing</a></li>
//                 <li><a href="#" className="hover:text-white transition">API</a></li>
//                 <li><a href="#" className="hover:text-white transition">Documentation</a></li>
//               </ul>
//             </div>
//             <div>
//               <h4 className="text-white font-semibold mb-4">Company</h4>
//               <ul className="space-y-2 text-sm">
//                 <li><a href="#" className="hover:text-white transition">About</a></li>
//                 <li><a href="#" className="hover:text-white transition">Blog</a></li>
//                 <li><a href="#" className="hover:text-white transition">Careers</a></li>
//                 <li><a href="#" className="hover:text-white transition">Contact</a></li>
//               </ul>
//             </div>
//             <div>
//               <h4 className="text-white font-semibold mb-4">Legal</h4>
//               <ul className="space-y-2 text-sm">
//                 <li><a href="#" className="hover:text-white transition">Privacy</a></li>
//                 <li><a href="#" className="hover:text-white transition">Terms</a></li>
//                 <li><a href="#" className="hover:text-white transition">Security</a></li>
//               </ul>
//             </div>
//           </div>
//           <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
//             <p>&copy; {new Date().getFullYear()} PentraAI. All rights reserved.</p>
//             <div className="flex gap-6 mt-4 md:mt-0">
//               <a href="#" className="hover:text-white transition">
//                 <span className="sr-only">Twitter</span>
//                 <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">🐦</svg>
//               </a>
//               <a href="#" className="hover:text-white transition">
//                 <span className="sr-only">LinkedIn</span>
//                 <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">💼</svg>
//               </a>
//               <a href="#" className="hover:text-white transition">
//                 <span className="sr-only">GitHub</span>
//                 <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">🐙</svg>
//               </a>
//             </div>
//           </div>
//         </div>
//       </footer>
//     </div>
//   );
// }

import React, { useState, useEffect } from "react";
import { 
  FaRocket, 
  FaRobot, 
  FaBullseye, 
  FaChartBar, 
  FaBolt, 
  FaChartLine, 
  FaShieldAlt, 
  FaMoon, 
  FaPencilAlt, 
  FaLightbulb, 
  FaSync,
  FaTwitter,
  FaLinkedin,
  FaGithub
} from "react-icons/fa";

// ================= Hero Section =================
function HeroSection() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <section className="relative bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 min-h-[90vh] flex flex-col md:flex-row items-center justify-center px-6 md:px-20 text-white overflow-hidden">
      
      {/* Animated background elements - using inline styles for animations */}
      <div className="absolute inset-0 w-full h-full">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20" 
             style={{ animation: 'blob 7s infinite' }}></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-yellow-500 rounded-full mix-blend-multiply filter blur-xl opacity-20" 
             style={{ animation: 'blob 7s infinite', animationDelay: '2s' }}></div>
        <div className="absolute bottom-20 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20" 
             style={{ animation: 'blob 7s infinite', animationDelay: '4s' }}></div>
      </div>

      {/* Left: Text Content */}
      <div className={`flex-1 text-center md:text-left mb-12 md:mb-0 z-10 transform transition-all duration-1000 ${isVisible ? 'translate-x-0 opacity-100' : '-translate-x-20 opacity-0'}`}>
        <div className="inline-block px-3 py-1 bg-white/10 rounded-full text-sm font-medium mb-6 backdrop-blur-sm">
          <FaRocket className="inline mr-1" /> AI-Powered Startup Platform
        </div>
        <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
          <span className="bg-gradient-to-r from-yellow-300 to-pink-300 bg-clip-text text-transparent">
            PentraAI
          </span>
        </h1>
        <p className="text-xl md:text-2xl mb-8 max-w-lg text-gray-200">
          Simulate, Strategize, Succeed — AI-Powered Startup Guidance
        </p>

        {/* CTA Buttons */}
        <div className="flex justify-center md:justify-start gap-4">
          <a
            href="/signup"
            className="group relative bg-white text-gray-900 font-semibold px-8 py-4 rounded-full shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 overflow-hidden"
          >
            <span className="relative z-10">Get Started Free</span>
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-pink-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </a>
          <a
            href="/login"
            className="bg-transparent border-2 border-white/30 text-white font-semibold px-8 py-4 rounded-full hover:bg-white/10 hover:border-white transition-all duration-300 backdrop-blur-sm"
          >
            Log In
          </a>
        </div>

        {/* Social proof */}
        <div className="mt-12 flex items-center justify-center md:justify-start gap-4">
          <div className="flex -space-x-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-gradient-to-br from-purple-400 to-pink-400"></div>
            ))}
          </div>
          <p className="text-sm text-gray-300">
            <span className="font-bold text-white">2,000+</span> startups already using PentraAI
          </p>
        </div>
      </div>

      {/* Right: Visual element */}
      <div className={`flex-1 flex justify-center items-center transform transition-all duration-1000 delay-300 ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-20 opacity-0'}`}>
        <div className="relative w-72 h-72 md:w-96 md:h-96">
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-pink-400 rounded-2xl rotate-6 opacity-50 blur-lg"></div>
          <div className="absolute inset-0 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4"><FaRobot /></div>
              <div className="font-mono text-sm">Multi-Agent System</div>
              <div className="flex gap-2 mt-4">
                <span className="px-2 py-1 bg-white/20 rounded text-xs">Investor</span>
                <span className="px-2 py-1 bg-white/20 rounded text-xs">Customer</span>
                <span className="px-2 py-1 bg-white/20 rounded text-xs">Analyst</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ================= Full Landing Page =================
export default function LandingPage() {
  // Add animation styles to document head
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes blob {
        0% { transform: translate(0px, 0px) scale(1); }
        33% { transform: translate(30px, -50px) scale(1.1); }
        66% { transform: translate(-20px, 20px) scale(0.9); }
        100% { transform: translate(0px, 0px) scale(1); }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const features = [
    {
      title: "Multi-Agent Expertise",
      description:
        "Each AI agent simulates a startup stakeholder—Investor, Customer, Market Analyst—to provide diverse perspectives.",
      icon: <FaBullseye />,
      color: "from-blue-500 to-cyan-500"
    },
    {
      title: "Data-Driven Insights",
      description:
        "Make decisions based on real-time market context and AI analysis.",
      icon: <FaChartBar />,
      color: "from-purple-500 to-pink-500"
    },
    {
      title: "Rapid Iteration",
      description:
        "Test and refine your startup ideas without costly mistakes.",
      icon: <FaBolt />,
      color: "from-orange-500 to-red-500"
    },
    {
      title: "Market Analysis",
      description:
        "Get comprehensive market research and competitor analysis instantly.",
      icon: <FaChartLine />,
      color: "from-green-500 to-emerald-500"
    },
    {
      title: "Risk Assessment",
      description:
        "Identify potential pitfalls and opportunities before investing resources.",
      icon: <FaShieldAlt />,
      color: "from-indigo-500 to-blue-500"
    },
    {
      title: "24/7 Availability",
      description:
        "Access AI insights anytime, anywhere, on any device.",
      icon: <FaMoon />,
      color: "from-violet-500 to-purple-500"
    }
  ];

  const steps = [
    {
      title: "Submit Your Idea",
      description: "Share your startup concept with our AI platform",
      icon: <FaPencilAlt />
    },
    {
      title: "AI Analysis",
      description: "Our multi-agent system evaluates your idea from all angles",
      icon: <FaRobot />
    },
    {
      title: "Get Insights",
      description: "Receive comprehensive recommendations and strategies",
      icon: <FaLightbulb />
    },
    {
      title: "Iterate & Optimize",
      description: "Refine your approach based on AI-powered feedback",
      icon: <FaSync />
    }
  ];

  const stats = [
    { value: "95%", label: "Accuracy Rate" },
    { value: "2x", label: "Faster Validation" },
    { value: "50k+", label: "Simulations Run" },
    { value: "4.9/5", label: "User Rating" }
  ];

  return (
    <div className="font-sans bg-white text-gray-900 relative">
      {/* Header */}
      <header className="w-full flex justify-between items-center p-6 absolute top-0 left-0 z-50">
        <div className="text-2xl font-bold text-white flex items-center gap-2">
          <span className="bg-gradient-to-r from-yellow-300 to-pink-300 bg-clip-text text-transparent">
            PentraAI
          </span>
          <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Beta</span>
        </div>
        <nav className="hidden md:flex items-center space-x-8">
          <a href="#features" className="text-white/90 hover:text-white transition">
            Features
          </a>
          <a href="#how-it-works" className="text-white/90 hover:text-white transition">
            How It Works
          </a>
          <a href="#pricing" className="text-white/90 hover:text-white transition">
            Pricing
          </a>
          <a
            href="/login"
            className="text-white font-semibold hover:text-white/80 transition"
          >
            Log In
          </a>
          <a
            href="/signup"
            className="bg-white text-indigo-900 px-6 py-2.5 rounded-full font-semibold hover:shadow-lg hover:scale-105 transition-all duration-300"
          >
            Get Started
          </a>
        </nav>
        {/* Mobile menu button */}
        <button className="md:hidden text-white p-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </header>

      {/* Hero Section */}
      <HeroSection />

      {/* Stats Section */}
      <section className="py-16 bg-white border-y border-gray-100">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-600 mt-2">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-indigo-600 uppercase tracking-wider">Features</span>
            <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-6">
              Everything You Need to
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent block">
                Validate Your Startup
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our AI-powered platform provides comprehensive tools and insights to help you make data-driven decisions.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((f, i) => (
              <div
                key={i}
                className="group relative bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-100 overflow-hidden"
              >
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${f.color} opacity-0 group-hover:opacity-10 rounded-full -mr-16 -mt-16 transition-opacity duration-300`}></div>
                <div className="text-4xl mb-4">{f.icon}</div>
                <h3 className="text-xl font-bold mb-3 group-hover:text-indigo-600 transition">
                  {f.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 px-6 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-indigo-600 uppercase tracking-wider">Process</span>
            <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-6">
              From Idea to Execution in
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent block">
                Four Simple Steps
              </span>
            </h2>
          </div>

          <div className="grid md:grid-cols-4 gap-8 relative">
            {/* Connection line */}
            <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-gradient-to-r from-indigo-200 via-purple-200 to-pink-200 -translate-y-1/2"></div>
            
            {steps.map((step, i) => (
              <div key={i} className="relative group">
                <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 text-center relative z-10">
                  <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center text-white text-2xl mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                    {step.icon}
                  </div>
                  <h3 className="text-lg font-bold mb-3">{step.title}</h3>
                  <p className="text-gray-600 text-sm">{step.description}</p>
                </div>
                {/* Step number */}
                <div className="absolute -top-3 -right-3 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-bold z-20">
                  {i + 1}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600">
          <div className="absolute inset-0 opacity-20" 
               style={{ 
                 backgroundImage: `url('data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.05"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')`,
                 backgroundRepeat: 'repeat'
               }}>
          </div>
        </div>
        <div className="relative z-10 max-w-4xl mx-auto text-center text-white">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Transform Your Startup Journey?
          </h2>
          <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto">
            Join thousands of entrepreneurs who are already using PentraAI to validate and optimize their business ideas.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/signup"
              className="bg-white text-indigo-600 font-semibold px-8 py-4 rounded-full shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300"
            >
              Start Free Trial
            </a>
            <a
              href="/demo"
              className="bg-transparent border-2 border-white text-white font-semibold px-8 py-4 rounded-full hover:bg-white/10 transition-all duration-300"
            >
              Watch Demo
            </a>
          </div>
          <p className="text-sm text-white/70 mt-6">
            No credit card required • 14-day free trial • Cancel anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="text-2xl font-bold text-white mb-4">PentraAI</div>
              <p className="text-sm">AI-powered startup validation platform for modern entrepreneurs.</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition">Features</a></li>
                <li><a href="#" className="hover:text-white transition">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition">API</a></li>
                <li><a href="#" className="hover:text-white transition">Documentation</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition">About</a></li>
                <li><a href="#" className="hover:text-white transition">Blog</a></li>
                <li><a href="#" className="hover:text-white transition">Careers</a></li>
                <li><a href="#" className="hover:text-white transition">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition">Terms</a></li>
                <li><a href="#" className="hover:text-white transition">Security</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p>&copy; {new Date().getFullYear()} PentraAI. All rights reserved.</p>
            <div className="flex gap-6 mt-4 md:mt-0">
              <a href="#" className="hover:text-white transition">
                <span className="sr-only">Twitter</span>
                <FaTwitter className="w-5 h-5" />
              </a>
              <a href="#" className="hover:text-white transition">
                <span className="sr-only">LinkedIn</span>
                <FaLinkedin className="w-5 h-5" />
              </a>
              <a href="#" className="hover:text-white transition">
                <span className="sr-only">GitHub</span>
                <FaGithub className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
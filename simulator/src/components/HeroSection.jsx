// import React from "react";

// export default function HeroSection() {
//   return (
//     <section className="relative bg-gradient-to-r from-green-600 to-green-400 min-h-[80vh] flex flex-col md:flex-row items-center justify-center px-6 md:px-20 text-white overflow-hidden">
      
//       {/* Left: Text Content */}
//       <div className="flex-1 text-center md:text-left mb-12 md:mb-0">
//         <h1 className="text-5xl md:text-6xl font-extrabold mb-6 leading-tight opacity-0 animate-fadeInLeft">
//           PentraAI
//         </h1>
//         <p className="text-xl md:text-2xl mb-8 max-w-lg opacity-0 animate-fadeInLeft animate-delay-200">
//           Simulate, Strategize, Succeed — AI-Powered Startup Guidance
//         </p>

//         {/* CTA Buttons */}
//         <div className="flex justify-center md:justify-start gap-4 opacity-0 animate-fadeInUp animate-delay-400">
//           <a
//             href="/signup"
//             className="bg-white text-green-600 font-semibold px-8 py-4 rounded-full shadow-lg hover:shadow-2xl transition duration-300"
//           >
//             Get Started
//           </a>
//           <a
//             href="/login"
//             className="bg-transparent border border-white text-white font-semibold px-8 py-4 rounded-full hover:bg-white hover:text-green-600 transition duration-300"
//           >
//             Log In
//           </a>
//         </div>
//       </div>

//       {/* Right: Illustration */}
//       <div className="flex-1 flex justify-center md:justify-end">
//         <img
//           src="https://cdn-icons-png.flaticon.com/512/3063/3063822.png"
//           alt="Startup Simulation Illustration"
//           className="w-80 md:w-96 transform animate-float"
//         />
//       </div>

//       {/* Tailwind Animations - Fixed with dangerouslySetInnerHTML */}
//       <style dangerouslySetInnerHTML={{
//         __html: `
//           @keyframes fadeInLeft {
//             from { opacity: 0; transform: translateX(-50px); }
//             to { opacity: 1; transform: translateX(0); }
//           }
//           .animate-fadeInLeft {
//             animation: fadeInLeft 1s forwards;
//           }
//           .animate-delay-200 { animation-delay: 0.2s; }
//           .animate-delay-400 { animation-delay: 0.4s; }

//           @keyframes fadeInUp {
//             from { opacity: 0; transform: translateY(30px); }
//             to { opacity: 1; transform: translateY(0); }
//           }
//           .animate-fadeInUp {
//             animation: fadeInUp 1s forwards;
//           }

//           @keyframes float {
//             0%, 100% { transform: translateY(0); }
//             50% { transform: translateY(-10px); }
//           }
//           .animate-float {
//             animation: float 3s ease-in-out infinite;
//           }
//         `
//       }} />

//     </section>
//   );
// }

import React from "react";

export default function HeroSection() {
  return (
    <section className="relative bg-gradient-to-r from-green-600 to-green-400 min-h-[80vh] flex flex-col md:flex-row items-center justify-center px-6 md:px-20 text-white overflow-hidden">
      
      {/* Left: Text Content */}
      <div className="flex-1 text-center md:text-left mb-12 md:mb-0">
        <h1 className="text-5xl md:text-6xl font-extrabold mb-6 leading-tight opacity-0 animate-fadeInLeft">
          PentraAI
        </h1>
        <p className="text-xl md:text-2xl mb-8 max-w-lg opacity-0 animate-fadeInLeft animate-delay-200">
          Simulate, Strategize, Succeed — AI-Powered Startup Guidance
        </p>

        {/* CTA Buttons */}
        <div className="flex justify-center md:justify-start gap-4 opacity-0 animate-fadeInUp animate-delay-400">
          <a
            href="/signup"
            className="bg-white text-green-600 font-semibold px-8 py-4 rounded-full shadow-lg hover:shadow-2xl transition duration-300"
          >
            Get Started
          </a>
          <a
            href="/login"
            className="bg-transparent border border-white text-white font-semibold px-8 py-4 rounded-full hover:bg-white hover:text-green-600 transition duration-300"
          >
            Log In
          </a>
        </div>
      </div>

      {/* Right: Illustration */}
      <div className="flex-1 flex justify-center md:justify-end">
        <img
          src="https://cdn-icons-png.flaticon.com/512/3063/3063822.png"
          alt="Startup Simulation Illustration"
          className="w-80 md:w-96 transform animate-float"
        />
      </div>

      {/* Tailwind Animations */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes fadeInLeft {
            from { opacity: 0; transform: translateX(-50px); }
            to { opacity: 1; transform: translateX(0); }
          }
          .animate-fadeInLeft {
            animation: fadeInLeft 1s forwards;
          }
          .animate-delay-200 { animation-delay: 0.2s; }
          .animate-delay-400 { animation-delay: 0.4s; }

          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fadeInUp {
            animation: fadeInUp 1s forwards;
          }

          @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
          .animate-float {
            animation: float 3s ease-in-out infinite;
          }
        `
      }} />

    </section>
  );
}
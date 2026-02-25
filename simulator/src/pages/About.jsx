// // src/pages/About.jsx

// import React from "react";
// import { Link } from "react-router-dom";

// export default function About() {
//   return (
//     <div className="w-full">
//       {/* Header */}
//       <div className="text-center mb-8">
//         <h1 className="text-3xl font-bold mb-2">About PentraAI</h1>
//         <p className="text-gray-400 text-lg">
//           Learn more about our mission, values, and what makes PentraAI a leader in AI enterprise solutions.
//         </p>
//       </div>

//       {/* Main Content */}
//       <div className="space-y-6 text-gray-300 text-base sm:text-lg">
//         <p>
//           PentraAI is dedicated to providing cutting-edge AI tools for enterprise networks. Our goal is to empower companies with intelligent solutions that improve efficiency, accuracy, and innovation across all sectors.
//         </p>

//         <p>
//           We value professionalism, teamwork, and continuous growth. Our team is committed to building a positive experience for our users while supporting the communities we serve.
//         </p>

//         <p>
//           Join us as we redefine enterprise AI solutions and create a smarter, more connected world.
//         </p>

//         {/* Optional Illustration */}
//         <div className="mt-6 flex justify-center">
//            <img
//             src="/images/Icon.svg"
//             alt="Logo"
//             className="w-10 h-10  flex items-center justify-center  bg-black p-1 rounded-xl"
//           />
//         </div>
//       </div>

//       {/* CTA Button */}
//       <div className="mt-10 text-center">
//         <Link
//           to="/signup"
//           className="inline-block bg-yellow-200 text-black font-semibold py-3 px-8 rounded-xl hover:opacity-90 transition shadow-lg shadow-indigo-500/20"
//         >
//           Get Started
//         </Link>
//       </div>

//       {/* Footer Link */}
//       <div className="mt-6 text-center text-sm text-slate-400">
//         Already have an account?{" "}
//         <Link to="/login" className="text-yellow-200 hover:underline">
//           Log in
//         </Link>
//       </div>
//     </div>
//   );
// }


// src/pages/About.jsx


import React from "react";
import { Link } from "react-router-dom";

export default function About() {
  return (
    <div className="w-full py-12 px-4">
      {/* Main Content Card */}
      <div className="max-w-4xl mx-auto bg-gray-800/30 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-8 md:p-12 shadow-xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-3 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            About PentraAI
          </h1>
          <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto">
            Learn more about our mission, values, and what makes PentraAI a leader in AI enterprise solutions.
          </p>
        </div>

        {/* Main Content */}
        <div className="space-y-6 text-center text-gray-300 text-base sm:text-lg leading-relaxed">
          <p>
            PentraAI is dedicated to providing cutting-edge AI tools for enterprise networks. Our goal is to empower companies with intelligent solutions that improve efficiency, accuracy, and innovation across all sectors.
          </p>

          <p>
            We value professionalism, teamwork, and continuous growth. Our team is committed to building a positive experience for our users while supporting the communities we serve.
          </p>

          <p>
            Join us as we redefine enterprise AI solutions and create a smarter, more connected world.
          </p>

          {/* Optional Illustration */}
          <div className="mt-8 flex justify-center">
            <div className="bg-gradient-to-br from-gray-700 to-gray-900 p-3 rounded-2xl shadow-inner">
              <img
                src="/images/Icon.svg"
                alt="PentraAI Logo"
                className="w-12 h-12 object-contain"
              />
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <div className="mt-10 text-center">
          <Link
            to="/signup"
            className="inline-block bg-yellow-200 text-gray-900 font-semibold py-3 px-8 rounded-xl hover:bg-yellow-300 transition shadow-lg shadow-yellow-500/20 hover:shadow-yellow-500/30"
          >
            Get Started
          </Link>
        </div>

        {/* Footer Link */}
        <div className="mt-6 text-center text-sm text-slate-400">
          Already have an account?{" "}
          <Link to="/login" className="text-yellow-200 hover:text-yellow-100 hover:underline transition">
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
}
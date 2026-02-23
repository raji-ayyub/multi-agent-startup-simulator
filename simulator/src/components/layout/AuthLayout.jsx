// src/components/Layout.js

const AuthLayout = ({ children }) => {
  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-black text-white">

      <div className="hidden md:block relative overflow-hidden">

        {/* Background */}
        <div className="absolute inset-0 bg-[url('/images/business-suit.jpg')] bg-cover bg-center" />
        <div className="absolute inset-0 bg-black/85" />

        {/* Logo */}
        <div className="absolute top-10 left-10 flex items-center justify-center  gap-3 z-20">
          <img
            src="/images/Icon.svg"
            alt="Logo"
            className="w-10 h-10  flex items-center justify-center  bg-black p-1 rounded-xl"
          />
          <h1 className="text-2xl font-bold">PentraAI</h1>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 flex flex-col justify-between h-full px-16 py-20">

          <div className="flex flex-col justify-center flex-1 mt-24">
            <h2 className="text-5xl font-extrabold leading-tight max-w-xl">
              Supercharge your enterprise{" "}
              <span className="bg-white text-black px-3 py-1 rounded-md">
                workflow
              </span>{" "}
              with AI precision.
            </h2>

            <p className="mt-6 text-gray-300 max-w-md">
              Join over <span className="text-white font-semibold">500+ enterprises</span>{" "}
              scaling with PentraAI.
            </p>
          </div>

          {/* Trusted */}
          <div className="flex items-center gap-4">
            <div className="flex -space-x-3">
              {["user1.jpg", "user2.jpg", "user3.jpg"].map((img, i) => (
                <img
                  key={i}
                  src={`/images/${img}`}
                  alt="team"
                  className="w-10 h-10 rounded-full object-cover border-2 border-black"
                />
              ))}
            </div>
            <p className="text-sm text-gray-400">
              Trusted by world-class teams
            </p>
          </div>

        </div>
      </div>


      <div className="flex items-center justify-end px-8 lg:px-20 py-12 bg-gradient-to-br from-black via-[#0b1220] to-black">
        {children}
      </div>
      
    </div>
  );
};

export default AuthLayout;

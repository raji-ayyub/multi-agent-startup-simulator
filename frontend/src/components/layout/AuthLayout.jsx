const AuthLayout = ({ children }) => {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[42%_58%] bg-black text-white">
      <div className="hidden lg:block relative overflow-hidden border-r border-white/10">
        <div className="absolute inset-0 bg-[url('/images/business-suit.jpg')] bg-cover bg-center" />
        <div className="absolute inset-0 bg-black/72" />

        <div className="absolute top-8 left-8 flex items-center gap-3 z-20">
          <img
            src="/images/Icon.svg"
            alt="Logo"
            className="w-8 h-8 bg-black p-1 rounded-lg"
          />
          <h1 className="text-sm font-semibold tracking-wide text-[#E2E78D]">PentraAI</h1>
        </div>

        <div className="relative z-10 flex h-full flex-col justify-between px-8 py-10">
          <div className="mt-12 max-w-xs">
            <h2 className="text-5xl font-black leading-[0.95] tracking-tight">
              Supercharge your enterprise workflow with AI-driven precision.
            </h2>
            <p className="mt-6 text-sm leading-relaxed text-slate-300">
              Experience the next generation of business intelligence. Join over
              500+ enterprises scaling with PentraAI.
            </p>
          </div>

          <div className="mb-2 flex items-center gap-3">
            <div className="flex -space-x-2">
              {["user1.jpg", "user2.jpg", "user3.jpg"].map((img, i) => (
                <img
                  key={i}
                  src={`/images/${img}`}
                  alt="team"
                  className="h-7 w-7 rounded-full border border-black object-cover"
                />
              ))}
            </div>
            <p className="text-xs text-slate-300">Trusted by world class teams</p>
          </div>
        </div>
      </div>

      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-black via-[#04070d] to-black px-4 py-10 sm:px-8">
        {children}
      </div>
    </div>
  );
};

export default AuthLayout;

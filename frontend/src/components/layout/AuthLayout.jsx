const AuthLayout = ({ children }) => {
  return (
    <div className="auth-shell min-h-screen grid grid-cols-1 lg:grid-cols-[42%_58%]">
      <div className="auth-side relative hidden overflow-hidden border-r lg:block">
        <div className="absolute inset-0 bg-[url('/images/businessman.jpg')] bg-cover bg-center" />
        <div className="auth-side-overlay absolute inset-0" />

        <div className="absolute top-8 left-8 flex items-center gap-3 z-20">
          <img
            src="/images/Icon.svg"
            alt="Logo"
            className="auth-brand-mark h-8 w-8 rounded-lg p-1"
          />
          <h1 className="text-[#e2e78d] text-sm font-semibold tracking-wide">PentraAI</h1>
        </div>

        <div className="relative z-10 flex h-full flex-col justify-between px-8 py-10">
          <div className="mt-12">
            <h2 className="app-heading text-6xl font-black leading-[1.1] tracking-tight">
              Supercharge your
              <br />
              enterprise
              <br />
              <span className="text-[#e2e78d] text-7xl">workflow</span> with
              <br />
              AI-driven
              <br />
              precision.
            </h2>
            <p className="auth-copy mt-6 text-sm leading-relaxed">
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
                  className="h-7 w-7 rounded-full border border-slate-950 object-cover"
                />
              ))}
            </div>
            <p className="auth-trust text-xs">Trusted by world class teams</p>
          </div>
        </div>
      </div>

      <div className="auth-stage flex min-h-screen items-center justify-center px-4 py-10 sm:px-8">
        {children}
      </div>
    </div>
  );
};

export default AuthLayout;

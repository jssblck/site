export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-black text-zinc-100 relative overflow-hidden">
      <header className="fixed top-0 w-full z-50 backdrop-blur-md bg-black/70 border-b border-zinc-800">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-medium text-zinc-400 tracking-tight">JB</span>
          </div>
          <nav className="flex items-center gap-4 md:gap-6">
            <a href="https://github.com/jssblck" className="text-sm text-zinc-400 hover:text-white transition-colors">
              GitHub
            </a>
            <a href="https://www.linkedin.com/in/jessica-black-17947bbb" className="text-sm text-zinc-400 hover:text-white transition-colors">
              LinkedIn
            </a>
          </nav>
        </div>
      </header>

      <section className="relative pt-32 md:pt-40 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-lavender-900/10 to-transparent opacity-30"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-lavender-500/10 rounded-full blur-3xl"></div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
              Jessica <span className="text-lavender-400">Black</span>
            </h1>
            <p className="text-xl md:text-2xl text-zinc-400 mb-4 leading-relaxed">
              <span className="text-lavender-300 font-medium">Staff Software Engineer</span> focused on creating{" "}
              <span className="text-lavender-300 font-medium">human-centered software</span> solutions that make a{" "}
              <span className="text-lavender-300 font-medium">real impact</span>.
            </p>
            <p className="text-xl md:text-2xl text-zinc-400 mb-4 leading-relaxed">
              Creating robust systems with <span className="text-lavender-300 font-medium">Rust</span>,{" "}
              enjoying the elegance of <span className="text-lavender-300 font-medium">Haskell</span>,{" "}
              scaling networks with <span className="text-lavender-300 font-medium">Go</span>,{" "}
              and building web apps with <span className="text-lavender-300 font-medium">TypeScript</span>.
            </p>
            <p className="text-xl md:text-2xl text-zinc-400 mb-4 leading-relaxed">
              I'm always open to discussing interesting projects.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}

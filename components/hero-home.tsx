import Link from "next/link";
import Image from "next/image";

export default function HeroHome() {
  return (
    <section className="relative min-h-screen pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden bg-gray-900">
      {/* ---- EPIC BIOTECH BACKGROUND ---- */}
      {/* Animated cell membrane pattern */}
      <div className="absolute inset-0 opacity-14">
        <div className="absolute inset-0 bg-[url('/cell-pattern.svg')] bg-[size:400px] animate-[membraneFlow_40s_linear_infinite]"></div>
      </div>
      
      {/* Floating holographic organelles */}
      <div className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full bg-cyan-500/10 blur-[80px] animate-[organellePulse_8s_ease-in-out_infinite]"></div>
      <div className="absolute bottom-1/3 right-1/5 w-40 h-40 rounded-full bg-purple-500/10 blur-[100px] animate-[organellePulse_12s_ease-in-out_infinite]"></div>
      
      {/* DNA strand animation */}
      <div className="absolute -right-20 top-1/3 w-[500px] h-[800px]">
        <Image 
          src="/dna-strand.png" 
          alt="" 
          fill
          className="object-contain opacity-10 animate-[dnaFloat_25s_linear_infinite]"
        />
      </div>

      {/* ---- HERO CONTENT ---- */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center">

          {/* Main headline with sci-fi effect */}
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
              Bioncolab
            </span>
            <span className="block text-2xl md:text-4xl font-light text-gray-300 mt-4">
              The <span className="text-cyan-400">GitHub</span> of Biological Research
            </span>
          </h1>

          {/* Holographic description */}
          <div className="max-w-3xl mx-auto mb-12">
            <p className="text-xl text-gray-300 font-light leading-relaxed">
              Collaborate on <span className="text-cyan-400">AI-powered</span> research with version-controlled labs, 
              <span className="text-purple-400"> molecular simulations</span>, and global 
              <span className="text-blue-400"> scientific challenges</span>.
            </p>
          </div>

          {/* Cyberpunk-style buttons */}
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-20">
            <Link 
              href="/signup" 
              className="px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium rounded-lg border-b-4 border-cyan-700 hover:border-cyan-600 transition-all hover:shadow-2xl hover:shadow-cyan-500/20 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
              </svg>
              Launch Your Lab
            </Link>
          </div>

          {/* Holographic lab interface preview */}
     <div className="relative mx-auto max-w-4xl h-[300px] sm:h-[400px] md:h-[450px] lg:h-[500px] rounded-2xl overflow-hidden shadow-xl shadow-cyan-500/10">
  {/* Animated border */}
  <div className="absolute inset-0 rounded-2xl border-4 border-transparent bg-clip-padding before:absolute before:inset-0 before:rounded-2xl before:border-[3px] before:animate-borderGradient before:border-transparent before:bg-[conic-gradient(at_top_left,_cyan,blue,indigo,violet,cyan)] before:bg-[length:200%_200%] before:blur-md z-0" />

  {/* Image container */}
  <div className="relative z-10 h-full w-full rounded-2xl overflow-hidden bg-gray-900/60 backdrop-blur-md">
    <img 
      src="/sd.jpg" 
      alt="Main visual"
      className="w-full h-full object-cover"
    />
  
</div>

            
            {/* Floating UI elements */}
            
            
            
            
            
          </div>
        </div>
      </div>
    </section>
  );
}
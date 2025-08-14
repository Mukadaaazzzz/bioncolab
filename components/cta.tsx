import Image from "next/image";
import DnaStrand from "@/public/dna-strand.png";

export default function Cta() {
  return (
    <section className="relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-blue-900/20 to-indigo-900/30" />
      
      {/* DNA strand pattern */}
      <div className="absolute inset-0 -z-20 opacity-10">
        <Image 
          src={DnaStrand}
          alt="DNA strand pattern"
          fill
          className="object-cover"
        />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 md:py-24">
        <div className="relative rounded-2xl bg-gray-900 px-8 py-12 md:px-16 md:py-20 overflow-hidden">
          {/* Floating molecule decoration */}
          <div className="absolute -right-20 -top-20 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="absolute -left-20 -bottom-20 w-72 h-72 rounded-full bg-indigo-500/10 blur-3xl" />
          
          <div className="relative z-10 text-center">
            <h2 className="mb-8 text-3xl md:text-4xl font-bold text-white">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">
                Ready to Accelerate
              </span> Your Research?
            </h2>
            
            <div className="mx-auto max-w-prose">
              <p className="mb-8 text-xl text-gray-300">
                Join thousands of scientists collaborating on breakthrough discoveries with BioColab's powerful tools.
              </p>
              
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <a
                  href="/signup"
                  className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all transform hover:scale-105 flex items-center justify-center"
                >
                  <span>Start Your Free Lab</span>
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
                  </svg>
                </a>
                
                
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
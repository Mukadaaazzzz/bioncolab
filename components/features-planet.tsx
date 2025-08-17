export default function FeaturesPlanet() {
  return (
    <section className="bg-white">
      {/* Section header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 md:py-28">
        <div className="max-w-3xl mx-auto text-center mb-16 md:mb-20">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
              Research Infrastructure
            </span> for the Modern Scientist
          </h2>
          <p className="text-xl text-gray-600">
            Collaborative tools designed to accelerate breakthrough discoveries
          </p>
        </div>

        {/* Features grid */}
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard 
            icon={
              <div className="w-10 h-10 flex items-center justify-center bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"></path>
                </svg>
              </div>
            }
            title="Peer Review"
            description="Git-like tracking for research protocols, data, and findings with full audit trails."
          />

          <FeatureCard 
            icon={
              <div className="w-10 h-10 flex items-center justify-center bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"></path>
                </svg>
              </div>
            }
            title="AI Co-Pilot"
            description="Context-aware suggestions for experimental design and literature review."
          />

          
          <FeatureCard 
            icon={
              <div className="w-10 h-10 flex items-center justify-center bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"></path>
                </svg>
              </div>
            }
            title="Challenge Mode"
            description="Compete in prize-backed research challenges with global teams."
          />

          
        </div>

       
      </div>
    </section>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="group p-6 bg-white rounded-xl border border-gray-200 hover:border-blue-200 hover:shadow-lg transition-all">
      {icon}
      <h3 className="text-xl font-bold text-gray-900 mt-4 mb-2 group-hover:text-blue-600 transition-colors">
        {title}
      </h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}
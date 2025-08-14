'use client'

import Footer from '@/components/ui/footer'
import Header from '@/components/ui/header'
import { FiZap, FiFolderPlus, FiUsers, FiPlusCircle } from 'react-icons/fi'

export default function DocsPage() {
  return (
    <><Header />
    <div className="max-w-4xl mx-auto px-4 py-12 mt-10">
          <h1 className="text-4xl font-bold text-blue-800 mb-6">Welcome to Bioncolab</h1>

          <p className="text-lg text-gray-700 mb-6">
              Bioncolab is a collaborative platform for solving the world’s toughest bioscience problems — from rare genetic disorders to drug-resistant diseases, cancer, and beyond.
              It's designed for scientists, students, clinicians, and AI to work together just like developers do on GitHub.
          </p>

          <div className="space-y-10">
              <div className="flex items-start gap-4">
                  <FiZap className="text-blue-600 mt-1" size={24} />
                  <div>
                      <h2 className="text-xl font-semibold text-gray-800">1. Your Dashboard</h2>
                      <p className="text-gray-600">
                          Once signed in, you'll land on your personal dashboard. This is your home base where you can view your Labs (research workspaces), challenges you've joined, and your activity.
                          From here, you can create a new Lab or join an existing one.
                      </p>
                  </div>
              </div>

              <div className="flex items-start gap-4">
                  <FiFolderPlus className="text-green-600 mt-1" size={24} />
                  <div>
                      <h2 className="text-xl font-semibold text-gray-800">2. Creating or Joining a Lab</h2>
                      <p className="text-gray-600">
                          A Lab is like a GitHub repository — it's a place to work on a specific research problem. You can make it public or private.
                          Each Lab includes versioned documents, experiment logs, datasets, hypotheses, and contributions from collaborators. Other researchers can fork your Lab, contribute ideas, and help push breakthroughs.
                      </p>
                  </div>
              </div>

              <div className="flex items-start gap-4">
                  <FiUsers className="text-purple-600 mt-1" size={24} />
                  <div>
                      <h2 className="text-xl font-semibold text-gray-800">3. Working Together</h2>
                      <p className="text-gray-600">
                          Bioncolab is built for collaboration. Other users can view your Labs, suggest improvements, and contribute directly if allowed.
                          Just like Git, they can create branches, propose experiments, and document results. All changes are tracked for transparency.
                      </p>
                  </div>
              </div>

              <div className="flex items-start gap-4">
                  <FiPlusCircle className="text-pink-600 mt-1" size={24} />
                  <div>
                      <h2 className="text-xl font-semibold text-gray-800">4. Launching or Joining a Challenge</h2>
                      <p className="text-gray-600">
                          You can start or join open scientific challenges — global missions like “Cure Childhood Leukemia” or “Understand Glaucoma.” These are special Labs that anyone can contribute to.
                          They’re often backed by sponsors, universities, or nonprofits and can include funding or prizes.
                      </p>
                  </div>
              </div>

              <div className="mt-14">
                  <h2 className="text-2xl font-bold text-blue-700 mb-4">How It All Works</h2>
                  <ul className="list-disc list-inside text-gray-700 space-y-2">
                      <li><strong>Version Control:</strong> Every lab edit is tracked. Researchers can see changes over time, revert, or merge new ideas.</li>
                      <li><strong>AI Co-Pilot:</strong> Integrated AI helps with literature reviews, experiment design, and even generating summaries or visualizations.</li>
                      <li><strong>Compute Sandbox:</strong> Labs can run computations (coming soon) — simulations, data analysis, or predictions — all inside isolated environments.</li>
                      <li><strong>Peer Review:</strong> You can request feedback from the community or experts, with transparent commentary and voting.</li>
                      <li><strong>Data Vault:</strong> Store datasets, figures, and findings securely. Each version gets a digital fingerprint for citation or proof of work.</li>
                  </ul>
              </div>

              <div className="mt-12">
                  <h3 className="text-xl text-gray-800 font-medium mb-2">Let’s build the future of science — together.</h3>
                  <p className="text-gray-600">
                      Bioncolab isn’t just a platform — it’s a movement. We’re reimagining how humans solve scientific problems using the best tools, people, and AI collaboration on Earth.
                      Whether you're a lone biologist with a big idea or a global team working on a cure — your Lab starts here.
                  </p>
              </div>
          </div>
      </div>
      <Footer/>
      </>
  )
}

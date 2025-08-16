'use client'

import Link from 'next/link'

export default function LargeTestimonial() {
  return (
    <section className="bg-gray-100 py-20 md:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
              Simple Pricing
            </span>{' '}
            for Every Researcher
          </h2>
          <p className="text-xl text-gray-600">
            Start free. Upgrade when you need higher limits and priority features.
          </p>
        </div>

        {/* Pricing cards */}
        <div className="grid gap-8 max-w-5xl mx-auto md:grid-cols-2">
          {/* Free Tier */}
          <div className="relative p-8 bg-white rounded-2xl border-2 border-gray-200 hover:border-blue-300 transition-colors">
            <div className="absolute top-0 right-0 mt-6 mr-6">
              <span className="px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800 rounded-full">
                Popular
              </span>
            </div>

            <div className="mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-1">Free</h3>
              <p className="text-gray-600">Best for students & independent researchers</p>
            </div>

            <div className="mb-8">
              <span className="text-5xl font-bold text-gray-900">$0</span>
              <span className="text-gray-500">/month</span>
            </div>

            <ul className="space-y-4 mb-8">
              <Feature>150 AI messages / month</Feature>
              <Feature>50 literature searches / month</Feature>
              <Feature>10 analyses / month</Feature>
              <Divider />
              <Feature>Create up to 3 colabs</Feature>
              <Feature>Contribute in up to 10 colabs</Feature>
              <Feature>1 active challenge at a time</Feature>
              <Divider />
              <Feature>Public or private colabs (owner controls)</Feature>
              <Feature>Basic AI co-pilot access</Feature>
            </ul>

            <Link
              href="/signin"
              className="block w-full text-center px-6 py-3 border-2 border-gray-300 text-gray-800 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Get Started
            </Link>
          </div>

          {/* Pro Tier */}
          <div className="relative p-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-200">
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-1">Pro</h3>
              <p className="text-gray-600">For active labs, teams & power users</p>
            </div>

            <div className="mb-8">
              <span className="text-5xl font-bold text-gray-900">$12</span>
              <span className="text-gray-500">/month per user</span>
            </div>

            <ul className="space-y-4 mb-8">
              <Feature emph>Everything in Free, plus:</Feature>
              <Feature>2,000 AI messages / month</Feature>
              <Feature>500 literature searches / month</Feature>
              <Feature>200 analyses / month</Feature>
              <Divider />
              <Feature>Unlimited colabs you can create</Feature>
              <Feature>Unlimited colabs you can contribute in</Feature>
              <Feature>Unlimited active challenges</Feature>
              <Divider />
              <Feature>Priority AI models & faster lanes</Feature>
              <Feature>Email support</Feature>
            </ul>

            <Link
              href="/pricing"
              className="block w-full text-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-colors shadow-md"
            >
              Upgrade to Pro
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

/* --- tiny helpers to keep markup tidy --- */
function Feature({ children, emph = false }: { children: React.ReactNode; emph?: boolean }) {
  return (
    <li className="flex items-start">
      <svg
        className={`w-5 h-5 mr-3 ${emph ? 'text-blue-600' : 'text-green-500'}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
      </svg>
      <span className={`text-gray-700 ${emph ? 'font-medium' : ''}`}>{children}</span>
    </li>
  )
}

function Divider() {
  return <li className="border-t border-gray-200 my-2" aria-hidden="true" />
}

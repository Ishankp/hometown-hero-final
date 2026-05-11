/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useNavigate } from 'react-router-dom';
import { MapPin, Users, Zap } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      {/* Patriotic stripe header */}
      <div className="h-1 bg-gradient-to-r from-red-600 via-blue-700 to-red-600"></div>

      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-b from-blue-50 to-white">
        <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-6 inline-flex items-center border border-blue-200 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-blue-800 shadow-sm backdrop-blur-sm">
              Team USA x Google Cloud submission
            </div>
            <h1 className="text-5xl font-bold tracking-tight sm:text-7xl text-blue-900">
              Olympian Hometown Explorer
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-700">
              Discover the geographic origins of Olympic athletes. Explore interactive maps, filter by sport and time period, and dive deep into the stories of champions from around the world.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <button
                onClick={() => navigate('/app')}
                className="rounded-none border-2 border-red-600 bg-red-600 px-8 py-3 text-sm font-semibold text-white shadow-md hover:bg-red-700 hover:border-red-700 transition-colors font-bold"
              >
                Explore Athletes
              </button>
              <a
                href="#features"
                className="text-sm font-semibold leading-6 text-blue-700 border-2 border-blue-700 px-8 py-3 rounded-none hover:bg-blue-50 transition-colors"
              >
                Learn More <span aria-hidden="true">↓</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="py-24 sm:py-32 bg-white border-t-4 border-blue-700">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-blue-900">
              Features
            </h2>
            <p className="mt-4 text-lg text-gray-700">
              Everything you need to explore Olympic history through a geographic lens
            </p>
          </div>
          
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {/* Feature 1 */}
            <div className="relative rounded-lg border-2 border-gray-200 bg-white p-8 hover:border-red-400 hover:shadow-lg transition-all">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-100 border-2 border-red-600">
                <MapPin className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="mt-4 text-xl font-semibold text-blue-900">Interactive Maps</h3>
              <p className="mt-2 text-gray-700">
                Visualize athlete origins on a beautiful, interactive world map. Click on countries and cities to explore further.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="relative rounded-lg border-2 border-gray-200 bg-white p-8 hover:border-blue-400 hover:shadow-lg transition-all">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 border-2 border-blue-700">
                <Users className="h-6 w-6 text-blue-700" />
              </div>
              <h3 className="mt-4 text-xl font-semibold text-blue-900">Detailed Athlete Profiles</h3>
              <p className="mt-2 text-gray-700">
                Access comprehensive information about Olympic athletes including sports, events, and participation history.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="relative rounded-lg border-2 border-gray-200 bg-white p-8 hover:border-red-400 hover:shadow-lg transition-all">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-100 border-2 border-red-600">
                <Zap className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="mt-4 text-xl font-semibold text-blue-900">Advanced Filtering</h3>
              <p className="mt-2 text-gray-700">
                Filter athletes by sport, event, time period, gender, and classification to discover specific patterns and trends.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 py-16 text-white">
        <div className="mx-auto max-w-4xl px-6 text-center lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight">
            Ready to explore?
          </h2>
          <p className="mt-4 text-lg text-blue-100">
            Start your journey through Olympic history and geography.
          </p>
          <button
            onClick={() => navigate('/app')}
            className="mt-8 rounded-none border-2 border-red-500 bg-red-600 px-8 py-3 text-sm font-semibold text-white shadow-md hover:bg-red-700 hover:border-red-700 transition-colors font-bold"
          >
            Launch Explorer
          </button>
        </div>
      </div>

      {/* How It Was Made */}
      <section className="border-t border-ink/10 bg-white py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-bold text-blue-900">How it was made</h2>
            <p className="mt-4 text-gray-700">
              This project was prototyped using Google AI Studio and deployed with Google Cloud services. The map and filtering ideas were inspired by the Team USA interactive map available at{' '}
              <a className="text-blue-700 underline" href="https://www.teamusa.com/map" target="_blank" rel="noreferrer">https://www.teamusa.com/map</a>.
            </p>
            <p className="mt-4 text-gray-700">
              I saw the potential of that feature and wanted to make a more relatable, local experience — so this explorer surfaces statistics and quick insights about athletes from your hometown or home state, and provides links to learn more about their participation history.
            </p>
            <div className="mt-6 flex justify-center gap-4">
              <a
                onClick={() => navigate('/app')}
                className="cursor-pointer inline-flex items-center rounded-none border-2 border-red-600 bg-red-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 transition-colors"
              >
                View the Explorer
              </a>
              <a
                href="https://cloud.google.com"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-none border-2 border-blue-700 px-5 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 transition-colors"
              >
                Google Cloud
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t-4 border-red-600 bg-white py-8 px-6">
        <div className="mx-auto max-w-7xl text-center text-sm text-gray-600">
          <p>© 2024 Olympian Hometown Explorer. Celebrating athletic excellence worldwide.</p>
        </div>
      </footer>
    </div>
  );
}

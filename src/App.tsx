import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Github, 
  LogOut, 
  GitBranch, 
  Star, 
  Users, 
  BookOpen, 
  ExternalLink, 
  Search,
  Code,
  Calendar,
  ChevronRight,
  TrendingUp,
  Layout
} from 'lucide-react';

interface GitHubUser {
  login: string;
  avatar_url: string;
  name: string;
  bio: string;
  public_repos: number;
  followers: number;
  following: number;
  html_url: string;
}

interface GitHubRepo {
  id: number;
  name: string;
  description: string;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  language: string;
  updated_at: string;
}

export default function App() {
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchUserData = async () => {
    try {
      const userRes = await fetch('/api/user');
      if (userRes.ok) {
        const userData = await userRes.json();
        setUser(userData);
        
        const reposRes = await fetch('/api/repos');
        if (reposRes.ok) {
          const reposData = await reposRes.json();
          setRepos(reposData);
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();

    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) {
        return;
      }
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        setLoading(true);
        fetchUserData();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleLogin = async () => {
    try {
      const res = await fetch('/api/auth/url');
      const { url } = await res.json();
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      window.open(
        url,
        'github_oauth',
        `width=${width},height=${height},left=${left},top=${top}`
      );
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setRepos([]);
  };

  const filteredRepos = repos.filter(repo => 
    repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (repo.description && repo.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return (
      <div id="loading-spinner" className="flex items-center justify-center min-h-screen bg-gray-50">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
        >
          <Github className="w-12 h-12 text-gray-400" />
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div id="login-container" className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center"
        >
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-black rounded-2xl">
              <Github className="w-12 h-12 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">GitHub Portfolio</h1>
          <p className="text-gray-500 mb-8">
            Connect your GitHub account to showcase your public repositories and explore your insights.
          </p>
          <button
            id="login-button"
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 bg-black hover:bg-gray-800 text-white font-semibold py-4 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl active:scale-[0.98]"
          >
            <Github className="w-5 h-5" />
            Connect with GitHub
          </button>
          <p className="mt-6 text-xs text-gray-400">
            Secure connection via GitHub OAuth 2.0
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div id="dashboard-root" className="min-h-screen bg-gray-50 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <Github className="w-8 h-8" />
              <span className="font-bold text-xl tracking-tight hidden sm:block">Portfolio</span>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search repositories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-gray-100 border-none rounded-full text-sm focus:ring-2 focus:ring-black outline-none w-64 transition-all"
                />
              </div>
              <button
                id="logout-button"
                onClick={handleLogout}
                className="flex items-center gap-2 text-gray-500 hover:text-red-600 font-medium text-sm transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Section */}
        <section className="mb-10">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <motion.img
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                src={user.avatar_url}
                alt={user.login}
                className="w-24 h-24 md:w-32 md:h-32 rounded-3xl shadow-lg"
              />
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h2 className="text-3xl font-bold text-gray-900">{user.name || user.login}</h2>
                  <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full">@{user.login}</span>
                </div>
                <p className="text-gray-600 text-lg mb-6 max-w-2xl">{user.bio || 'No bio available'}</p>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Repos', value: user.public_repos, icon: BookOpen },
                    { label: 'Followers', value: user.followers, icon: Users },
                    { label: 'Following', value: user.following, icon: Users },
                    { label: 'Activity', value: 'High', icon: TrendingUp },
                  ].map((stat, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className="p-2 bg-white rounded-lg shadow-sm">
                        <stat.icon className="w-4 h-4 text-gray-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{stat.label}</p>
                        <p className="text-lg font-bold text-gray-900">{stat.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="w-full md:w-auto">
                <a
                  href={user.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-black transition-all shadow-md"
                >
                  View Profile <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Repositories Grid */}
        <section>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Layout className="w-5 h-5" /> Repositories
            </h3>
            <div className="md:hidden">
               <Search className="w-5 h-5 text-gray-500" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredRepos.map((repo, i) => (
                <motion.div
                  key={repo.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="group bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all hover:-translate-y-1 relative"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-gray-50 rounded-lg group-hover:bg-blue-50 transition-colors">
                      <Code className="w-5 h-5 text-gray-600 group-hover:text-blue-600" />
                    </div>
                    <div className="flex items-center gap-3 text-xs font-medium text-gray-500">
                      <Tooltip label="Stars">
                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" /> {repo.stargazers_count}
                        </span>
                      </Tooltip>
                      <Tooltip label="Forks">
                        <span className="flex items-center gap-1">
                          <GitBranch className="w-3 h-3 text-gray-400" /> {repo.forks_count}
                        </span>
                      </Tooltip>
                    </div>
                  </div>
                  
                  <h4 className="text-lg font-bold text-gray-900 mb-2 truncate group-hover:text-blue-600 transition-colors">
                    {repo.name}
                  </h4>
                  <p className="text-sm text-gray-500 line-clamp-2 h-10 mb-6">
                    {repo.description || 'No description provided.'}
                  </p>
                  
                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-50">
                    <div className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      {repo.language || 'Plain Text'}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-gray-400 uppercase font-bold tracking-widest">
                       <Calendar className="w-3 h-3" />
                       {new Date(repo.updated_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                  
                  <a 
                    href={repo.html_url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="absolute inset-0 z-0" 
                    aria-label={`View ${repo.name} on GitHub`}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </section>
      </main>
    </div>
  );
}

function Tooltip({ children, label }: { children: React.ReactNode, label: string }) {
  return (
    <div className="relative group/tooltip">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-[10px] rounded opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
        {label}
      </div>
    </div>
  );
}

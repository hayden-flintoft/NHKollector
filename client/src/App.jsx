import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Dashboard from './pages/Dashboard';
import Shows from './pages/Shows';
import Episodes from './pages/Episodes';
import Downloads from './pages/Downloads';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';
import { AppContextProvider } from './context/AppContext';

function App() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check server health on initial load
    fetch('/api/health')
      .then((response) => response.json())
      .then((data) => {
        console.log('Server health check:', data);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error('Server health check failed:', error);
        setIsLoading(false);
      });
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-primary-600 border-solid mx-auto"></div>
          <p className="mt-4 text-lg">Loading NHKTool...</p>
        </div>
      </div>
    );
  }

  return (
    <AppContextProvider>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="container flex-grow py-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/shows" element={<Shows />} />
            <Route path="/episodes/:showId" element={<Episodes />} />
            <Route path="/downloads" element={<Downloads />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </AppContextProvider>
  );
}

export default App;
import React, { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext();

export function AppContextProvider({ children }) {
  const [shows, setShows] = useState([]);
  const [selectedShow, setSelectedShow] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [downloads, setDownloads] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch shows on mount
  useEffect(() => {
    fetchShows();
  }, []);

  // Fetch shows from the API
  const fetchShows = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/shows');
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setShows(data);
    } catch (err) {
      console.error('Error fetching shows:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch episodes for a specific show
  const fetchEpisodes = async (showName) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/episodes/${showName}`);
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setEpisodes(data);
      return data;
    } catch (err) {
      console.error('Error fetching episodes:', err);
      setError(err.message);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // Initiate a download
  const downloadEpisode = async (url) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Error downloading episode:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Clear any error
  const clearError = () => setError(null);

  return (
    <AppContext.Provider
      value={{
        shows,
        episodes,
        downloads,
        selectedShow,
        isLoading,
        error,
        fetchShows,
        fetchEpisodes,
        downloadEpisode,
        setSelectedShow,
        clearError,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  return useContext(AppContext);
}
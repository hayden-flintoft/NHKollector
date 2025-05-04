import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

function Shows() {
  const { shows, isLoading, error, fetchShows } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredShows, setFilteredShows] = useState([]);
  const [sortOption, setSortOption] = useState('name');

  useEffect(() => {
    // Filter and sort shows when shows data, search term, or sort option changes
    if (shows && shows.length > 0) {
      let filtered = [...shows];

      // Filter by search term if provided
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        filtered = filtered.filter(
          show => 
            show.name.toLowerCase().includes(searchLower) || 
            (show.description && show.description.toLowerCase().includes(searchLower))
        );
      }

      // Sort shows based on selected option
      filtered.sort((a, b) => {
        switch (sortOption) {
          case 'name':
            return a.name.localeCompare(b.name);
          case 'episodeCount':
            const aCount = a.episodes?.length || 0;
            const bCount = b.episodes?.length || 0;
            return bCount - aCount;
          case 'recent':
            const aDate = a.state?.lastFetchedAt ? new Date(a.state.lastFetchedAt) : new Date(0);
            const bDate = b.state?.lastFetchedAt ? new Date(b.state.lastFetchedAt) : new Date(0);
            return bDate - aDate;
          default:
            return a.name.localeCompare(b.name);
        }
      });

      setFilteredShows(filtered);
    } else {
      setFilteredShows([]);
    }
  }, [shows, searchTerm, sortOption]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
        Shows
      </h1>
      
      {/* Search and Sort Controls */}
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <div className="w-full md:w-2/3">
          <input 
            type="text" 
            placeholder="Search shows..." 
            className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-full md:w-1/3">
          <select 
            className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
          >
            <option value="name">Sort by Name</option>
            <option value="episodeCount">Sort by Episode Count</option>
            <option value="recent">Sort by Recently Updated</option>
          </select>
        </div>
        <button 
          onClick={() => fetchShows()} 
          className="btn btn-primary md:flex-shrink-0"
          disabled={isLoading}
        >
          {isLoading ? 'Refreshing...' : 'Refresh Shows'}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>Error loading shows: {error}</p>
        </div>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      )}

      {/* Shows Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredShows.map((show) => (
          <ShowCard key={show.nhkId} show={show} />
        ))}
      </div>

      {/* No Results Message */}
      {!isLoading && filteredShows.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">
            {shows.length > 0 
              ? 'No shows match your search criteria.' 
              : 'No shows found. Click "Refresh Shows" to fetch the latest shows.'}
          </p>
        </div>
      )}
    </div>
  );
}

function ShowCard({ show }) {
  // Default placeholder image if no image URL is provided
  const defaultImage = 'https://via.placeholder.com/400x225?text=No+Image';
  
  return (
    <Link 
      to={`/episodes/${show.nhkId}`} 
      className="card hover:shadow-lg transition-shadow overflow-hidden flex flex-col"
    >
      <div className="relative pb-[56.25%]">
        <img 
          src={show.imageUrl || defaultImage} 
          alt={show.name}
          className="absolute top-0 left-0 w-full h-full object-cover"
          onError={(e) => { e.target.src = defaultImage }}
        />
        {show.sonarrId && (
          <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
            Sonarr
          </div>
        )}
      </div>
      <div className="p-4 flex-grow flex flex-col">
        <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-2 line-clamp-1">
          {show.name}
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm line-clamp-2 mb-3">
          {show.description || 'No description available.'}
        </p>
        <div className="mt-auto flex justify-between text-sm text-gray-500 dark:text-gray-400">
          <span>{show.episodes?.length || 0} episodes</span>
          <span>
            {show.state?.lastFetchedAt 
              ? new Date(show.state.lastFetchedAt).toLocaleDateString() 
              : 'Unknown date'}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default Shows;
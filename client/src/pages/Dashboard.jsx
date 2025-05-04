import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

function Dashboard() {
  const { shows, isLoading, error } = useAppContext();
  const [stats, setStats] = useState({
    totalShows: 0,
    totalEpisodes: 0,
    recentDownloads: [],
    pendingDownloads: 0
  });

  useEffect(() => {
    // Calculate dashboard stats
    if (shows && shows.length > 0) {
      // Get total shows
      const totalShows = shows.length;
      
      // Get total episodes across all shows
      let totalEpisodes = 0;
      shows.forEach(show => {
        if (show.episodes && show.episodes.length) {
          totalEpisodes += show.episodes.length;
        }
      });
      
      // Get recent downloads (downloaded episodes sorted by date)
      const downloadedEpisodes = [];
      shows.forEach(show => {
        if (show.episodes) {
          const downloaded = show.episodes.filter(
            ep => ep.downloadStatus && ep.downloadStatus.downloaded
          );
          downloadedEpisodes.push(...downloaded.map(ep => ({
            ...ep,
            showName: show.name
          })));
        }
      });
      
      // Sort by download date, most recent first
      downloadedEpisodes.sort((a, b) => {
        const dateA = a.downloadStatus && a.downloadStatus.completedAt ? new Date(a.downloadStatus.completedAt) : 0;
        const dateB = b.downloadStatus && b.downloadStatus.completedAt ? new Date(b.downloadStatus.completedAt) : 0;
        return dateB - dateA;
      });
      
      // Get pending downloads
      const pendingDownloads = shows.reduce((count, show) => {
        if (show.episodes) {
          return count + show.episodes.filter(
            ep => ep.downloadStatus && ep.downloadStatus.status === 'pending'
          ).length;
        }
        return count;
      }, 0);
      
      // Update stats
      setStats({
        totalShows,
        totalEpisodes,
        recentDownloads: downloadedEpisodes.slice(0, 5),
        pendingDownloads
      });
    }
  }, [shows]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
        <p>Error loading dashboard: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
        Dashboard
      </h1>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Shows"
          value={stats.totalShows}
          icon="📺"
          link="/shows"
          color="bg-blue-500"
        />
        <StatCard
          title="Total Episodes"
          value={stats.totalEpisodes}
          icon="🎬"
          color="bg-green-500"
        />
        <StatCard
          title="Pending Downloads"
          value={stats.pendingDownloads}
          icon="⏱️"
          link="/downloads"
          color="bg-yellow-500"
        />
        <StatCard
          title="Server Status"
          value="Online"
          icon="✅"
          color="bg-purple-500"
        />
      </div>
      
      {/* Recent Downloads */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
          Recent Downloads
        </h2>
        {stats.recentDownloads && stats.recentDownloads.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Show
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Episode
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                {stats.recentDownloads.map((episode) => (
                  <tr key={episode.nhkId}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                      {episode.showName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                      {episode.title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                      {episode.downloadStatus && episode.downloadStatus.completedAt
                        ? new Date(episode.downloadStatus.completedAt).toLocaleDateString()
                        : 'Unknown'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">No recent downloads</p>
        )}
      </div>
      
      {/* Quick Actions */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <QuickActionButton
            title="Browse Shows"
            icon="📺"
            link="/shows"
            color="bg-blue-500"
          />
          <QuickActionButton
            title="Check Downloads"
            icon="📥"
            link="/downloads"
            color="bg-green-500"
          />
          <QuickActionButton
            title="Settings"
            icon="⚙️"
            link="/settings"
            color="bg-purple-500"
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, link, color }) {
  const cardContent = (
    <>
      <div className={`${color} text-white p-3 rounded-full`}>
        <span className="text-2xl">{icon}</span>
      </div>
      <div>
        <h3 className="text-lg font-medium text-gray-800 dark:text-white">{title}</h3>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      </div>
    </>
  );

  if (link) {
    return (
      <Link to={link} className="card hover:shadow-lg transition-shadow flex items-center space-x-4">
        {cardContent}
      </Link>
    );
  }

  return (
    <div className="card flex items-center space-x-4">
      {cardContent}
    </div>
  );
}

function QuickActionButton({ title, icon, link, color }) {
  return (
    <Link
      to={link}
      className={`${color} text-white p-4 rounded-lg flex items-center justify-center space-x-2 hover:opacity-90 transition-opacity`}
    >
      <span className="text-xl">{icon}</span>
      <span className="font-medium">{title}</span>
    </Link>
  );
}

export default Dashboard;
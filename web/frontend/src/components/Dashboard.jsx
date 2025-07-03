import React, { useState, useEffect } from 'react'
import ShowsGrid from './ShowsGrid'
import DownloadQueue from './DownloadQueue'
import ActivityLog from './ActivityLog'

const Dashboard = () => {
  const [shows, setShows] = useState([])
  const [downloads, setDownloads] = useState([])
  const [serviceStatus, setServiceStatus] = useState('unknown')

  useEffect(() => {
    // Fetch initial data
    fetchShows()
    fetchDownloads()
    fetchStatus()
    
    // Set up polling for real-time updates
    const interval = setInterval(() => {
      fetchDownloads()
      fetchStatus()
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const fetchShows = async () => {
    try {
      const response = await fetch('/api/shows')
      const data = await response.json()
      setShows(data)
    } catch (error) {
      console.error('Error fetching shows:', error)
    }
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>NHKollector</h1>
        <div className="status-indicator">
          Service: <span className={`status ${serviceStatus}`}>{serviceStatus}</span>
        </div>
      </header>
      
      <div className="dashboard-grid">
        <ShowsGrid shows={shows} onShowUpdate={fetchShows} />
        <DownloadQueue downloads={downloads} />
        <ActivityLog />
      </div>
    </div>
  )
}

export default Dashboard
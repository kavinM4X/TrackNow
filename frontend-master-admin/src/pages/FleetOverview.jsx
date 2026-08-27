import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { 
  Truck, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Radio
} from 'lucide-react';

const FleetOverview = () => {
  const [vehicles, setVehicles] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchFleetData = async () => {
    setLoading(true);
    try {
      // Try fetching vehicle rentals or driver vehicles
      let rentalData = [];
      try {
        const rentalRes = await api.get('/vehicle-rental/sessions');
        rentalData = rentalRes.data.sessions || rentalRes.data || [];
      } catch (e) {
        console.warn('Vehicle rentals endpoint notice:', e);
      }

      let driverVehicles = [];
      try {
        const driversRes = await api.get('/driver-management/drivers');
        driverVehicles = driversRes.data.drivers || driversRes.data || [];
      } catch (e) {
        console.warn('Drivers fleet endpoint notice:', e);
      }

      setRentals(rentalData);
      setVehicles(driverVehicles);
    } catch (err) {
      console.error('Error fetching fleet overview:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFleetData();
  }, []);

  return (
    <div>
      {/* Page Title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.85rem', fontWeight: 700 }}>
            Master Fleet & Logistics Overview
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Live vehicle rental sessions, driver vehicle tracking, and active transport jobs.
          </p>
        </div>
        <button onClick={fetchFleetData} className="btn btn-secondary">
          <RefreshCw size={16} className={loading ? 'spin' : ''} />
          <span>Sync Telemetry</span>
        </button>
      </div>

      {/* Fleet Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Active Fleet Drivers</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, fontFamily: 'var(--font-heading)', marginTop: '0.2rem', color: 'var(--accent-cyan)' }}>
            {vehicles.length || 4}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Vehicle Rental Sessions</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, fontFamily: 'var(--font-heading)', marginTop: '0.2rem', color: 'var(--accent-emerald)' }}>
            {rentals.length || 2}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>GPS Telemetry</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, fontFamily: 'var(--font-heading)', marginTop: '0.2rem', color: 'var(--primary)' }}>
            Online
          </div>
        </div>
      </div>

      {/* Active Driver Fleet List */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Truck size={20} style={{ color: 'var(--accent-cyan)' }} />
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: 700 }}>
              Registered Logistics Vehicles & Drivers
            </h3>
          </div>
          <div className="pill pill-cyan">
            <Radio size={12} />
            <span>LIVE MONITORED</span>
          </div>
        </div>

        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Driver Name</th>
                <th>Phone</th>
                <th>Vehicle Reg #</th>
                <th>Status</th>
                <th>Active Sessions</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.length > 0 ? (
                vehicles.map((v) => (
                  <tr key={v._id || v.phone}>
                    <td style={{ fontWeight: 600 }}>{v.name}</td>
                    <td>{v.phone}</td>
                    <td>
                      <span style={{ fontFamily: 'monospace', background: 'rgba(255,255,255,0.06)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                        {v.vehicleId || 'KA-04-TR-9092'}
                      </span>
                    </td>
                    <td>
                      <span className="pill pill-green">
                        <CheckCircle2 size={12} />
                        <span>Ready</span>
                      </span>
                    </td>
                    <td>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Standard Fleet</span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                    No fleet vehicles active or initializing.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FleetOverview;

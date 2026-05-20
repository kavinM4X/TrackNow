import { useEffect, useRef, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';
import AppShell from '../../components/layout/AppShell';
import Badge from '../../components/common/Badge';
import Spinner from '../../components/common/Spinner';
import api from '../../api/client';
import styles from './Tracker.module.css';
import 'leaflet/dist/leaflet.css';

export default function Tracker() {
  const [config, setConfig] = useState(null);
  const [position, setPosition] = useState(null);
  const [loading, setLoading] = useState(true);
  const posRef = useRef(null);

  useEffect(() => {
    api
      .get('/tracker/my')
      .then((res) => {
        setConfig(res.data);
        if (res.data.latitude != null && res.data.longitude != null) {
          const p = [res.data.latitude, res.data.longitude];
          posRef.current = p;
          setPosition(p);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!config?.isEnabled || config.latitude == null || config.longitude == null) {
      return undefined;
    }

    posRef.current = [config.latitude, config.longitude];
    setPosition([config.latitude, config.longitude]);

    const tick = () => {
      let lat = posRef.current?.[0];
      let lng = posRef.current?.[1];
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      lat += (Math.random() - 0.5) * 0.002;
      lng += (Math.random() - 0.5) * 0.002;
      lat = Math.max(-90, Math.min(90, lat));
      lng = Math.max(-180, Math.min(180, lng));
      api
        .post('/tracker/position', { lat, lng })
        .then(() => {
          posRef.current = [lat, lng];
          setPosition([lat, lng]);
          setConfig((c) =>
            c ? { ...c, latitude: lat, longitude: lng, lastLocationAt: new Date().toISOString() } : c
          );
        })
        .catch(() => {});
    };

    tick();
    const id = setInterval(tick, 12000);
    return () => clearInterval(id);
  }, [config?.isEnabled, config?.latitude, config?.longitude]);

  const enabled = config?.isEnabled;

  return (
    <AppShell title="Live Tracker" activePulse={enabled}>
      {loading ? (
        <Spinner />
      ) : !enabled ? (
        <div className={styles.disabled}>
          <div className={styles.truckIcon}>🚛</div>
          <h2>Tracking Not Enabled</h2>
          <p>Your admin has not enabled live tracking for your booking window.</p>
        </div>
      ) : (
        <>
          <div className={styles.mapLive}>
            {position && (
              <MapContainer
                center={position}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={false}
              >
                <TileLayer
                  attribution='&copy; OpenStreetMap'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <CircleMarker
                  center={position}
                  radius={14}
                  pathOptions={{
                    color: '#1e4d7b',
                    fillColor: '#2ecc71',
                    fillOpacity: 0.9,
                    weight: 3
                  }}
                >
                  <Popup>
                    Your vehicle — {config.vehicleId || '—'}
                    <br />
                    Position updates ~every 12s while this tab is open (demo drift — swap for GPS).
                  </Popup>
                </CircleMarker>
              </MapContainer>
            )}
          </div>
          {!position && (
            <p className={styles.mapFallback}>Waiting for map position — try again after admin saves tracker.</p>
          )}
          <p className={styles.mapHint}>
            Keep this screen open so your location reaches the admin map. For real 24×7 tracking, integrate device GPS
            and send POST /api/tracker/position from the driver app or tracker hardware.
          </p>
          <div className="card">
            <div className={styles.row}>
              <span className={styles.label}>Vehicle Status</span>
              <Badge status="moving" label="Live" />
            </div>
            <hr className={styles.hr} />
            <div className={styles.row}>
              <span>Vehicle ID</span>
              <span>{config.vehicleId || '—'}</span>
            </div>
            <div className={styles.row}>
              <span>Last GPS update</span>
              <span>
                {config.lastLocationAt
                  ? formatDistanceToNow(new Date(config.lastLocationAt), { addSuffix: true })
                  : '—'}
              </span>
            </div>
            {position && (
              <div className={styles.row}>
                <span>Coordinates</span>
                <span style={{ fontSize: 11 }}>
                  {position[0].toFixed(5)}, {position[1].toFixed(5)}
                </span>
              </div>
            )}
          </div>
        </>
      )}
    </AppShell>
  );
}

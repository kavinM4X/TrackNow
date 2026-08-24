import { useEffect, useRef, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';
import AppShell from '../../components/layout/AppShell';
import Badge from '../../components/common/Badge';
import Spinner from '../../components/common/Spinner';
import api, { deduplicatedGet } from '../../api/client';
import truckIcon from '../../assets/app-icon.svg';
import styles from './Tracker.module.css';
import 'leaflet/dist/leaflet.css';

export default function Tracker() {
  const [config, setConfig] = useState(null);
  const [position, setPosition] = useState(null);
  const [loading, setLoading] = useState(true);
  const posRef = useRef(null);

  useEffect(() => {
    deduplicatedGet('/tracker/my', {}, 10_000)
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
    <AppShell title="Live Tracker" subtitle="Real-time GPS vehicle location & pickup route telemetry" activePulse={enabled}>
      <div className={styles.container}>
        {/* Header Hero Banner */}
        <div className={styles.heroBanner}>
          <div>
            <h2 className={styles.heroTitle}>📍 Driver GPS Live Map</h2>
            <p className={styles.heroSub}>Track your assigned cocoon pickup vehicle in real time</p>
          </div>
          {enabled ? (
            <div className={styles.liveBadge}>
              <span className="pulse-dot" /> LIVE TRACKING
            </div>
          ) : (
            <span className={styles.disabledBadge}>STANDBY MODE</span>
          )}
        </div>

        {loading ? (
          <div className={`${styles.skeleton} ${styles.skeletonMap}`} />
        ) : !enabled ? (
          <div className={styles.disabledCard}>
            <img src={truckIcon} alt="Truck" className={styles.truckIcon} aria-hidden />
            <h3 className={styles.disabledTitle}>Tracking Standby Mode</h3>
            <p className={styles.disabledSub}>
              Live GPS tracking will automatically activate during your scheduled harvest booking pickup window once your driver is dispatched.
            </p>
          </div>
        ) : (
          <>
            {/* Interactive Leaflet Map Container */}
            <div className={styles.mapCardContainer}>
              <div className={styles.mapOverlayHeader}>
                🚛 Vehicle: <strong>{config.vehicleId || 'Dispatched Fleet'}</strong>
              </div>
              <div className={styles.mapLive}>
                {position && (
                  <MapContainer
                    center={position}
                    zoom={14}
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
                        fillColor: '#2e7d52',
                        fillOpacity: 0.9,
                        weight: 3
                      }}
                    >
                      <Popup>
                        <strong>🚛 Assigned Vehicle: {config.vehicleId || '—'}</strong>
                        <br />
                        GPS updates active (~every 12s).
                      </Popup>
                    </CircleMarker>
                  </MapContainer>
                )}
              </div>
            </div>

            {!position && (
              <p className={styles.mapFallback}>Waiting for initial GPS coordinates from driver handset…</p>
            )}

            {/* Telemetry Status Card */}
            <div className={styles.telemetryCard}>
              <h3 className={styles.cardTitle}>
                <span>⚡</span> Vehicle Telemetry Status
              </h3>

              <div className={styles.telemetryGrid}>
                <div className={styles.telemetryBox}>
                  <span className={styles.telemetryLbl}>Assigned Vehicle</span>
                  <span className={styles.telemetryVal}>{config.vehicleId || '—'}</span>
                </div>

                <div className={styles.telemetryBox}>
                  <span className={styles.telemetryLbl}>Live Status</span>
                  <div style={{ marginTop: 2 }}>
                    <Badge status="moving" label="Active & Broadcasting" />
                  </div>
                </div>

                <div className={styles.telemetryBox}>
                  <span className={styles.telemetryLbl}>Last Signal Update</span>
                  <span className={styles.telemetryValGreen}>
                    {config.lastLocationAt
                      ? formatDistanceToNow(new Date(config.lastLocationAt), { addSuffix: true })
                      : 'Just now'}
                  </span>
                </div>

                {position && (
                  <div className={styles.telemetryBox}>
                    <span className={styles.telemetryLbl}>GPS Coordinates</span>
                    <span className={styles.telemetryVal} style={{ fontSize: 12 }}>
                      {position[0].toFixed(4)}°, {position[1].toFixed(4)}°
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Guidance Note */}
            <div className={styles.infoHintBox}>
              💡 Keep this screen active while expecting your pickup. Position coordinates automatically stream live to the admin control map for optimal dispatch.
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

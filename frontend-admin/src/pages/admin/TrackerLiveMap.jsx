import { useEffect } from 'react';
import L from 'leaflet';
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet';
import { formatDateShort } from '../../utils/format';
import styles from './TrackerLiveMap.module.css';
import 'leaflet/dist/leaflet.css';

const TN_CENTER = [11.2, 77.85];

function FitBounds({ markers }) {
  const map = useMap();

  useEffect(() => {
    if (!markers?.length) return;
    const b = L.latLngBounds(markers.map((m) => [m.lat, m.lng]));
    map.fitBounds(b, { padding: [36, 36], maxZoom: 11 });
  }, [markers, map]);

  return null;
}

export default function TrackerLiveMap({ markers = [], loading }) {
  const hasMarkers = markers.length > 0;

  return (
    <>
      <p className="section-title">Live fleet map</p>
      <p className={styles.legend}>
        OpenStreetMap · Shows vehicles with tracking active today (booking window). Farmers send GPS from the{' '}
        <strong>Track</strong> tab in the client app.
      </p>
      <div className={styles.mapWrap}>
        {!loading && !hasMarkers && (
          <div className={styles.emptyOverlay}>No active vehicles on the map right now.</div>
        )}
        <MapContainer
          center={TN_CENTER}
          zoom={hasMarkers ? 8 : 7}
          className={styles.map}
          scrollWheelZoom={false}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {hasMarkers && <FitBounds markers={markers} />}
          {markers.map((m) => (
            <CircleMarker
              key={String(m.userId)}
              center={[m.lat, m.lng]}
              radius={11}
              pathOptions={{
                color: '#1e4d7b',
                fillColor: '#2ecc71',
                fillOpacity: 0.85,
                weight: 2
              }}
            >
              <Popup>
                <strong>{m.userName}</strong>
                <br />
                Vehicle: {m.vehicleId}
                <br />
                Booking: {formatDateShort(m.bookingDate)}
                <br />
                Active until: {formatDateShort(m.activeUntil)}
                {m.approximate && (
                  <>
                    <br />
                    <span style={{ fontSize: 11, color: '#856404' }}>Approx. hub (no GPS ping yet)</span>
                  </>
                )}
                {m.lastLocationAt && (
                  <>
                    <br />
                    <span style={{ fontSize: 11 }}>GPS: {new Date(m.lastLocationAt).toLocaleString('en-IN')}</span>
                  </>
                )}
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </>
  );
}

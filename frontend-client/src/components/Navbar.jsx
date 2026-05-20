import { Link } from 'react-router-dom';
import './Navbar.css';

function Navbar({ user, onLogout }) {
  return (
    <nav className="navbar">
      <div className="navbar-brand">TrackNow</div>
      <div className="navbar-links">
        <Link to="/dashboard" className="navbar-link">Dashboard</Link>
        <Link to="/bookings" className="navbar-link">Bookings</Link>
        <Link to="/batches" className="navbar-link">Batches</Link>
        <Link to="/market-rates" className="navbar-link">Market Rates</Link>
        <Link to="/tracking" className="navbar-link">Tracking</Link>
        <Link to="/profile" className="navbar-link">Profile</Link>
        <button onClick={onLogout} className="navbar-link" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          Logout
        </button>
      </div>
    </nav>
  );
}

export default Navbar;

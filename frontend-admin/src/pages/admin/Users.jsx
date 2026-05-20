import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import api from '../../api/client';
import { initials, shortUserId } from '../../utils/format';

export default function Users() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');
  const [loading, setLoading] = useState(true);

  const load = () => {
    api
      .get('/admin/users')
      .then((r) => setUsers(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = users.filter((u) => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase());
    if (tab === 'active') return matchSearch && u.isActive;
    if (tab === 'disabled') return matchSearch && !u.isActive;
    return matchSearch;
  });

  const toggle = async (u, e) => {
    e.stopPropagation();
    if (u.isActive && !window.confirm(`Disable ${u.name}? This will also disable their tracker.`)) {
      return;
    }
    try {
      const res = await api.patch(`/admin/users/${u._id}/toggle-status`);
      setUsers((prev) => prev.map((x) => (x._id === u._id ? res.data : x)));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed');
    }
  };

  return (
    <AppShell title="Users">
      <input
        className="field-input"
        placeholder="Search users..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="tabs">
        {[
          ['all', `All (${users.length})`],
          ['active', 'Active'],
          ['disabled', 'Disabled']
        ].map(([k, label]) => (
          <button
            key={k}
            type="button"
            className={`tab ${tab === k ? 'active' : ''}`}
            onClick={() => setTab(k)}
          >
            {label}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="topLink"
        style={{ marginBottom: 12, background: 'var(--blue)', color: '#fff', width: '100%' }}
        onClick={() => navigate('/admin/tracker-control')}
      >
        Tracker Control
      </button>

      {loading ? (
        <div className="spinner" />
      ) : filtered.length === 0 ? (
        <p className="empty-text">No users found matching your search</p>
      ) : (
        filtered.map((u) => (
          <div
            key={u._id}
            className="card"
            style={{ cursor: 'pointer' }}
            onClick={() => navigate(`/admin/users/${u._id}/edit`)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && navigate(`/admin/users/${u._id}/edit`)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: u.isActive ? 'var(--blue-light)' : '#f5e8e8',
                  color: u.isActive ? 'var(--blue)' : '#a93226',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 600
                }}
              >
                {initials(u.name)}
              </div>
              <div style={{ flex: 1 }}>
                <strong>{u.name}</strong>
                <div style={{ fontSize: 11, color: '#888' }}>
                  user · {shortUserId(u._id)}
                </div>
              </div>
              <span className={`badge badge-${u.isActive ? 'green' : 'gray'}`}>
                {u.isActive ? 'Active' : 'Disabled'}
              </span>
              <button
                type="button"
                className={`toggle ${u.isActive ? 'on' : 'off'}`}
                onClick={(e) => toggle(u, e)}
                aria-label="Toggle active"
              >
                <span />
              </button>
            </div>
          </div>
        ))
      )}

      <button type="button" className="fab" onClick={() => navigate('/admin/users/create')}>
        + Create User
      </button>
    </AppShell>
  );
}

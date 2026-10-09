
import { useCallback, useEffect, useState } from "react";
import "./App.css";

const API = "http://localhost:5227/api";

const EMPTY_WORKSHOP = {
  code: "",
  title: "",
  instructor: "",
  startDateTime: "",
  capacity: 20,
  status: "Scheduled",
};

const EMPTY_ATTENDEE = {
  workshopId: "",
  attendeeName: "",
  attendeeEmail: "",
};

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState("");

  const [email, setEmail] = useState("admin@workshop.local");
  const [password, setPassword] = useState("Admin@12345");

  const [workshops, setWorkshops] = useState([]);
  const [registrations, setRegistrations] = useState([]);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [status, setStatus] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showCancelled, setShowCancelled] = useState(true);

  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_WORKSHOP);
  const [attendee, setAttendee] = useState(EMPTY_ATTENDEE);

  const canManage = ["Admin", "Manager"].includes(user?.role);

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  async function request(path, options = {}) {
    const response = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(
        body.message || `Request failed with status ${response.status}`
      );
    }

    if (response.status === 204) {
      return null;
    }

    return response.json();
  }

  function clearNotifications() {
    setMessage("");
    setError("");
  }

  async function login(event) {
    event.preventDefault();
    clearNotifications();
    setLoading(true);

    try {
      const response = await fetch(`${API}/Auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Login failed. Check your credentials.");
      }

      setToken(data.token);
      setUser(data);
      setMessage(`Welcome, ${data.fullName || data.email}!`);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const loadWorkshops = useCallback(async () => {
    const params = new URLSearchParams();

    if (status) params.set("status", status);
    if (fromDate) params.set("fromDate", fromDate);
    if (toDate) params.set("toDate", toDate);
    if (availableOnly) params.set("available", "true");

    const query = params.toString();
    const data = await request(
      `/Workshops${query ? `?${query}` : ""}`
    );

    setWorkshops(data);
  }, [token, status, fromDate, toDate, availableOnly]);

  const loadRegistrations = useCallback(async () => {
    const data = await request("/Registrations");
    setRegistrations(data);
  }, [token]);

  async function refreshDashboard() {
    clearNotifications();
    setLoading(true);

    try {
      await Promise.all([loadWorkshops(), loadRegistrations()]);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    async function loadInitialData() {
      try {
        const [workshopData, registrationData] = await Promise.all([
          loadWorkshops(),
          loadRegistrations(),
        ]);

        // Data is set inside the loader functions.
        void workshopData;
        void registrationData;
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    }

    loadInitialData();

    return () => {
      cancelled = true;
    };
  }, [token, loadWorkshops, loadRegistrations]);

  async function saveWorkshop(event) {
    event.preventDefault();
    clearNotifications();
    setLoading(true);

    try {
      const payload = {
        title: form.title.trim(),
        instructor: form.instructor.trim(),
        startDateTime: form.startDateTime,
        capacity: Number(form.capacity),
        status: form.status || "Scheduled",
      };

      if (editingId === null) {
        await request("/Workshops", {
          method: "POST",
          body: JSON.stringify({
            ...payload,
            code: form.code.trim(),
          }),
        });

        setMessage("Workshop created successfully.");
      } else {
        await request(`/Workshops/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });

        setMessage("Workshop updated successfully.");
      }

      setEditingId(null);
      setForm({ ...EMPTY_WORKSHOP });

      await loadWorkshops();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function startEditing(workshop) {
    clearNotifications();

    setEditingId(workshop.id);
    setForm({
      code: workshop.code,
      title: workshop.title,
      instructor: workshop.instructor,
      startDateTime: workshop.startDateTime.slice(0, 16),
      capacity: workshop.capacity,
      status: workshop.status,
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function stopEditing() {
    setEditingId(null);
    setForm({ ...EMPTY_WORKSHOP });
    clearNotifications();
  }

  async function registerAttendee(event) {
    event.preventDefault();
    clearNotifications();
    setLoading(true);

    try {
      await request("/Registrations", {
        method: "POST",
        body: JSON.stringify({
          ...attendee,
          workshopId: Number(attendee.workshopId),
        }),
      });

      setMessage("Attendee registered successfully.");
      setAttendee({ ...EMPTY_ATTENDEE });

      await Promise.all([loadWorkshops(), loadRegistrations()]);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function cancelRegistration(id) {
    const confirmed = window.confirm(
      "Cancel this registration? Its history will be preserved."
    );

    if (!confirmed) return;

    clearNotifications();
    setLoading(true);

    try {
      await request(`/Registrations/${id}/cancel`, {
        method: "POST",
      });

      setMessage("Registration cancelled. History has been preserved.");

      await Promise.all([loadWorkshops(), loadRegistrations()]);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    setToken("");
    setUser(null);
    setWorkshops([]);
    setRegistrations([]);
    setEditingId(null);
    setForm({ ...EMPTY_WORKSHOP });
    setAttendee({ ...EMPTY_ATTENDEE });
    clearNotifications();
  }

  const visibleRegistrations = showCancelled
    ? registrations
    : registrations.filter((r) => !r.isCancelled);

  if (!user) {
    return (
      <main className="login-page">
        <form className="login-card" onSubmit={login}>
          <h1>WorkshopHub</h1>
          <p>Workshop Registration Service</p>

          {error && <div className="alert error">{error}</div>}
          {message && <div className="alert success">{message}</div>}

          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>

          <small>Development account: admin@workshop.local</small>
        </form>
      </main>
    );
  }

  return (
    <main className="app">
      <header className="topbar">
        <div>
          <h1>WorkshopHub</h1>
          <p>Workshop Registration Service</p>
        </div>

        <div className="user-info">
          <span>
            {user.fullName || user.email} · {user.role}
          </span>
          <button className="secondary" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      {message && <div className="alert success">{message}</div>}
      {error && <div className="alert error">{error}</div>}

      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Workshops</h2>
            <p>Browse workshops, filter results and check available seats.</p>
          </div>

          <button onClick={refreshDashboard} disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>

        <div className="filters">
          <select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          <input
            type="date"
            aria-label="From date"
            title="From date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />

          <input
            type="date"
            aria-label="To date"
            title="To date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />

          <label className="check">
            <input
              type="checkbox"
              checked={availableOnly}
              onChange={(e) => setAvailableOnly(e.target.checked)}
            />
            Available seats only
          </label>

          <button
            onClick={() =>
              loadWorkshops().catch((e) => setError(e.message))
            }
          >
            Apply filters
          </button>
        </div>

        <div className="workshop-grid">
          {workshops.map((w) => (
            <article className="workshop-card" key={w.id}>
              <div className="card-top">
                <span className="code">{w.code}</span>
                <span className="status">{w.status}</span>
              </div>

              <h3>{w.title}</h3>
              <p>Instructor: {w.instructor}</p>
              <p>{new Date(w.startDateTime).toLocaleString()}</p>

              <div className="seats">
                <div>
                  <strong>{w.availableSeats}</strong>
                  <span>Seats left</span>
                </div>
                <div>
                  <strong>
                    {w.registeredCount}/{w.capacity}
                  </strong>
                  <span>Registered</span>
                </div>
              </div>

              <div className="card-actions">
                {canManage && (
                  <button
                    className="secondary"
                    onClick={() => startEditing(w)}
                  >
                    Edit workshop
                  </button>
                )}

                <button
                  onClick={() =>
                    setAttendee((current) => ({
                      ...current,
                      workshopId: String(w.id),
                    }))
                  }
                >
                  Register attendee
                </button>
              </div>
            </article>
          ))}

          {workshops.length === 0 && (
            <p>No workshops found for the selected filters.</p>
          )}
        </div>
      </section>

      {canManage && (
        <section className="panel" id="workshop-form">
          <h2>
            {editingId === null ? "Create workshop" : "Edit workshop"}
          </h2>

          <form className="form-grid" onSubmit={saveWorkshop}>
            {editingId === null && (
              <input
                placeholder="Workshop code"
                aria-label="Workshop code"
                value={form.code}
                onChange={(e) =>
                  setForm({ ...form, code: e.target.value })
                }
                required
              />
            )}

            <input
              placeholder="Workshop title"
              aria-label="Workshop title"
              value={form.title}
              onChange={(e) =>
                setForm({ ...form, title: e.target.value })
              }
              required
            />

            <input
              placeholder="Instructor"
              aria-label="Instructor"
              value={form.instructor}
              onChange={(e) =>
                setForm({ ...form, instructor: e.target.value })
              }
              required
            />

            <input
              type="datetime-local"
              aria-label="Workshop start date and time"
              value={form.startDateTime}
              onChange={(e) =>
                setForm({ ...form, startDateTime: e.target.value })
              }
              required
            />

            <input
              type="number"
              min="1"
              aria-label="Capacity"
              placeholder="Capacity"
              value={form.capacity}
              onChange={(e) =>
                setForm({ ...form, capacity: e.target.value })
              }
              required
            />

            {editingId !== null && (
              <select
                aria-label="Workshop status"
                value={form.status || "Scheduled"}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value })
                }
              >
                <option value="Scheduled">Scheduled</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            )}

            <button type="submit" disabled={loading}>
              {loading
                ? "Saving..."
                : editingId === null
                  ? "Create workshop"
                  : "Save changes"}
            </button>

            {editingId !== null && (
              <button
                type="button"
                className="secondary"
                onClick={stopEditing}
              >
                Stop editing
              </button>
            )}
          </form>
        </section>
      )}

      <section className="panel">
        <h2>Register attendee</h2>
        <p>Choose a workshop and enter the attendee details.</p>

        <form className="form-grid" onSubmit={registerAttendee}>
          <select
            aria-label="Workshop"
            value={attendee.workshopId}
            onChange={(e) =>
              setAttendee({
                ...attendee,
                workshopId: e.target.value,
              })
            }
            required
          >
            <option value="">Select workshop</option>
            {workshops.map((w) => (
              <option
                key={w.id}
                value={w.id}
                disabled={
                  w.status !== "Scheduled" || w.availableSeats <= 0
                }
              >
                {w.code} — {w.title} ({w.availableSeats} seats left)
              </option>
            ))}
          </select>

          <input
            placeholder="Attendee name"
            aria-label="Attendee name"
            value={attendee.attendeeName}
            onChange={(e) =>
              setAttendee({
                ...attendee,
                attendeeName: e.target.value,
              })
            }
            required
          />

          <input
            type="email"
            placeholder="Attendee email"
            aria-label="Attendee email"
            value={attendee.attendeeEmail}
            onChange={(e) =>
              setAttendee({
                ...attendee,
                attendeeEmail: e.target.value,
              })
            }
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? "Processing..." : "Register attendee"}
          </button>
        </form>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Registration history</h2>
            <p>Cancelled registrations remain available for audit/history.</p>
          </div>

          <button
            className="secondary"
            onClick={() =>
              loadRegistrations().catch((e) => setError(e.message))
            }
          >
            Refresh history
          </button>
        </div>

        <label className="check">
          <input
            type="checkbox"
            checked={showCancelled}
            onChange={(e) => setShowCancelled(e.target.checked)}
          />
          Show cancelled registrations
        </label>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Attendee</th>
                <th>Workshop</th>
                <th>Email</th>
                <th>Registered</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {visibleRegistrations.map((r) => (
                <tr key={r.id}>
                  <td>{r.attendeeName}</td>
                  <td>{r.workshopTitle}</td>
                  <td>{r.attendeeEmail}</td>
                  <td>{new Date(r.registeredAt).toLocaleString()}</td>
                  <td>{r.isCancelled ? "Cancelled" : "Active"}</td>
                  <td>
                    {!r.isCancelled && (
                      <button
                        className="danger"
                        disabled={loading}
                        onClick={() => cancelRegistration(r.id)}
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}

              {visibleRegistrations.length === 0 && (
                <tr>
                  <td colSpan="6">No registrations found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

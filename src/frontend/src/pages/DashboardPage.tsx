import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Circle,
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  useMap,
} from "react-leaflet";
import { useParams } from "react-router-dom";
import { type SessionOutput, SessionStatus } from "../backend";
import GlassCard from "../components/GlassCard";
import Navbar from "../components/Navbar";
import { useBackend } from "../hooks/useBackend";

// Fix default Leaflet icon
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Red icon for target
const redIcon = L.icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// Blue icon for requester
const blueIcon = L.icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function getDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function MapFitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length >= 2) {
      map.fitBounds(positions, { padding: [40, 40] });
    }
  }, [positions, map]);
  return null;
}

function formatTimestamp(ts: bigint): string {
  try {
    const ms = Number(ts) / 1_000_000;
    return new Date(ms).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "Unknown";
  }
}

function formatTimeOnly(ts: bigint): string {
  try {
    const ms = Number(ts) / 1_000_000;
    return new Date(ms).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Unknown";
  }
}

function StatusBadge({ status }: { status: SessionStatus }) {
  const config = {
    [SessionStatus.pending]: {
      bg: "rgba(234,179,8,0.12)",
      color: "#FDE047",
      border: "1px solid rgba(234,179,8,0.35)",
      dot: "#FDE047",
      label: "Waiting for Response",
    },
    [SessionStatus.completed]: {
      bg: "rgba(34,197,94,0.12)",
      color: "#86EFAC",
      border: "1px solid rgba(34,197,94,0.35)",
      dot: "#86EFAC",
      label: "Location Received",
    },
    [SessionStatus.expired]: {
      bg: "rgba(239,68,68,0.12)",
      color: "#FCA5A5",
      border: "1px solid rgba(239,68,68,0.35)",
      dot: "#FCA5A5",
      label: "Session Expired",
    },
  };
  const s = config[status];

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
      style={{ background: s.bg, color: s.color, border: s.border }}
    >
      <motion.span
        className="h-2 w-2 rounded-full"
        style={{ background: s.dot }}
        animate={
          status === SessionStatus.pending ? { opacity: [1, 0.3, 1] } : {}
        }
        transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
      />
      {s.label}
    </span>
  );
}

export default function DashboardPage() {
  const { id } = useParams<{ id: string }>();
  const { actor, isFetching } = useBackend();
  const [session, setSession] = useState<SessionOutput | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [stopping, setStopping] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastRefreshRef = useRef(Date.now());

  // Requester location state
  const [requesterLocation, setRequesterLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [myLocLoading, setMyLocLoading] = useState(false);
  const [myLocError, setMyLocError] = useState<string | null>(null);

  const fetchSession = useCallback(async () => {
    if (!id || !actor) return;
    try {
      const data = await actor.getSession(id);
      if (data === null) {
        setError("Session not found.");
        setSession(null);
      } else {
        setSession(data);
        setError(null);
      }
    } catch {
      setError("Failed to fetch session.");
    } finally {
      setLoading(false);
    }
    lastRefreshRef.current = Date.now();
    setSecondsAgo(0);
  }, [id, actor]);

  useEffect(() => {
    if (isFetching || !actor) return;
    fetchSession();
    intervalRef.current = setInterval(fetchSession, 5000);
    timerRef.current = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastRefreshRef.current) / 1000));
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchSession, actor, isFetching]);

  async function handleStop() {
    if (!id || !actor) return;
    setStopping(true);
    try {
      await actor.expireSession(id);
      await fetchSession();
    } finally {
      setStopping(false);
    }
  }

  function handleShowMyLocation() {
    setMyLocLoading(true);
    setMyLocError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setRequesterLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setMyLocLoading(false);
      },
      () => {
        setMyLocError(
          "Could not get your location. Please allow location access.",
        );
        setMyLocLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }

  const loc = session?.location;
  const isActive = session?.status === SessionStatus.pending;

  // Compute midpoint and bounds positions for dual-marker map
  const bothPositions: [number, number][] =
    loc && requesterLocation
      ? [
          [loc.lat, loc.lng],
          [requesterLocation.lat, requesterLocation.lng],
        ]
      : [];

  const mapCenter: [number, number] =
    loc && requesterLocation
      ? [
          (loc.lat + requesterLocation.lat) / 2,
          (loc.lng + requesterLocation.lng) / 2,
        ]
      : loc
        ? [loc.lat, loc.lng]
        : [20.5937, 78.9629]; // India center fallback

  return (
    <div className="min-h-screen" style={{ background: "#0B1220" }}>
      <Navbar />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold" style={{ color: "#EAF2FF" }}>
                Tracking Dashboard
              </h1>
              <p
                className="mt-1 font-mono text-xs"
                style={{ color: "#9AA9BC" }}
              >
                Session: {id}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs" style={{ color: "#9AA9BC" }}>
                Last refreshed {secondsAgo}s ago
              </span>
              {isActive && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleStop}
                  disabled={stopping}
                  className="rounded-full border px-5 py-2 text-sm font-semibold transition-colors"
                  style={{
                    borderColor: "rgba(239,68,68,0.5)",
                    color: "#FCA5A5",
                  }}
                  data-ocid="dashboard.delete_button"
                >
                  {stopping ? "Stopping…" : "Stop Tracking"}
                </motion.button>
              )}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {loading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <GlassCard
                  className="text-center"
                  data-ocid="dashboard.loading_state"
                >
                  <div
                    className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2"
                    style={{
                      borderColor: "rgba(34,211,238,0.2)",
                      borderTopColor: "#22D3EE",
                    }}
                  />
                  <p style={{ color: "#9AA9BC" }}>Loading session…</p>
                </GlassCard>
              </motion.div>
            )}

            {!loading && error && (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <GlassCard data-ocid="dashboard.error_state">
                  <p style={{ color: "#FCA5A5" }}>{error}</p>
                </GlassCard>
              </motion.div>
            )}

            {!loading && session && (
              <motion.div
                key="content"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="grid gap-6 lg:grid-cols-5"
              >
                {/* Map — 3 cols */}
                <div className="lg:col-span-3">
                  <GlassCard className="overflow-hidden !p-0">
                    {loc ? (
                      <>
                        <div className="h-[420px] w-full">
                          <MapContainer
                            center={mapCenter}
                            zoom={bothPositions.length >= 2 ? 11 : 13}
                            style={{ height: "100%", width: "100%" }}
                            className="z-0"
                          >
                            <TileLayer
                              attribution='&copy; <a href="https://carto.com">CARTO</a>'
                              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                            />
                            {/* Target marker (Red) */}
                            <Marker
                              position={[loc.lat, loc.lng]}
                              icon={redIcon}
                            />
                            <Circle
                              center={[loc.lat, loc.lng]}
                              radius={loc.accuracy}
                              pathOptions={{
                                color: "#22D3EE",
                                fillColor: "#22D3EE",
                                fillOpacity: 0.15,
                                weight: 1.5,
                              }}
                            />
                            {/* Requester marker (Blue) + Polyline */}
                            {requesterLocation && (
                              <>
                                <Marker
                                  position={[
                                    requesterLocation.lat,
                                    requesterLocation.lng,
                                  ]}
                                  icon={blueIcon}
                                />
                                <Polyline
                                  positions={[
                                    [loc.lat, loc.lng],
                                    [
                                      requesterLocation.lat,
                                      requesterLocation.lng,
                                    ],
                                  ]}
                                  pathOptions={{
                                    color: "#22D3EE",
                                    weight: 1.5,
                                    dashArray: "6, 6",
                                    opacity: 0.7,
                                  }}
                                />
                                <MapFitBounds positions={bothPositions} />
                              </>
                            )}
                          </MapContainer>
                        </div>
                        {/* Map legend */}
                        {loc && requesterLocation && (
                          <div
                            className="flex items-center gap-4 px-4 py-2 text-xs"
                            style={{ color: "#9AA9BC" }}
                          >
                            <span>
                              <span style={{ color: "#3B82F6" }}>●</span> Your
                              Location
                            </span>
                            <span>
                              <span style={{ color: "#EF4444" }}>●</span> Target
                              Location
                            </span>
                          </div>
                        )}
                      </>
                    ) : (
                      <div
                        className="flex h-[420px] flex-col items-center justify-center"
                        data-ocid="dashboard.empty_state"
                      >
                        <motion.div
                          animate={{
                            scale: [1, 1.15, 1],
                            opacity: [0.6, 1, 0.6],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Number.POSITIVE_INFINITY,
                          }}
                          className="mb-4 flex h-16 w-16 items-center justify-center rounded-full text-3xl"
                          style={{
                            background: "rgba(34,211,238,0.1)",
                            border: "1px solid rgba(34,211,238,0.3)",
                          }}
                        >
                          📍
                        </motion.div>
                        <p className="font-medium" style={{ color: "#EAF2FF" }}>
                          {session.status === SessionStatus.pending
                            ? "Waiting for user response…"
                            : "No location data"}
                        </p>
                        <p
                          className="mt-1 text-xs"
                          style={{ color: "#9AA9BC" }}
                        >
                          {session.status === SessionStatus.pending
                            ? "Location will appear once the recipient approves"
                            : "Session has ended"}
                        </p>
                      </div>
                    )}
                  </GlassCard>
                </div>

                {/* Info panel — 2 cols */}
                <div className="space-y-4 lg:col-span-2">
                  {/* Status */}
                  <GlassCard>
                    <h3
                      className="mb-3 text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "#9AA9BC" }}
                    >
                      Session Info
                    </h3>
                    <div className="space-y-3">
                      <InfoRow
                        label="Status"
                        value={<StatusBadge status={session.status} />}
                      />
                      <InfoRow
                        label="Phone"
                        value={
                          <span style={{ color: "#EAF2FF" }}>
                            +91 {session.phoneNumber}
                          </span>
                        }
                      />
                      <InfoRow
                        label="Requester"
                        value={
                          <span
                            className="font-medium"
                            style={{ color: "#22D3EE" }}
                          >
                            {session.requesterName}
                          </span>
                        }
                      />
                      <InfoRow
                        label="Reason"
                        value={
                          <span
                            className="text-right text-xs"
                            style={{ color: "#EAF2FF" }}
                          >
                            {session.reason}
                          </span>
                        }
                      />
                      {session.status === SessionStatus.completed && loc && (
                        <InfoRow
                          label="Received At"
                          value={
                            <span
                              className="font-medium"
                              style={{ color: "#86EFAC" }}
                            >
                              {formatTimeOnly(loc.timestamp)}
                            </span>
                          }
                        />
                      )}
                    </div>

                    {/* Show My Location button — only when target location exists and requester hasn't shared yet */}
                    {loc && !requesterLocation && (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleShowMyLocation}
                        disabled={myLocLoading}
                        className="mt-3 w-full rounded-full py-2.5 text-sm font-semibold transition-colors"
                        style={{
                          background: "rgba(59,130,246,0.15)",
                          border: "1px solid rgba(59,130,246,0.4)",
                          color: "#93C5FD",
                        }}
                        data-ocid="dashboard.primary_button"
                      >
                        {myLocLoading
                          ? "📍 Getting location…"
                          : "📍 Show My Location"}
                      </motion.button>
                    )}
                    {myLocError && (
                      <p className="mt-2 text-xs" style={{ color: "#FCA5A5" }}>
                        {myLocError}
                      </p>
                    )}
                  </GlassCard>

                  {/* Location data */}
                  <GlassCard>
                    <h3
                      className="mb-3 text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "#9AA9BC" }}
                    >
                      Location Data
                    </h3>
                    {loc ? (
                      <div className="space-y-3">
                        <InfoRow
                          label="Latitude"
                          value={
                            <span style={{ color: "#22D3EE" }}>
                              {loc.lat.toFixed(6)}°
                            </span>
                          }
                        />
                        <InfoRow
                          label="Longitude"
                          value={
                            <span style={{ color: "#22D3EE" }}>
                              {loc.lng.toFixed(6)}°
                            </span>
                          }
                        />
                        <InfoRow
                          label="Accuracy"
                          value={
                            <span style={{ color: "#EAF2FF" }}>
                              {loc.accuracy.toFixed(0)} m
                            </span>
                          }
                        />
                        <InfoRow
                          label="Last Updated"
                          value={
                            <span
                              style={{ color: "#EAF2FF", fontSize: "11px" }}
                            >
                              {formatTimestamp(loc.timestamp)}
                            </span>
                          }
                        />
                      </div>
                    ) : (
                      <div>
                        {session.status === SessionStatus.pending ? (
                          <div className="flex items-center gap-2">
                            <motion.div
                              className="h-2 w-2 rounded-full"
                              style={{ background: "#FDE047" }}
                              animate={{ opacity: [1, 0.3, 1] }}
                              transition={{
                                duration: 1.5,
                                repeat: Number.POSITIVE_INFINITY,
                              }}
                            />
                            <p className="text-sm" style={{ color: "#9AA9BC" }}>
                              Waiting for user response…
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm" style={{ color: "#9AA9BC" }}>
                            No location data.
                          </p>
                        )}
                      </div>
                    )}
                  </GlassCard>

                  {/* Distance card — shown only when both locations exist */}
                  {loc && requesterLocation && (
                    <GlassCard>
                      <h3
                        className="mb-2 text-xs font-semibold uppercase tracking-wider"
                        style={{ color: "#9AA9BC" }}
                      >
                        Distance
                      </h3>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">📏</span>
                        <div>
                          <p
                            className="text-lg font-bold"
                            style={{ color: "#22D3EE" }}
                          >
                            {getDistance(
                              requesterLocation.lat,
                              requesterLocation.lng,
                              loc.lat,
                              loc.lng,
                            ).toFixed(1)}{" "}
                            km
                          </p>
                          <p className="text-xs" style={{ color: "#9AA9BC" }}>
                            Straight-line distance
                          </p>
                        </div>
                      </div>
                      <div
                        className="mt-2 flex items-center gap-4 text-xs"
                        style={{ color: "#9AA9BC" }}
                      >
                        <span>
                          <span style={{ color: "#3B82F6" }}>●</span> You
                        </span>
                        <span>
                          <span style={{ color: "#EF4444" }}>●</span> Target
                        </span>
                      </div>
                    </GlassCard>
                  )}

                  {/* Refresh indicator */}
                  <GlassCard>
                    <div className="flex items-center gap-2">
                      <motion.div
                        animate={{ opacity: [1, 0.3, 1] }}
                        transition={{
                          duration: 2,
                          repeat: Number.POSITIVE_INFINITY,
                        }}
                        className="h-2 w-2 rounded-full"
                        style={{ background: "#22D3EE" }}
                      />
                      <p className="text-xs" style={{ color: "#9AA9BC" }}>
                        Auto-refreshing every 5 seconds
                      </p>
                    </div>
                  </GlassCard>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </main>

      <footer
        className="mt-12 border-t border-white/5 py-8 text-center text-xs"
        style={{ color: "#9AA9BC" }}
      >
        © {new Date().getFullYear()}. Built with ❤️ using{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="transition-colors hover:text-[#22D3EE]"
        >
          caffeine.ai
        </a>
      </footer>
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex-shrink-0 text-xs" style={{ color: "#9AA9BC" }}>
        {label}
      </span>
      <span className="max-w-[60%] text-right text-sm">{value}</span>
    </div>
  );
}

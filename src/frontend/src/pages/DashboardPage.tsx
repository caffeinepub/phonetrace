import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { type SessionOutput, SessionStatus } from "../backend";
import GlassCard from "../components/GlassCard";
import Navbar from "../components/Navbar";
import { useBackend } from "../hooks/useBackend";

const GOOGLE_MAPS_API_KEY = "AIzaSyBoYD4445obgpMIgANicCB0cqjnjTyLUpw";

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

async function openStreetView(lat: number, lng: number) {
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/streetview/metadata?location=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`,
    );
    const data = await res.json();
    if (data.status === "OK") {
      window.open(
        `https://www.google.com/maps?q=&layer=c&cbll=${lat},${lng}`,
        "_blank",
      );
    } else {
      alert("Street View not available at this location");
    }
  } catch {
    // fallback: always open
    window.open(
      `https://www.google.com/maps?q=&layer=c&cbll=${lat},${lng}`,
      "_blank",
    );
  }
}

type MapMode = "map" | "satellite";

interface MapPanelProps {
  targetLoc: { lat: number; lng: number; accuracy: number } | null;
  requesterLoc: { lat: number; lng: number } | null;
}

function MapPanel({ targetLoc, requesterLoc }: MapPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const targetMarkerRef = useRef<L.CircleMarker | null>(null);
  const requesterMarkerRef = useRef<L.CircleMarker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const osmLayerRef = useRef<L.TileLayer | null>(null);
  const satelliteLayerRef = useRef<L.TileLayer | null>(null);
  const labelsLayerRef = useRef<L.TileLayer | null>(null);
  const currentModeRef = useRef<MapMode>("map");
  // Capture initial targetLoc for map initialization (one-time only)
  const initialTargetLocRef = useRef(targetLoc);
  const [mapReady, setMapReady] = useState(false);
  const [mapMode, setMapMode] = useState<MapMode>("map");
  const [svLoading, setSvLoading] = useState(false);

  // Initialise the Leaflet map once — uses initialTargetLocRef to avoid dep exhaustive lint
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const initLoc = initialTargetLocRef.current;
    const center: [number, number] = initLoc
      ? [initLoc.lat, initLoc.lng]
      : [20.5937, 78.9629];

    const map = L.map(containerRef.current, {
      center,
      zoom: initLoc ? 13 : 5,
      zoomControl: true,
      attributionControl: true,
    });

    // OSM base layer
    const osm = L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        attribution: "\u00a9 OpenStreetMap contributors",
        maxZoom: 19,
      },
    ).addTo(map);

    // Esri satellite layer
    const satellite = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        attribution: "\u00a9 Esri",
        maxZoom: 19,
      },
    );

    // Esri reference labels overlay
    const labels = L.tileLayer(
      "https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
      {
        attribution: "",
        maxZoom: 19,
        pane: "overlayPane",
      },
    );

    // Map click \u2192 Street View
    map.on("click", (e: L.LeafletMouseEvent) => {
      openStreetView(e.latlng.lat, e.latlng.lng);
    });

    osmLayerRef.current = osm;
    satelliteLayerRef.current = satellite;
    labelsLayerRef.current = labels;
    mapRef.current = map;
    setMapReady(true);

    return () => {
      map.remove();
      mapRef.current = null;
      osmLayerRef.current = null;
      satelliteLayerRef.current = null;
      labelsLayerRef.current = null;
      targetMarkerRef.current = null;
      requesterMarkerRef.current = null;
      polylineRef.current = null;
    };
  }, []);

  // Sync markers + polyline whenever locations change
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;

    // Target marker \u2014 Red circle
    if (targetLoc) {
      const pos: [number, number] = [targetLoc.lat, targetLoc.lng];
      if (!targetMarkerRef.current) {
        targetMarkerRef.current = L.circleMarker(pos, {
          radius: 10,
          fillColor: "#EF4444",
          fillOpacity: 1,
          color: "#fff",
          weight: 2,
        })
          .addTo(map)
          .bindPopup(
            `<strong style="color:#111">\ud83d\udd34 Target</strong><br/><span style="font-size:11px;color:#444">${targetLoc.lat.toFixed(5)}, ${targetLoc.lng.toFixed(5)}<br/>Accuracy: ${targetLoc.accuracy.toFixed(0)}m</span>`,
          );
      } else {
        targetMarkerRef.current.setLatLng(pos);
      }
    }

    // Requester marker \u2014 Blue circle
    if (requesterLoc) {
      const pos: [number, number] = [requesterLoc.lat, requesterLoc.lng];
      if (!requesterMarkerRef.current) {
        requesterMarkerRef.current = L.circleMarker(pos, {
          radius: 10,
          fillColor: "#3B82F6",
          fillOpacity: 1,
          color: "#fff",
          weight: 2,
        })
          .addTo(map)
          .bindPopup(
            `<strong style="color:#111">\ud83d\udd35 Your Location</strong><br/><span style="font-size:11px;color:#444">${requesterLoc.lat.toFixed(5)}, ${requesterLoc.lng.toFixed(5)}</span>`,
          );
      } else {
        requesterMarkerRef.current.setLatLng(pos);
      }
    }

    // Polyline (dashed cyan)
    if (targetLoc && requesterLoc) {
      const path: [number, number][] = [
        [targetLoc.lat, targetLoc.lng],
        [requesterLoc.lat, requesterLoc.lng],
      ];
      if (!polylineRef.current) {
        polylineRef.current = L.polyline(path, {
          color: "#22D3EE",
          weight: 2,
          opacity: 0.8,
          dashArray: "6, 6",
        }).addTo(map);
      } else {
        polylineRef.current.setLatLngs(path);
      }

      // Fit both markers into view
      const bounds = L.latLngBounds(path);
      map.fitBounds(bounds, { padding: [40, 40] });
    } else if (targetLoc) {
      map.setView([targetLoc.lat, targetLoc.lng], 15);
    }
  }, [mapReady, targetLoc, requesterLoc]);

  // Handle layer toggle
  function handleModeSwitch(mode: MapMode) {
    if (
      !mapRef.current ||
      !osmLayerRef.current ||
      !satelliteLayerRef.current ||
      !labelsLayerRef.current
    )
      return;
    if (mode === currentModeRef.current) return;
    const map = mapRef.current;

    if (mode === "satellite") {
      map.removeLayer(osmLayerRef.current);
      map.addLayer(satelliteLayerRef.current);
      map.addLayer(labelsLayerRef.current);
    } else {
      map.removeLayer(satelliteLayerRef.current);
      map.removeLayer(labelsLayerRef.current);
      map.addLayer(osmLayerRef.current);
    }

    currentModeRef.current = mode;
    setMapMode(mode);
  }

  async function handleStreetViewClick() {
    if (!targetLoc) return;
    setSvLoading(true);
    try {
      await openStreetView(targetLoc.lat, targetLoc.lng);
    } finally {
      setSvLoading(false);
    }
  }

  if (!mapReady) {
    return (
      <div
        style={{
          height: 420,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          className="h-8 w-8 animate-spin rounded-full border-2"
          style={{
            borderColor: "rgba(34,211,238,0.2)",
            borderTopColor: "#22D3EE",
          }}
        />
      </div>
    );
  }

  const svDisabled = !targetLoc || svLoading;

  return (
    <>
      <div style={{ position: "relative", width: "100%", height: "420px" }}>
        {/* Leaflet map container */}
        <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

        {/* Floating pill toggle buttons */}
        <div
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            zIndex: 1000,
            display: "flex",
            gap: 4,
            padding: 4,
            background: "rgba(11,18,32,0.85)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          {/* Map button */}
          <button
            type="button"
            onClick={() => handleModeSwitch("map")}
            data-ocid="dashboard.map.tab"
            style={{
              padding: "6px 12px",
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s",
              border:
                mapMode === "map"
                  ? "1px solid rgba(34,211,238,0.4)"
                  : "1px solid transparent",
              background:
                mapMode === "map" ? "rgba(34,211,238,0.2)" : "transparent",
              color: mapMode === "map" ? "#22D3EE" : "#9AA9BC",
            }}
          >
            \ud83d\uddfa Map
          </button>

          {/* Satellite button */}
          <button
            type="button"
            onClick={() => handleModeSwitch("satellite")}
            data-ocid="dashboard.satellite.tab"
            style={{
              padding: "6px 12px",
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s",
              border:
                mapMode === "satellite"
                  ? "1px solid rgba(34,211,238,0.4)"
                  : "1px solid transparent",
              background:
                mapMode === "satellite"
                  ? "rgba(34,211,238,0.2)"
                  : "transparent",
              color: mapMode === "satellite" ? "#22D3EE" : "#9AA9BC",
            }}
          >
            \ud83d\udef0 Satellite
          </button>

          {/* Street View button */}
          <button
            type="button"
            onClick={handleStreetViewClick}
            disabled={svDisabled}
            data-ocid="dashboard.streetview.button"
            title={
              !targetLoc
                ? "Available after target location is received"
                : "Open Street View at target location"
            }
            style={{
              padding: "6px 12px",
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 600,
              cursor: svDisabled ? "not-allowed" : "pointer",
              transition: "all 0.2s",
              border: "1px solid transparent",
              background: "transparent",
              color: "#9AA9BC",
              opacity: svDisabled ? 0.4 : 1,
            }}
          >
            {svLoading ? "\u23f3 Opening\u2026" : "\ud83d\udc41 Street View"}
          </button>
        </div>
      </div>

      {/* Map legend */}
      {targetLoc && requesterLoc && (
        <div
          className="flex items-center gap-4 px-4 py-2 text-xs"
          style={{ color: "#9AA9BC" }}
        >
          <span>
            <span style={{ color: "#3B82F6" }}>\u25cf</span> Your Location
          </span>
          <span>
            <span style={{ color: "#EF4444" }}>\u25cf</span> Target Location
          </span>
          <span style={{ color: "#9AA9BC", fontSize: 10 }}>
            Click map for Street View
          </span>
        </div>
      )}
    </>
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
                  {stopping ? "Stopping\u2026" : "Stop Tracking"}
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
                  <p style={{ color: "#9AA9BC" }}>Loading session\u2026</p>
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
                {/* Map \u2014 3 cols */}
                <div className="lg:col-span-3">
                  <GlassCard className="overflow-hidden !p-0">
                    {loc ? (
                      <MapPanel
                        targetLoc={
                          loc
                            ? {
                                lat: loc.lat,
                                lng: loc.lng,
                                accuracy: loc.accuracy,
                              }
                            : null
                        }
                        requesterLoc={requesterLocation}
                      />
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
                          \ud83d\udccd
                        </motion.div>
                        <p className="font-medium" style={{ color: "#EAF2FF" }}>
                          {session.status === SessionStatus.pending
                            ? "Waiting for user response\u2026"
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

                {/* Info panel \u2014 2 cols */}
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

                    {/* Show My Location button */}
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
                          ? "\ud83d\udccd Getting location\u2026"
                          : "\ud83d\udccd Show My Location"}
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
                              {loc.lat.toFixed(6)}\u00b0
                            </span>
                          }
                        />
                        <InfoRow
                          label="Longitude"
                          value={
                            <span style={{ color: "#22D3EE" }}>
                              {loc.lng.toFixed(6)}\u00b0
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
                              Waiting for user response\u2026
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

                  {/* Distance card */}
                  {loc && requesterLocation && (
                    <GlassCard>
                      <h3
                        className="mb-2 text-xs font-semibold uppercase tracking-wider"
                        style={{ color: "#9AA9BC" }}
                      >
                        Distance
                      </h3>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">\ud83d\udccf</span>
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
                          <span style={{ color: "#3B82F6" }}>\u25cf</span> You
                        </span>
                        <span>
                          <span style={{ color: "#EF4444" }}>\u25cf</span>{" "}
                          Target
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
        \u00a9 {new Date().getFullYear()}. Built with \u2764\ufe0f using{" "}
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

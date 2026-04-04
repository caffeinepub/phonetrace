// Type shims for packages that are available at runtime but
// do not have TypeScript declarations in node_modules.
// These are used by the app's routing and mapping layers.

declare module "react-router-dom" {
  import type { ComponentType, ReactNode } from "react";

  export interface NavigateFunction {
    (to: string, options?: { replace?: boolean; state?: unknown }): void;
    (delta: number): void;
  }

  export function useNavigate(): NavigateFunction;
  export function useParams<
    T extends Record<string, string | undefined> = Record<
      string,
      string | undefined
    >,
  >(): T;
  export function useSearchParams(): [
    URLSearchParams,
    (params: URLSearchParams | string) => void,
  ];

  export interface LinkProps {
    to: string;
    children?: ReactNode;
    className?: string;
    style?: React.CSSProperties;
    target?: string;
    rel?: string;
    replace?: boolean;
    "data-ocid"?: string;
  }
  export const Link: ComponentType<LinkProps>;

  export interface RouteProps {
    path?: string;
    element?: ReactNode;
    children?: ReactNode;
    index?: boolean;
  }
  export const Route: ComponentType<RouteProps>;

  export interface RoutesProps {
    children?: ReactNode;
  }
  export const Routes: ComponentType<RoutesProps>;

  export interface BrowserRouterProps {
    children?: ReactNode;
  }
  export const BrowserRouter: ComponentType<BrowserRouterProps>;

  export const Outlet: ComponentType;
}

// leaflet shim is intentionally empty — let @types/leaflet provide the full types
// (the old shim was overriding @types/leaflet with an incomplete stub)

declare module "react-leaflet" {
  import type { ComponentType, ReactNode } from "react";
  import type { Icon } from "leaflet";

  export interface MapContainerProps {
    center: [number, number];
    zoom: number;
    style?: React.CSSProperties;
    className?: string;
    children?: ReactNode;
  }
  export const MapContainer: ComponentType<MapContainerProps>;

  export interface TileLayerProps {
    url: string;
    attribution?: string;
  }
  export const TileLayer: ComponentType<TileLayerProps>;

  export interface MarkerProps {
    position: [number, number];
    icon?: Icon;
    children?: ReactNode;
  }
  export const Marker: ComponentType<MarkerProps>;

  export interface CircleProps {
    center: [number, number];
    radius: number;
    pathOptions?: {
      color?: string;
      fillColor?: string;
      fillOpacity?: number;
      weight?: number;
    };
    children?: ReactNode;
  }
  export const Circle: ComponentType<CircleProps>;

  export interface PolylineProps {
    positions: [number, number][];
    pathOptions?: {
      color?: string;
      weight?: number;
      dashArray?: string;
      opacity?: number;
    };
    children?: ReactNode;
  }
  export const Polyline: ComponentType<PolylineProps>;

  export interface LeafletMap {
    fitBounds(
      bounds: [number, number][],
      options?: { padding?: [number, number] },
    ): void;
  }
  export function useMap(): LeafletMap;
}

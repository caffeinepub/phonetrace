import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Location {
    lat: number;
    lng: number;
    timestamp: bigint;
    accuracy: number;
}
export interface TrackingSession {
    id: string;
    expiresAt: bigint;
    createdAt: bigint;
    isActive: boolean;
    consentGiven: boolean;
    phoneNumber: string;
    location?: Location;
}
export interface backendInterface {
    createSession(phoneNumber: string): Promise<string>;
    deactivateSession(sessionId: string): Promise<boolean>;
    getActiveSessions(): Promise<Array<TrackingSession>>;
    getSession(sessionId: string): Promise<TrackingSession | null>;
    submitLocation(sessionId: string, lat: number, lng: number, accuracy: number): Promise<boolean>;
}

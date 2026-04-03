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
export interface SessionOutput {
    id: string;
    status: SessionStatus;
    expiresAt: bigint;
    createdAt: bigint;
    requesterName: string;
    phoneNumber: string;
    location?: Location;
    reason: string;
}
export enum SessionStatus {
    expired = "expired",
    pending = "pending",
    completed = "completed"
}
export interface backendInterface {
    createSession(phoneNumber: string, requesterName: string, reason: string): Promise<string>;
    expireSession(sessionId: string): Promise<boolean>;
    getAllSessions(): Promise<Array<SessionOutput>>;
    getSession(sessionId: string): Promise<SessionOutput | null>;
    submitLocation(sessionId: string, lat: number, lng: number, accuracy: number): Promise<boolean>;
}

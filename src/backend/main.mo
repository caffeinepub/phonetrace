import Time "mo:core/Time";
import Map "mo:core/Map";
import Text "mo:core/Text";
import Runtime "mo:core/Runtime";
import Int "mo:core/Int";
import Iter "mo:core/Iter";

actor {
  type Location = {
    lat : Float;
    lng : Float;
    accuracy : Float;
    timestamp : Int;
  };

  type TrackingSession = {
    id : Text;
    phoneNumber : Text;
    location : ?Location;
    isActive : Bool;
    consentGiven : Bool;
    createdAt : Int;
    expiresAt : Int;
  };

  module TrackingSession {
    public func compareByCreatedAt(session1 : TrackingSession, session2 : TrackingSession) : { #less; #equal; #greater } {
      Int.compare(session1.createdAt, session2.createdAt);
    };
  };

  let sessions = Map.empty<Text, TrackingSession>();
  var counter = 0;

  func generateId() : Text {
    let timestamp = Time.now();
    let id = timestamp.toText() # "_" # counter.toText();
    counter += 1;
    id;
  };

  func filterActive(session : TrackingSession) : Bool {
    let now = Time.now();
    session.isActive and now < session.expiresAt;
  };

  public shared ({ caller }) func createSession(phoneNumber : Text) : async Text {
    let id = generateId();
    let now = Time.now();
    let expiresAt = now + 1_800_000_000_000; // 30 minutes in nanoseconds

    let session : TrackingSession = {
      id;
      phoneNumber;
      location = null;
      isActive = true;
      consentGiven = false;
      createdAt = now;
      expiresAt;
    };

    sessions.add(id, session);
    id;
  };

  public shared ({ caller }) func submitLocation(sessionId : Text, lat : Float, lng : Float, accuracy : Float) : async Bool {
    switch (sessions.get(sessionId)) {
      case (null) { Runtime.trap("Session not found") };
      case (?session) {
        let now = Time.now();
        if (not session.isActive) { Runtime.trap("Session is not active") };
        if (session.consentGiven) { Runtime.trap("Consent already given") };
        if (now > session.expiresAt) {
          let updatedSession = { session with isActive = false };
          sessions.add(sessionId, updatedSession);
          Runtime.trap("Session expired");
        };

        let location : Location = {
          lat;
          lng;
          accuracy;
          timestamp = now;
        };

        let updatedSession = {
          session with
          location = ?location;
          consentGiven = true;
        };

        sessions.add(sessionId, updatedSession);
        true;
      };
    };
  };

  public query ({ caller }) func getSession(sessionId : Text) : async ?TrackingSession {
    switch (sessions.get(sessionId)) {
      case (null) { null };
      case (?session) {
        let now = Time.now();
        if (now > session.expiresAt and session.isActive) {
          let updatedSession = { session with isActive = false };
          sessions.add(sessionId, updatedSession);
          ?updatedSession;
        } else {
          ?session;
        };
      };
    };
  };

  public shared ({ caller }) func deactivateSession(sessionId : Text) : async Bool {
    switch (sessions.get(sessionId)) {
      case (null) { Runtime.trap("Session not found") };
      case (?session) {
        if (not session.isActive) { Runtime.trap("Session already inactive") };
        let updatedSession = { session with isActive = false };
        sessions.add(sessionId, updatedSession);
        true;
      };
    };
  };

  public query ({ caller }) func getActiveSessions() : async [TrackingSession] {
    sessions.values().toArray().filter(filterActive).sort(TrackingSession.compareByCreatedAt);
  };
};

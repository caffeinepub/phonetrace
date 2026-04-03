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

  type SessionStatus = {
    #pending;
    #completed;
    #expired;
  };

  type SessionOutput = {
    id : Text;
    phoneNumber : Text;
    requesterName : Text;
    reason : Text;
    location : ?Location;
    status : SessionStatus;
    createdAt : Int;
    expiresAt : Int;
  };

  type SessionRaw = {
    id : Text;
    phoneNumber : Text;
    requesterName : Text;
    reason : Text;
    location : ?Location;
    createdAt : Int;
    expiresAt : Int;
  };

  module SessionOutput {
    public func compareByCreatedAt(session1 : SessionOutput, session2 : SessionOutput) : { #less; #equal; #greater } {
      Int.compare(session1.createdAt, session2.createdAt);
    };
  };

  let sessions = Map.empty<Text, SessionRaw>();
  var counter = 0;

  public shared ({ caller }) func createSession(phoneNumber : Text, requesterName : Text, reason : Text) : async Text {
    let id = Time.now().toText() # "_" # counter.toText();
    counter += 1;

    let session : SessionRaw = {
      id;
      phoneNumber;
      requesterName;
      reason;
      location = null;
      createdAt = Time.now();
      expiresAt = Time.now() + 1_800_000_000_000; // 30 minutes
    };

    sessions.add(id, session);
    id;
  };

  public shared ({ caller }) func submitLocation(sessionId : Text, lat : Float, lng : Float, accuracy : Float) : async Bool {
    switch (sessions.get(sessionId)) {
      case (null) { Runtime.trap("Session not found") };
      case (?session) {
        if (Time.now() > session.expiresAt) { Runtime.trap("Session expired") };
        if (session.location != null) { Runtime.trap("Location already submitted") };

        let location : Location = {
          lat;
          lng;
          accuracy;
          timestamp = Time.now();
        };

        let updatedSession = { session with location = ?location };
        sessions.add(sessionId, updatedSession);
        true;
      };
    };
  };

  func toSessionOutput(session : SessionRaw) : SessionOutput {
    let status = switch (session.location, Time.now() > session.expiresAt) {
      case (?_, true) { #expired };
      case (null, false) { #pending };
      case (?_, false) { #completed };
    };
    { session with status };
  };

  public query ({ caller }) func getSession(sessionId : Text) : async ?SessionOutput {
    switch (sessions.get(sessionId)) {
      case (null) { null };
      case (?session) {
        ?toSessionOutput(session);
      };
    };
  };

  public query ({ caller }) func getAllSessions() : async [SessionOutput] {
    sessions.values().toArray().map(toSessionOutput).sort(SessionOutput.compareByCreatedAt);
  };

  public shared ({ caller }) func expireSession(sessionId : Text) : async Bool {
    switch (sessions.get(sessionId)) {
      case (null) { Runtime.trap("Session not found") };
      case (?session) {
        if (Time.now() > session.expiresAt) {
          Runtime.trap("Session already expired");
        };
        let updatedSession = { session with expiresAt = Time.now() };
        sessions.add(sessionId, updatedSession);
        true;
      };
    };
  };
};

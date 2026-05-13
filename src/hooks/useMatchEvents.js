import { useEffect, useState } from "react";
import { subscribeToMatchEvents, addMatchEvent, deleteMatchEvent } from "../utils/firestore";

function deriveStats(events) {
  const playerStats = {};
  const ps = (id) => {
    if (!playerStats[id]) playerStats[id] = {};
    return playerStats[id];
  };

  const scrums = { ours: 0, won: 0, lost: 0, stolen: 0 };
  const lineouts = { ours: 0, won: 0, lost: 0, stolen: 0 };
  const rucks = { lost: 0, oppRecoveredPushover: 0, oppRecoveredRetained: 0 };
  const tries = [];
  const plays = [];

  for (const ev of events) {
    switch (ev.type) {
      case "scrum_won":    scrums.ours++; scrums.won++; break;
      case "scrum_lost":   scrums.ours++; scrums.lost++; break;
      case "scrum_stolen": scrums.stolen++; break;
      case "lineout_won":    lineouts.ours++; lineouts.won++; break;
      case "lineout_lost":   lineouts.ours++; lineouts.lost++; break;
      case "lineout_stolen": lineouts.stolen++; break;
      case "lineout_error":
        ps(ev.playerId).lineoutErrors = (ps(ev.playerId).lineoutErrors || 0) + 1; break;
      case "ruck_lost":         rucks.lost++; break;
      case "ruck_opp_pushover": rucks.oppRecoveredPushover++; break;
      case "ruck_opp_retained": rucks.oppRecoveredRetained++; break;
      case "tackle_won":    ps(ev.playerId).tacklesWon    = (ps(ev.playerId).tacklesWon    || 0) + 1; break;
      case "tackle_lost":   ps(ev.playerId).tacklesLost   = (ps(ev.playerId).tacklesLost   || 0) + 1; break;
      case "tackle_missed": ps(ev.playerId).tacklesMissed = (ps(ev.playerId).tacklesMissed || 0) + 1; break;
      case "kick_at_goal_made": {
        const kg = ps(ev.playerId).kicksAtGoal || { attempts: 0, successful: 0 };
        ps(ev.playerId).kicksAtGoal = { attempts: kg.attempts + 1, successful: kg.successful + 1 };
        break;
      }
      case "kick_at_goal_missed": {
        const kg = ps(ev.playerId).kicksAtGoal || { attempts: 0, successful: 0 };
        ps(ev.playerId).kicksAtGoal = { attempts: kg.attempts + 1, successful: kg.successful };
        break;
      }
      case "play_kick": {
        const pks = ps(ev.playerId).playKicks || [];
        ps(ev.playerId).playKicks = [...pks, { id: ev.id, rating: ev.rating, distance: ev.distance }];
        break;
      }
      case "penalty": {
        const pens = ps(ev.playerId).penalties || [];
        ps(ev.playerId).penalties = [...pens, { id: ev.id, reason: ev.reason }];
        break;
      }
      case "try":  tries.push({ id: ev.id, playerId: ev.playerId, fromPlay: ev.fromPlay, minute: ev.minute }); break;
      case "play": plays.push({ id: ev.id, playbookId: ev.playbookId, name: ev.name, playerIds: ev.playerIds, result: ev.result }); break;
      default: break;
    }
  }

  return { scrums, lineouts, rucks, tries, plays, playerStats };
}

export function useMatchEvents(matchId) {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    if (!matchId) return;
    return subscribeToMatchEvents(matchId, setEvents);
  }, [matchId]);

  return {
    events,
    stats: deriveStats(events),
    addEvent:    (data)    => addMatchEvent(matchId, data),
    deleteEvent: (eventId) => deleteMatchEvent(matchId, eventId),
  };
}

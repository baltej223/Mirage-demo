import express, { NextFunction } from "express";
import { z } from "zod";
import { validatePOSTBody } from "./middlewares/validate";
import User from "./user";
import db from "./firebase";
import { firestore } from "firebase-admin";
import * as geo from "geofire-common";
import pino from "pino-http";
import logger, { getLogs } from "./logger";
import cors from "cors";
import { FieldPath } from "firebase-admin/firestore";

const questions: Record<
  string,
  {
    lat: number;
    lng: number;
    question: string;
    answer: string;
  }
  > = {};

const truncateDecimals = (number: number, decimals: number) => 
  Math.trunc(number * Math.pow(10, decimals)) / Math.pow(10, decimals);

class PerfMonitor {
  data: { [key: string]: { avg: number; count: number } };
  constructor() {
    this.data = {};
  }
  addPoint(key: string, reading: number) {
    if (!this.data[key]) {
      this.data[key] = { avg: reading, count: 1 };
      return;
    }
    const old = this.data[key];
    this.data[key] = {
      avg: ((old.avg + reading) * old.count) / (old.count + 1),
      count: old.count + 1,
    };
  }
  middleware(key: string): any {
    return (_: Request, __: Response, next: NextFunction) => {
      const start = performance.now();
      next();
      const end = performance.now();
      this.addPoint(key, end - start);
    };
  }
}

const getTargetRequestSchema = z.object({
  lat: z.float64(),
  lng: z.float64(),
  user: User,
});

const app = express();
app.use(cors());
// app.use(pino({ logger }));
app.use(express.json());
const PORT = 3000;
const perf = new PerfMonitor();

/**
 * @route GET /
 * @summary Health check endpoint and performance monitor
 * @description
 * Returns the API status and average request performance metrics recorded by the `PerfMonitor` class.
 * @returns {object} 200 - JSON object containing `{ status: "online" }` and averaged route timings.
 */
app.get("/", (req, res) => {
  res.json({
    status: "online",
    ...perf.data,
  });
});

/**
 * @route GET /logs
 * @summary Retrieve recent or filtered logs
 * @description
 * Returns the most recent 200 log entries by default.
 * If the `q` query parameter is provided, returns logs containing that substring (case-insensitive).
 * Useful for admin dashboard log search or real-time monitoring.
 * @param {string} [q] - Optional search keyword to filter logs.
 * @returns {string[]} 200 - Array of log lines (newest last).
 */
app.get("/logs", (req, res) => {
  const { q } = req.query;
  let logs = getLogs();

  if (q && typeof q === "string") {
    logs = logs.filter((log) => log.toLowerCase().includes(q.toLowerCase()));
  } else {
    logs = logs.slice(-200);
  }

  res.json(logs);
});

const checkAnswerRequestSchema = z.object({
  questionId: z.string().length(20, "Invalid Id"),
  answer: z.string(),
  lat: z.float64(),
  lng: z.float64(),
  user: User,
});

/**
 * @route POST /api/checkAnswer
 * @summary Validate a player’s answer for a location-based question
 * @description
 * 1. Fetches the question from Firestore using the provided `questionId`.
 * 2. Compares the normalized (lowercased) user answer with the correct answer.
 * 3. Computes the haversine distance between the user’s coordinates and the question location.
 * 4. If within the valid range (default 50m, configurable via `VALID_DISTANCE_FOR_ANSWERING_IN_KM`),
 *    updates the team’s Firestore document by incrementing points and marking the question as answered.
 * 5. Returns `{}` on success, or an error message with appropriate status on failure.
 *
 * @param {string} body.questionId - Unique ID of the question document (20 characters).
 * @param {string} body.answer - The player’s submitted answer string.
 * @param {number} body.lat - The player’s current latitude.
 * @param {number} body.lng - The player’s current longitude.
 * @param {User} body.user - The user object containing team identification.
 *
 * @returns {object} 200 - `{}` on success.
 * @returns {object} 400 - `{ error: "Incorrect" }` if the answer doesn’t match.
 * @returns {object} 404 - `{ error: "Not found" }` if the question, team, or proximity check fails.
 */

app.post(
  "/api/checkAnswer",
  validatePOSTBody(checkAnswerRequestSchema),
  perf.middleware("checkAnswer"),
  async (req, res) => {
    const { questionId, answer, lat, lng, user } = req.body;
    if (!(questionId in questions)) {
      res.status(404);
      return res.json({ error: "Not found" });
    }
    const data = questions[questionId];

    const questionLocation = data.location;
    const questionLat = truncateDecimals(questionLocation.latitude, 4);
    const questionLng = truncateDecimals(questionLocation.longitude, 4);
    const userLat = truncateDecimals(lat, 4);
    const userLng = truncateDecimals(lng, 4);

    if (questionLat < userLat - 0.0005 || questionLat > userLat + 0.0005) {
      res.status(404);
      return res.json({ error: "Not found" });
    }
    if (questionLng < userLng - 0.0005 || questionLng > userLng + 0.0005) {
      res.status(404);
      return res.json({ error: "Not found" });
    }

    const teamQuery = await db
      .collection("mirage-teams")
      .where("member_ids", "array-contains", user.userId)
      .get();
    if (teamQuery.empty) {
      res.status(404);
      return res.json({ error: "Team not found" });
    }
    const team = teamQuery?.docs[0]?.ref;
    const teamData = (await team?.get())?.data();

    if (!teamData) {
      res.status(404);
      return res.json({ error: "Not found" });
    }

    for (let i = 0; i < teamData.answered_questions.length; i++) {
      if (teamData.answered_questions[i] === questionId) {
        res.status(404);
        return res.json({ error: "Not found" });
      }
    }

    if (answer.trim().toLowerCase() !== data.answer.trim().toLowerCase()) {
      res.status(400);
      return res.json({ error: "Incorrect" });
    }

    team?.update({
      points: firestore.FieldValue.increment(data.points),
      answered_questions: firestore.FieldValue.arrayUnion(questionId),
    });
    if (data.points > 10) {
      // questionRef.update({
      //   points: firestore.FieldValue.increment(-10),
      // });
    }

    const nextQuestion = await db.collection("mirage-locations")
      .where(FieldPath.documentId(), "not-in", [...teamData.answered_questions, questionId])
      .limit(1).get();

    return res.json({
      nextHint: nextQuestion.empty ? "You have answered all available questions!" : nextQuestion.docs[0]!.data().hint,
    });
  },
);

/**
 * @route POST /api/getTarget
 * @summary Fetch nearby question targets based on user location
 * @description
 * This route is polled every few seconds by the client.
 * It queries all questions in Firestore within a given radius (default 50m) of the player’s current position.
 * Uses geofire-common to compute geohash query bounds and merges all query snapshots.
 *
 * @param {number} body.lat - Current latitude of the player.
 * @param {number} body.lng - Current longitude of the player.
 * @param {User} body.user - The user object (primarily for team context or auth).
 *
 * @returns {object} 200 - JSON with nearby questions:
 * {
 *   questions: [
 *     { id, title, question, lat, lng }
 *   ]
 * }
 */
app.post(
  "/api/getTarget",
  validatePOSTBody(getTargetRequestSchema),
  perf.middleware("getTarget"),
  async (req, res) => {
    const { lat, lng, user } = req.body;
    const center = [lat, lng];
    
    const userLat = truncateDecimals(lat, 4);
    const userLng = truncateDecimals(lng, 4);

    const questions = [] as any[];
    const promises = [] as Promise<firestore.QuerySnapshot<firestore.DocumentData>>[];

    

    const snapshots = await Promise.all(promises);
    snapshots.forEach((x) => questions.push(...x.docs));
    res.json({
      questions: questions.map((doc) => ({
        id: doc._ref._path.segments[1],
        title: doc._fieldsProto.title.stringValue,
        question: doc._fieldsProto.question.stringValue,
        lat: doc._fieldsProto.location.geoPointValue.latitude,
        lng: doc._fieldsProto.location.geoPointValue.longitude,
      })),
    });
  },
);

app.listen(PORT, async () => {
  logger.info(`${PORT} is now in use`);

  const rawquestions = ((await db.collection('mirage-locations').get()).docs);
  rawquestions.forEach(x => {
    questions[x.id] = {
      lat: x.data().location.latitude,
      lng: x.data().location.longitude,
      question: x.data().question,
      answer: x.data().answer
    }
  });
});

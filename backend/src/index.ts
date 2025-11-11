import express, { NextFunction } from "express";
import { z } from "zod";
import { validatePOSTBody } from "./middlewares/validate";
import User from './user'
import { db } from './firebase'
import * as geo from 'geofire-common'

class PerfMonitor {
  data: {[key: string]: { avg: number; count: number; } }
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
      avg: (old.avg + reading) * old.count / (old.count + 1),
      count: old.count + 1,
    };
  }
  middleware(key: string): any {
    return (_: Request, __: Response, next: NextFunction) => {
      const start = performance.now();
      next();
      const end = performance.now();
      this.addPoint(key, end - start);
    }
  }
}

const app = express();
app.use(express.json());
const PORT = 3000;
const perf = new PerfMonitor();

app.get("/", (req, res) => {
  res.json({
    "status": "online",
    ...perf.data
  });
});

// /api/checkAnswer
// req body => {questionId: uuid, answer: string, lat: double float idk whatever, long: also double float idk whatever, user}
// res json => { wrong answer }, status 467 || { not found }, status 404, { questionId, question } 
// description: fetch question from uuid, then strip and normalise (lowercase) the answer, then match it with the answer string, if correct, check haversine distance of lat long from question location, if within DISTANCE (50m by default in ENV), find team of user from db and append entire team of user to the question under "foundBy" field (array), then call findRandomLeastFound() and return the question
const checkAnswerRequestSchema = z.object({
  questionId: z.string().length(20, "Invalid Id"),
  answer: z.string(),
  lat: z.float64(),
  lng: z.float64(),
  user: User,
});
app.post("/api/checkAnswer", validatePOSTBody(checkAnswerRequestSchema), perf.middleware('checkAnswer'), async (req, res) => {
  const { questionId, answer, lat, lng, user } = req.body;
  const data = (await db.collection('mirage-locations').doc(questionId).get()).data();
  if (!data) {
    res.sendStatus(404);
    return res.json({ "error" : "Not found" });
  }
  const questionLocation = [data.location._latitude, data.location._longitude] as [number, number];
  console.log(geo.distanceBetween(questionLocation, [lat, lng]));

  res.send("ok");
})

// /api/getTarget 
// req body => {lat, long, user}
// res json => { question }
// description: polled ruthlessly every 5 seconds or on locar gps update, checks haversine distance of every single point (50 or so, cached in global variable in memory
const getTargetRequestSchema = z.object({
  lat: z.float64(),
  lng: z.float64(),
  user: User,
});
app.post("/api/getTarget", validatePOSTBody(getTargetRequestSchema), perf.middleware('getTarget'), (req, res) => {
  res.send('Oki');
})

app.listen(PORT, () => {
  console.log(`${PORT} is now in use`);
});

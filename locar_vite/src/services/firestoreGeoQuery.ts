// services/firestoreGeoQuery.ts
import {
  collection,
  query,
  orderBy,
  startAt,
  endAt,
  getDocs,
  QueryDocumentSnapshot,
//   where, // For additional filters
} from 'firebase/firestore';
import { geohashQueryBounds, distanceBetween } from 'geofire-common'; // Official Firebase lib
import { db } from '../../firebase.ts';

interface GeoPoint {
  lat: number;
  lng: number;
}

interface GeoQueryOptions {
  collectionName: string;
  center: GeoPoint;
  radiusMeters: number;
  additionalFilters?: (q: any) => any; // e.g., add where('category', '==', 'cafe')
}

/**
 * Official Firebase geo query: Geohash bounds + distance filter.
 * For 25m: 1-4 queries, <5 reads typically.
 */
export async function queryWithinRadius({
  collectionName,
  center,
  radiusMeters,
  additionalFilters = (q: any) => q,
}: GeoQueryOptions): Promise<QueryDocumentSnapshot[]> {
  const centerPoint = [center.lat, center.lng] as [number, number];
  const bounds = geohashQueryBounds(centerPoint, radiusMeters); // Lib magic: Returns [[start, end], ...]
  const cityCollection = collection(db, collectionName);
  const promises: Promise<any>[] = [];

  for (const b of bounds) {
    let q = query(
      cityCollection,
      orderBy('geohash'),
      startAt(b[0]),
      endAt(b[1])
    );
    q = additionalFilters(q); // Chain extras
    promises.push(getDocs(q));
  }

  const snapshots = await Promise.all(promises);
  const matches: QueryDocumentSnapshot[] = [];

  for (const snap of snapshots) {
    for (const doc of snap.docs) {
      const { lat, lng } = doc.data();
      if (lat !== undefined && lng !== undefined) {
        const distanceInM = distanceBetween([lat, lng], centerPoint) * 1000; // Lib's Haversine, in km → m
        if (distanceInM <= radiusMeters) {
          matches.push(doc);
        }
      }
    }
  }

  return matches;
}
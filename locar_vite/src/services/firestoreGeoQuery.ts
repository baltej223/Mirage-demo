// services/firestoreGeoQuery.ts
import {
  collection,
  query,
  orderBy,
  startAt,
  endAt,
  getDocs,
  // QueryDocumentSnapshot,
} from 'firebase/firestore';
import { geohashQueryBounds, distanceBetween } from 'geofire-common';
import { db } from '../../firebase.ts'; // Your Firebase init

interface GeoPoint {
  lat: number;
  lng: number;
}

interface LocationDoc {
  geohash: string;
  lat: number;
  lng: number;
  color?: number; // Optional hex color for cube
}

interface GeoQueryOptions {
  collectionName: string;
  center: GeoPoint;
  radiusMeters: number;
  additionalFilters?: (q: any) => any;
}

export interface NearbyLocation {
  id: string;
  lat: number;
  lng: number;
  color: number; // Default random if missing
}

/**
 * Queries Firebase for locations within radius using geohash bounds + distance filter.
 * Returns array of {id, lat, lng, color} for easy AR rendering.
 */
export async function queryWithinRadius({
  collectionName,
  center,
  radiusMeters,
  additionalFilters = (q: any) => q,
}: GeoQueryOptions): Promise<NearbyLocation[]> {
  try {
    const centerPoint = [center.lat, center.lng] as [number, number];
    const bounds = geohashQueryBounds(centerPoint, radiusMeters);
    const cityCollection = collection(db, collectionName);
    const promises: Promise<any>[] = [];

    for (const b of bounds) {
      let q = query(
        cityCollection,
        orderBy('geohash'),
        startAt(b[0]),
        endAt(b[1])
      );
      q = additionalFilters(q);
      promises.push(getDocs(q));
    }

    const snapshots = await Promise.all(promises);
    const matches: NearbyLocation[] = [];

    for (const snap of snapshots) {
      for (const doc of snap.docs) {
        const data = doc.data() as LocationDoc;
        if (data.lat !== undefined && data.lng !== undefined) {
          const distanceInM = distanceBetween([data.lat, data.lng], centerPoint) * 1000;
          if (distanceInM <= radiusMeters) {
            matches.push({
              id: doc.id,
              lat: data.lat,
              lng: data.lng,
              color: data.color ?? Math.random() * 0xffffff, // Random hex if no color
            });
          }
        }
      }
    }

    return matches;
  } catch (error) {
    console.error('Geo query failed:', error);
    return [];
  }
}
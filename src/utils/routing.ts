// OSRM Routing service for street-based navigation
// Uses OpenStreetMap Routing Machine for real street-based paths

export interface RoutePoint {
  lat: number;
  lon: number;
}

export interface RouteResult {
  coordinates: RoutePoint[];
  distance: number; // in meters
  duration: number; // in seconds
}

// Cache for routes to avoid repeated API calls
const routeCache = new Map<string, RouteResult>();

function getCacheKey(from: RoutePoint, to: RoutePoint): string {
  return `${from.lat.toFixed(5)},${from.lon.toFixed(5)}-${to.lat.toFixed(5)},${to.lon.toFixed(5)}`;
}

export async function getRoute(from: RoutePoint, to: RoutePoint): Promise<RouteResult | null> {
  const cacheKey = getCacheKey(from, to);
  
  if (routeCache.has(cacheKey)) {
    return routeCache.get(cacheKey)!;
  }

  try {
    // Use OSRM demo server - for production, use your own server
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lon},${from.lat};${to.lon},${to.lat}?overview=full&geometries=geojson`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
      return null;
    }

    const route = data.routes[0];
    const coordinates: RoutePoint[] = route.geometry.coordinates.map(
      (coord: [number, number]) => ({
        lat: coord[1],
        lon: coord[0],
      })
    );

    const result: RouteResult = {
      coordinates,
      distance: route.distance,
      duration: route.duration,
    };

    routeCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error("Routing error:", error);
    return null;
  }
}

// Get next point along the route towards target
export function getNextPositionOnRoute(
  currentPos: RoutePoint,
  route: RoutePoint[],
  speed: number // distance per tick
): { newPos: RoutePoint; remainingRoute: RoutePoint[] } {
  if (route.length === 0) {
    return { newPos: currentPos, remainingRoute: [] };
  }

  let remaining = speed;
  let pos = currentPos;
  let routeIndex = 0;

  while (remaining > 0 && routeIndex < route.length) {
    const target = route[routeIndex];
    const dx = target.lon - pos.lon;
    const dy = target.lat - pos.lat;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= remaining) {
      // We can reach this waypoint
      pos = target;
      remaining -= dist;
      routeIndex++;
    } else {
      // Move towards this waypoint
      const ratio = remaining / dist;
      pos = {
        lat: pos.lat + dy * ratio,
        lon: pos.lon + dx * ratio,
      };
      remaining = 0;
    }
  }

  return {
    newPos: pos,
    remainingRoute: route.slice(routeIndex),
  };
}

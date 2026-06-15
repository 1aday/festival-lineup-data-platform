import { NextRequest, NextResponse } from 'next/server';

interface Event {
  id: number;
  title: string;
  start_date: string;
  end_date: string;
  venue_name: string;
  venue_address?: string;
}

interface RouteOptimizationRequest {
  events: Event[];
  travelBuffer: number; // minutes
  startLocation?: {
    lat: number;
    lng: number;
  };
}

interface OptimizedRoute {
  events: Event[];
  totalTravelTime: number;
  totalDistance: number;
  conflicts: Array<{
    event1: Event;
    event2: Event;
    overlap: number; // minutes
  }>;
  suggestions: string[];
}

// Mock venue coordinates (in a real app, you'd have a venue database)
const VENUE_COORDINATES: { [key: string]: { lat: number; lng: number } } = {
  'Ziggo Dome': { lat: 52.3105, lng: 4.9403 },
  'RAI Amsterdam': { lat: 52.3376, lng: 4.8904 },
  'Melkweg': { lat: 52.3640, lng: 4.8840 },
  'Paradiso': { lat: 52.3640, lng: 4.8840 },
  'Shelter': { lat: 52.3640, lng: 4.8840 },
  'De School': { lat: 52.3640, lng: 4.8840 },
  'Claire': { lat: 52.3640, lng: 4.8840 },
  'Club Air': { lat: 52.3640, lng: 4.8840 },
  'Escape': { lat: 52.3640, lng: 4.8840 },
  'Club Up': { lat: 52.3640, lng: 4.8840 },
  'Canvas': { lat: 52.3640, lng: 4.8840 },
  'Tolhuistuin': { lat: 52.3640, lng: 4.8840 },
  'NDSM': { lat: 52.4000, lng: 4.8000 },
  'Westerpark': { lat: 52.3800, lng: 4.8800 },
  'Vondelpark': { lat: 52.3600, lng: 4.8700 },
  'Amsterdam Central': { lat: 52.3791, lng: 4.9003 },
  'Amsterdam Zuid': { lat: 52.3396, lng: 4.8732 },
  'Amsterdam Sloterdijk': { lat: 52.3892, lng: 4.8364 },
};

// Calculate distance between two points using Haversine formula
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Estimate travel time based on distance and Amsterdam's public transport
function estimateTravelTime(distance: number): number {
  // Rough estimates for Amsterdam:
  // Walking: 5 km/h
  // Bike: 15 km/h  
  // Public transport: 20 km/h average
  // Taxi/car: 25 km/h average
  
  const walkingTime = (distance / 5) * 60; // minutes
  const bikeTime = (distance / 15) * 60;
  const publicTransportTime = (distance / 20) * 60;
  const carTime = (distance / 25) * 60;
  
  // Return the fastest reasonable option (bike or public transport)
  return Math.min(bikeTime, publicTransportTime, carTime);
}

// Find venue coordinates (mock implementation)
function getVenueCoordinates(venueName: string): { lat: number; lng: number } | null {
  // Try exact match first
  if (VENUE_COORDINATES[venueName]) {
    return VENUE_COORDINATES[venueName];
  }
  
  // Try partial matches
  for (const [key, coords] of Object.entries(VENUE_COORDINATES)) {
    if (venueName.toLowerCase().includes(key.toLowerCase()) || 
        key.toLowerCase().includes(venueName.toLowerCase())) {
      return coords;
    }
  }
  
  // Default to city center if not found
  return { lat: 52.3676, lng: 4.9041 };
}

// Check for time conflicts between events
function detectConflicts(events: Event[], travelBuffer: number): Array<{
  event1: Event;
  event2: Event;
  overlap: number;
}> {
  const conflicts: Array<{ event1: Event; event2: Event; overlap: number }> = [];
  
  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const event1 = events[i];
      const event2 = events[j];
      
      const start1 = new Date(event1.start_date);
      const end1 = new Date(event1.end_date);
      const start2 = new Date(event2.start_date);
      const end2 = new Date(event2.end_date);
      
      // Add travel buffer
      const start1WithBuffer = new Date(start1.getTime() - travelBuffer * 60000);
      const end1WithBuffer = new Date(end1.getTime() + travelBuffer * 60000);
      const start2WithBuffer = new Date(start2.getTime() - travelBuffer * 60000);
      const end2WithBuffer = new Date(end2.getTime() + travelBuffer * 60000);
      
      // Check for overlap
      const overlap = Math.max(0, 
        Math.min(end1WithBuffer.getTime(), end2WithBuffer.getTime()) - 
        Math.max(start1WithBuffer.getTime(), start2WithBuffer.getTime())
      );
      
      if (overlap > 0) {
        conflicts.push({
          event1,
          event2,
          overlap: Math.round(overlap / 60000) // Convert to minutes
        });
      }
    }
  }
  
  return conflicts;
}

// Optimize route using a simple greedy algorithm
function optimizeRoute(events: Event[], travelBuffer: number): Event[] {
  if (events.length <= 1) return events;
  
  // Sort events by start time
  const sortedEvents = [...events].sort((a, b) => 
    new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
  );
  
  const optimized: Event[] = [];
  const remaining = [...sortedEvents];
  
  // Start with the first event
  let currentEvent = remaining.shift()!;
  optimized.push(currentEvent);
  
  while (remaining.length > 0) {
    let bestNext: Event | null = null;
    let bestScore = -1;
    
    for (const event of remaining) {
      // Calculate score based on:
      // 1. Time gap (prefer events that start soon after current ends)
      // 2. Distance (prefer closer venues)
      // 3. No conflicts
      
      const currentEnd = new Date(currentEvent.end_date);
      const nextStart = new Date(event.start_date);
      const timeGap = (nextStart.getTime() - currentEnd.getTime()) / 60000; // minutes
      
      // Skip if there's a conflict
      const currentCoords = getVenueCoordinates(currentEvent.venue_name);
      const nextCoords = getVenueCoordinates(event.venue_name);
      
      if (!currentCoords || !nextCoords) continue;
      
      const distance = calculateDistance(
        currentCoords.lat, currentCoords.lng,
        nextCoords.lat, nextCoords.lng
      );
      
      const travelTime = estimateTravelTime(distance);
      
      // Skip if not enough time to travel
      if (timeGap < travelTime + travelBuffer) continue;
      
      // Calculate score (higher is better)
      const score = timeGap - travelTime - travelBuffer; // Prefer events with optimal timing
      
      if (score > bestScore) {
        bestScore = score;
        bestNext = event;
      }
    }
    
    if (bestNext) {
      optimized.push(bestNext);
      remaining.splice(remaining.indexOf(bestNext), 1);
      currentEvent = bestNext;
    } else {
      // No suitable next event, add remaining events in chronological order
      optimized.push(...remaining);
      break;
    }
  }
  
  return optimized;
}

export async function POST(request: NextRequest) {
  try {
    const body: RouteOptimizationRequest = await request.json();
    const { events, travelBuffer, startLocation } = body;
    
    if (!events || events.length === 0) {
      return NextResponse.json({ error: 'No events provided' }, { status: 400 });
    }
    
    // Optimize the route
    const optimizedEvents = optimizeRoute(events, travelBuffer);
    
    // Calculate total travel time and distance
    let totalTravelTime = 0;
    let totalDistance = 0;
    
    for (let i = 0; i < optimizedEvents.length - 1; i++) {
      const current = optimizedEvents[i];
      const next = optimizedEvents[i + 1];
      
      const currentCoords = getVenueCoordinates(current.venue_name);
      const nextCoords = getVenueCoordinates(next.venue_name);
      
      if (currentCoords && nextCoords) {
        const distance = calculateDistance(
          currentCoords.lat, currentCoords.lng,
          nextCoords.lat, nextCoords.lng
        );
        const travelTime = estimateTravelTime(distance);
        
        totalDistance += distance;
        totalTravelTime += travelTime;
      }
    }
    
    // Detect conflicts
    const conflicts = detectConflicts(optimizedEvents, travelBuffer);
    
    // Generate suggestions
    const suggestions: string[] = [];
    
    if (conflicts.length > 0) {
      suggestions.push(`Found ${conflicts.length} time conflicts. Consider adjusting your schedule.`);
    }
    
    if (totalTravelTime > 120) { // More than 2 hours of travel
      suggestions.push('High travel time detected. Consider grouping events by area.');
    }
    
    if (optimizedEvents.length > 5) {
      suggestions.push('Many events selected. Consider prioritizing your top choices.');
    }
    
    const result: OptimizedRoute = {
      events: optimizedEvents,
      totalTravelTime: Math.round(totalTravelTime),
      totalDistance: Math.round(totalDistance * 10) / 10,
      conflicts,
      suggestions
    };
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in route optimization:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

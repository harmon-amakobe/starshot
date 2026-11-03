import { useRef, useState } from 'react';
import type { FlightResponse as ShotResponse } from '../sim/protocol';

export function useFlightClock(initialEt: number) {
  const [flight, setFlight] = useState<ShotResponse | null>(null),
    flightRef = useRef(flight);
  flightRef.current = flight;
  const time = useRef(initialEt),
    lastPaint = useRef(0);
  const [clock, setClock] = useState(initialEt);
  return { flight, flightRef, setFlight, time, lastPaint, clock, setClock };
}
export type FlightClock = ReturnType<typeof useFlightClock>;

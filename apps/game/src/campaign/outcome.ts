import { bodyName } from '../missions';
import type { FlightResponse } from '../sim/protocol';

export function impactBody(response: FlightResponse | null) {
  if (!response || response.analysis.termination !== 'impact') return null;
  const id = response.result.terminatedBy;
  return id ? id === 'sun' ? 'Sol' : bodyName(id) : null;
}
export function completionNotice(response: FlightResponse, stars: number) {
  const body = impactBody(response);
  return `${body ? `Impact with ${body}` : response.analysis.hit ? 'Target reached' : 'Shot complete'}. ${stars} stars.`;
}

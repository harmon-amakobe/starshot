import { LunarModel, type RailData } from './model';
import { simulateLunar, type ShotRequest } from './flight';
let model: LunarModel | null = null;
onmessage = (event: MessageEvent<{ id: number; rail?: RailData; request: ShotRequest }>) => {
  const { id, request, rail } = event.data;
  try {
    if (rail) model = new LunarModel(rail);
    if (!model) throw new Error('Moon data is not ready');
    postMessage({ id, flight: simulateLunar(model, request) });
  } catch (error) { postMessage({ id, error: error instanceof Error ? error.message : String(error) }); }
};

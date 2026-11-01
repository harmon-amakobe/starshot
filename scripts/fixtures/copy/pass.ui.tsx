// A comment may say seamless! {U+2014} it is never read.
import { useState } from "react";

type Tone = "hit!" | "miss";

export function Fixture(p: { readonly label: string | null }) {
  const [tone] = useState<Tone>("miss");
  const name = p.label!.trim();
  const keyed = { "Wow! key": 1 }["Wow! key"];
  if (tone === "hit!") return null;
  const cheer = "Bullseye!"; // copy-ok: the one celebration on this screen
  return (
    <p className="x!" aria-live="polite" data-note="seamless">
      Captured by {name} on day {keyed} {cheer}
    </p>
  );
}

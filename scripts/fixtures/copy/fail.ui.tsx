// UI strings that break the rules. Comments are never read, so seamless {U+2014} here is fine.
import { thing } from "./a{U+2014}b";

export function Fixture(p: { readonly n: number | null }) {
  const status = p.n! > 1 ? "Hit! Captured" : "Missed";
  const range = `Window 2026{U+2013}2027 for ${p.n ?? thing}`;
  if (status === "Wow! yes") return null;
  return (
    <section aria-label="A seamless view" className="a{U+2014}b">
      <p>Aim {U+2014} then launch</p>
      <input placeholder="Leverage the slider" />
      <p title="A powerful shot">{range}</p>
    </section>
  );
}

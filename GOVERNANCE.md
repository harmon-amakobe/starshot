# Governance

Starshot is a small project with one owner. This page says who decides what, how a
change of direction is proposed, and what happens if the owner steps away.

## Roles

- **Owner.** Harmon Amakobe. Has the final say on direction, the licence, the brand,
  releases and the decision log, and holds the repository, the domain and the
  trademark.
- **Maintainers.** People with merge rights, added by the owner. Today the owner is the
  only maintainer (D25).
- **Triagers.** People with GitHub's Triage role: they label, assign, close duplicates
  and move issues through the triage steps in `CONTRIBUTING.md`. None yet.
- **Contributors.** Anyone who opens an issue, a discussion or a pull request.
- **Agents.** The AI agents in `.claude/agents/` always act for a named person, who
  answers for their work. Agent commits are authored by that person, with the agent as
  co-author (D24). Agents take only issues labelled `agent-ready` (D23).

## How decisions are made

- **The decision log is the record.** `docs/decisions.md` lists every binding decision
  as D1, D2 and onward. Entries are append-only: a change of mind is a new entry that
  names the one it supersedes. Only the owner reopens a decision.
- **Proposing a change.** Open an issue labelled `kind:proposal`. State the problem, the
  options you considered and the one you recommend, with evidence. For physics, that
  means a comparison with NASA/JPL.
- **Ruling.** The owner answers in the issue. An accepted proposal becomes the next
  D-number in the pull request that acts on it. A declined one is closed with the
  reason.
- **Everyday changes** need no proposal: a pull request that follows `AGENTS.md`,
  passes the gates and gets a maintainer's review is enough.

## Becoming a maintainer

Sustained, reviewed contributions over several months, and an invitation from the
owner. The project stays solo with agents until chapter one is playable (D25), so no
invitations are planned before then.

## If the owner steps away

The owner names a successor in writing, kept outside this repository, for three
things: admin rights on the repository, the `playstarshot.com` and `playstarshot.app`
domains, and the rights in the name and logo. Without a named successor:

- The code stays available under Apache-2.0 and the media under CC BY 4.0. Anyone may
  fork and continue the work under a new name, as `TRADEMARK.md` describes.
- The name and logo are not transferred by a fork.

## Changing this page

A change to this page is a proposal like any other, and lands only with the owner's
approval.

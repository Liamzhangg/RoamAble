# NewHacks 2025 Project

Kick off for our 24-hour NewHacks 2025 build. This repository is structured to let the team ship fast: a dedicated `FrontEnd` workspace for the UI and a `BackEnd` workspace for services and APIs.

## Quick Start

1. Clone the repo: `git clone <repo-url>`
2. Install dependencies for each part of the stack:
   - `FrontEnd`: _add framework/command (e.g., `npm install`)_
   - `BackEnd`: _add framework/command (e.g., `pip install -r requirements.txt`)_
3. Run both services locally and iterate.

## Project Overview

- **Elevator pitch:** _replace with a one-sentence description of the problem you are solving._
- **Target users:** _define who benefits from the solution._
- **Core features:** _list the features you plan to ship during the hackathon._

## Tech Stack

| Area      | Stack (tentative)              | Notes                                |
|-----------|--------------------------------|--------------------------------------|
| FrontEnd  | _React / Next.js / Expo / ..._ | keep all UI code in `/FrontEnd`.     |
| BackEnd   | _FastAPI / Express / Supabase_ | keep all server code in `/BackEnd`.  |
| Tooling   | _Supabase / Firebase / Stripe_ | jot down external services here.     |

Update this table as soon as the tech stack is locked in so the whole team stays aligned.

## Architecture

```text
root
├─ FrontEnd/    # Front-end app (web or mobile)
└─ BackEnd/     # APIs, workers, infra
```

You can add more folders (e.g., `/docs`, `/scripts`) if they help accelerate development—just keep this diagram current.

## Collaboration Tips

- Create short-lived feature branches and keep PRs small.
- Document API contracts (request/response) in the README or a `/docs` folder.
- Capture learnings, blockers, and next steps in a running log so the whole team can sync quickly.

## Deployment Checklist

- [ ] Front end builds locally without manual tweaks.
- [ ] Back end runs locally with seeded data or mocks.
- [ ] `.env.example` files document required configuration for both sides.
- [ ] Production deploy scripts/commands are documented.
- [ ] Demo script rehearsed (problem, solution, walkthrough, call to action).

## Demo Prep

- **Deck:** outline the problem, your insight, and the solution.
- **Live demo:** script the exact flow; capture fallback screenshots.
- **Call to action:** end with what's next or how judges/users can engage.

## Attribution

Drop in any assets, libraries, datasets, or inspirations you rely on so credit is ready for submission forms.


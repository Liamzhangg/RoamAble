# Back-End Overview

Two primary workstreams so teammates can build in parallel:

1. **`map_data/`** – integrates with Google Maps (or other providers), handles authentication, pulls base map data, and emits normalized DTOs.
2. **`routing_engine/`** – consumes normalized data, layers accessibility constraints, and returns optimal routes tailored to user profiles.

## Interaction Contract

- `map_data` should expose provider-agnostic functions (e.g., `get_graph(area_bounds)`, `geocode(address)`) and keep raw API plumbing here.
- `routing_engine` consumes those functions or their outputs via JSON/DB and focuses on algorithmic routing without worrying about external API details.

Define shared data contracts early (e.g., a `Segment` JSON schema with accessibility attributes) and keep them in a `contracts/` module if helpful. This keeps the codebases decoupled while letting both be developed simultaneously. 

Consider setting up a small Express/Fastify gateway later that composes both services into public endpoints.

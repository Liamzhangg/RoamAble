# Routing Engine

Calculates accessibility-aware routes using enriched map data.

## Responsibilities

- Ingest base graph data + accessibility layers from `map_data_service`.
- Model constraints for different mobility needs (wheelchair, low-vision, etc.).
- Run weighted shortest-path algorithms (Dijkstra/A* variants) that respect accessibility tags.
- Expose route computation through internal APIs (e.g., `compute_route`, `score_path`).

## Suggested Next Steps

- [ ] Define the graph schema (nodes, edges, accessibility attributes, penalties).
- [ ] Prototype routing algorithms with mocked map data.
- [ ] Add a service entry point (e.g., `routing_service.py`) and document expected request/response payloads.

## Collaboration Tips

- Keep business logic decoupled from Google-specific classes; consume the normalized DTOs the map team emits.
- Provide contract tests or JSON fixtures that describe the inputs/outputs so both teams stay aligned.

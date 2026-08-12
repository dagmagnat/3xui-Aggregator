# Stage96 — Remnawave users and common subscription

This stage turns the stage95 Remnawave connection into a client provider.

## Data model

One Aggregator node of type `remnawave` represents one Remnawave Panel plus one configured Internal Squad.

- `clients.uuid` is sent as the Remnawave `vlessUuid`.
- Remnawave user UUID is stored in `client_nodes.remote_uuid`.
- Remnawave username is stored in `client_nodes.remote_email`.
- Remnawave `subscriptionUrl` is stored in `client_nodes.remote_sub_url`.
- The configured `remnawave_internal_squad_uuid` is assigned to created users.
- Aggregator traffic GB maps to `trafficLimitBytes`.
- Aggregator IP limit maps to Remnawave `hwidDeviceLimit`.
- An unlimited Aggregator expiry is represented as 2099-12-31 because Remnawave requires `expireAt`.

## Operations

- Create client on selected Remnawave connection.
- Create only missing users and safely add a missing configured Internal Squad.
- Import existing Remnawave users into Aggregator.
- Update username, state, expiry, traffic, device limit, description and squad.
- Removing a client from the selected Remnawave connection detaches only its configured Internal Squad.
- Deleting a client from all nodes deletes the Remnawave user only after the API confirms the operation.
- Merge VLESS links from the Remnawave user subscription into the normal Aggregator SUB and HAPP JSON outputs.

## Safety

- A Remnawave username that exists with another VLESS UUID is treated as a conflict and is not overwritten.
- API tokens and optional Caddy X-Api-Key remain encrypted by the existing project crypto layer.
- Internal Squad UUID is mandatory for Remnawave nodes.
- Long operations retain stage93 safe cancellation and circuit-breaker behavior.

## API token scopes

The Remnawave token used by Aggregator must permit listing, creating, updating and deleting users. A read-only token can pass some checks but cannot synchronize clients.

## Scope limitation

A Remnawave Aggregator node represents a Panel plus one Internal Squad, not one physical Xray process. Node-specific removal detaches that squad; full client deletion removes the panel-wide Remnawave user.

# Rolling Deployment for React-Django-Postgres

## Deployment Commands

- Frontend only
  - kubectl apply -f infra/k8s/namespaces/app.yaml
  - kubectl apply -n app -f infra/k8s/frontend
  - kubectl apply -n app -f infra/k8s/ingress
- Backend only
  - kubectl apply -f infra/k8s/namespaces/app.yaml
  - kubectl apply -n app -f infra/k8s/backend/secret.yaml
  - kubectl apply -n app -f infra/k8s/backend/configmap.yaml
  - kubectl apply -n app -f infra/k8s/backend/job-migrate.yaml
  - kubectl apply -n app -f infra/k8s/backend
- Database only
  - kubectl apply -f infra/k8s/namespaces/app.yaml
  - kubectl apply -n app -f infra/k8s/db

## Rolling Deployment Overview

- Deployments replace pods gradually using RollingUpdate with maxSurge 1 and maxUnavailable 0 to maintain availability.
- Readiness probes ensure traffic flows only to healthy new pods, enabling zero downtime.
- Services automatically update endpoints to ready pods during rollout.

## Why Preferred in Production

- Minimizes downtime and risk through incremental updates and quick rollbacks.
- Aligns with stateless service design where instances are interchangeable.

## Limitations for Monoliths and DB Changes

- Database changes are stateful and require backward-compatible, two-step migrations.
- Run migrations via a Job before rolling the backend to avoid schema mismatch.
- Use StatefulSet with OnDelete for PostgreSQL to prevent unintended restarts.

## Separation of Concerns

- Frontend serves static assets and calls the backend only via /api.
- Backend connects only to the postgres service using environment variables and secrets.


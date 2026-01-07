# System Documentation: Kubernetes Rolling Deployment Architecture

## 1. System Overview

### Architectural Approach
This solution implements a production-grade, monolithic application deployment on Kubernetes, decomposed into three distinct tiers: **Frontend**, **Backend**, and **Database**. The architecture prioritizes **High Availability (HA)**, **Zero-Downtime Updates**, and **Defense-in-Depth Security**.

*   **Deployment Strategy**: We utilize the **RollingUpdate** strategy for stateless components (Frontend/Backend). This ensures that new versions are gradually rolled out while old versions remain active, guaranteeing zero service interruption.
*   **State Management**: PostgreSQL is managed via a **StatefulSet** to ensure stable network identities and persistent storage, which allows for safe data management compared to ephemeral Pods.
*   **Security Model**: A **Zero-Trust** network model is enforced using NetworkPolicies, allowing only explicit traffic flows. Containers run with restricted privileges (non-root) to minimize the attack surface.

### High-Level Workflow
1.  **Ingress Layer**: External traffic hits the NGINX Ingress Controller.
2.  **Frontend Tier**: Traffic is routed to the `frontend` Service, load-balancing across 3+ React Pods serving static assets via NGINX.
3.  **Backend Tier**: The Frontend communicates with the `backend` Service (Django/Gunicorn).
4.  **Data Tier**: The Backend communicates with the `postgres` Service. Access is strictly controlled via NetworkPolicies.

---

## 2. Configuration Guide

### Environment Preparation
*   **Kubernetes Cluster**: Version 1.25+ is recommended.
*   **Ingress Controller**: An NGINX Ingress Controller must be installed in the cluster.
*   **Storage Class**: A default StorageClass must be present for PVC provisioning.

### Prerequisite Checks
Ensure the following tools are installed:
*   `kubectl` configured with cluster admin access.
*   `docker` (if building images locally).

### Installation & Setup
1.  **Create Namespace**: Isolate resources.
    ```bash
    kubectl apply -f infra/k8s/namespaces/app.yaml
    ```
2.  **Apply Governance**: Set quotas and limits.
    ```bash
    kubectl apply -f infra/k8s/namespaces/resource-quota.yaml
    ```
3.  **Configure Network Security**: Apply deny-all and allow rules.
    ```bash
    kubectl apply -f infra/k8s/network-policy.yaml
    ```
4.  **Deploy Database**:
    ```bash
    kubectl apply -f infra/k8s/db/secret.yaml
    kubectl apply -f infra/k8s/db/service.yaml
    kubectl apply -f infra/k8s/db/statefulset.yaml
    ```
5.  **Run Migrations**: Ensure schema is ready.
    ```bash
    kubectl apply -f infra/k8s/backend/job-migrate.yaml
    ```
6.  **Deploy Backend**:
    ```bash
    kubectl apply -f infra/k8s/backend/secret.yaml
    kubectl apply -f infra/k8s/backend/configmap.yaml
    kubectl apply -f infra/k8s/backend/deployment.yaml
    kubectl apply -f infra/k8s/backend/service.yaml
    kubectl apply -f infra/k8s/pdb.yaml # Backend PDB
    kubectl apply -f infra/k8s/backend/hpa.yaml # (If created)
    ```
7.  **Deploy Frontend**:
    ```bash
    kubectl apply -f infra/k8s/frontend/configmap-nginx.yaml
    kubectl apply -f infra/k8s/frontend/deployment.yaml
    kubectl apply -f infra/k8s/frontend/service.yaml
    kubectl apply -f infra/k8s/pdb.yaml # Frontend PDB
    ```
8.  **Configure Ingress**:
    ```bash
    kubectl apply -f infra/k8s/ingress/ingress.yaml
    ```

---

## 3. Configuration Details

### Deployment Strategy (RollingUpdate)
*   **`maxSurge: 1`**:
    *   *Purpose*: Allows 1 extra Pod to be created above the desired replica count during updates.
    *   *Scenario*: Essential for maintaining capacity while starting new versions.
*   **`maxUnavailable: 0`**:
    *   *Purpose*: Ensures NO Pods are taken down until new ones are Ready.
    *   *Scenario*: Critical for **Zero-Downtime** guarantees.

### Probes & Lifecycle
*   **`startupProbe`** (Backend):
    *   *Purpose*: Gives the application time to initialize (e.g., load cache/models) without failing liveness checks.
    *   *Value*: `failureThreshold: 30` * `periodSeconds: 10` = 300s grace period.
*   **`livenessProbe`**:
    *   *Purpose*: Restarts the container if the application deadlocks or crashes.
*   **`readinessProbe`**:
    *   *Purpose*: Removes the Pod from the Service endpoint list if it cannot serve traffic (e.g., overloaded).
*   **`preStop` Hook**:
    *   *Command*: `sh -c "sleep 10"`
    *   *Purpose*: Keeps the Pod alive to allow the Load Balancer to drain connections gracefully before `SIGTERM`.

### Security Context
*   **`runAsUser: 1000` / `runAsGroup: 3000`**:
    *   *Security*: Runs the process as a non-root user to prevent privilege escalation attacks.
*   **`allowPrivilegeEscalation: false`**:
    *   *Security*: Prevents the child process from gaining more privileges than the parent.
*   **`readOnlyRootFilesystem: true`** (Frontend):
    *   *Security*: Makes the container immutable, preventing malware from persisting or modifying system files.

### Network Policies
*   **`default-deny-all`**:
    *   *Purpose*: Drops all traffic by default. This is the "Zero Trust" baseline.
*   **`allow-frontend-to-backend`**:
    *   *Purpose*: Explicitly permits TCP traffic on port 8000 from pods labeled `app: frontend` to `app: backend`.

### Governance
*   **`ResourceQuota`**:
    *   *Limit*: `requests.cpu: "4"`, `requests.memory: 8Gi`.
    *   *Purpose*: Prevents the `app` namespace from starving other tenants in the cluster.
*   **`PodDisruptionBudget`**:
    *   *Value*: `minAvailable: 1`.
    *   *Purpose*: Ensures at least one replica remains available during voluntary node drains (e.g., cluster upgrades).

---

## 4. Troubleshooting Section

### Scenario 1: Pods Stuck in `Pending`
*   **Symptom**: `kubectl get pods` shows status `Pending`.
*   **Cause**:
    *   Insufficient cluster resources (CPU/Memory).
    *   **ResourceQuota** exceeded for the namespace.
*   **Resolution**:
    *   Check Quota: `kubectl describe resourcequota -n app`.
    *   Check Nodes: `kubectl describe nodes` to see available capacity.

### Scenario 2: 502 Bad Gateway
*   **Symptom**: User receives 502 errors when accessing the application.
*   **Cause**:
    *   Backend Service has no endpoints (all pods failed readiness).
    *   NetworkPolicy is blocking Ingress -> Frontend or Frontend -> Backend traffic.
    *   Application crashed immediately after startup.
*   **Resolution**:
    *   Check Endpoints: `kubectl get endpoints backend -n app`.
    *   Check Logs: `kubectl logs -l app=backend -n app`.
    *   Verify NetworkPolicy allowing Ingress traffic.

### Scenario 3: `CrashLoopBackOff` on Database
*   **Symptom**: Postgres pod restarts continuously.
*   **Cause**:
    *   Incorrect permissions on the Persistent Volume.
    *   Liveness probe failure (command incorrect or timeout).
*   **Resolution**:
    *   Check previous logs: `kubectl logs postgres-0 -n app --previous`.
    *   Verify `securityContext` fsGroup matches the volume permissions.

---

## 5. Operational Considerations

### Performance
*   **Resource Tuning**:
    *   Monitor CPU throttling. If high, increase `limits.cpu`.
    *   Monitor OOMKills. If frequent, increase `limits.memory`.
*   **Scaling**:
    *   Configure HPA to scale based on `cpu` or custom metrics (request rate) rather than just memory, which is often sticky in Python apps.

### Maintenance
*   **Database Backups**:
    *   The StatefulSet configuration assumes persistent storage, but backups are external. Implement a CronJob to run `pg_dump` and push to S3.
*   **Rolling Restarts**:
    *   To reload config/secrets without code changes: `kubectl rollout restart deployment/backend -n app`.

### Monitoring Recommendations
*   **Prometheus**: Enable scraping via annotations `prometheus.io/scrape: "true"`.
*   **Key Metrics**:
    *   **USE Method**: Utilization, Saturation, Errors.
    *   **RED Method**: Rate, Errors, Duration (Latency).

---

## 6. Validation Procedures

### Configuration Verification
1.  **Verify Quotas**:
    ```bash
    kubectl get resourcequota -n app
    ```
2.  **Verify Policies**:
    ```bash
    kubectl get networkpolicies -n app
    ```

### Health Check Procedures
1.  **Check Pod Status**:
    ```bash
    kubectl get pods -n app -o wide
    ```
    *Expectation*: All pods `Running` (3/3 for deployments).
2.  **Check Service Connectivity**:
    *   Exec into a Frontend pod and curl the Backend:
    ```bash
    kubectl exec -it <frontend-pod> -n app -- curl -v http://backend:8000/healthz
    ```

### Testing Methodology
1.  **Zero-Downtime Test**:
    *   Run a load generator (e.g., `hey` or `k6`) against the ingress URL.
    *   Trigger a rollout: `kubectl rollout restart deployment/backend -n app`.
    *   **Success Criteria**: Zero 502/503 errors during the rollout.
2.  **Disruption Test**:
    *   Attempt to drain a node hosting app pods.
    *   **Success Criteria**: PDB prevents draining if it would violate `minAvailable`.

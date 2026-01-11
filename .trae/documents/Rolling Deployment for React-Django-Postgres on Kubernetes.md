## Folder Structure

- docker/
  - frontend/Dockerfile
  - backend/Dockerfile
- k8s/
  - namespaces/app.yaml
  - ingress/ingress.yaml
  - frontend/
    - deployment.yaml
    - service.yaml
    - configmap-nginx.yaml
  - backend/
    - deployment.yaml
    - service.yaml
    - secret.yaml
    - configmap.yaml
    - job-migrate.yaml
  - db/
    - statefulset.yaml
    - service.yaml
    - secret.yaml

## Dockerfiles

### docker/frontend/Dockerfile

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . ./
RUN npm run build

FROM nginx:1.25-alpine
COPY k8s/frontend/configmap-nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### docker/backend/Dockerfile

```dockerfile
FROM python:3.11-slim
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . ./
EXPOSE 8000
CMD ["gunicorn", "app.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3"]
```

## Kubernetes Manifests

### k8s/namespaces/app.yaml
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: app
```

### k8s/frontend/configmap-nginx.yaml
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: frontend-nginx-config
  namespace: app
data:
  default.conf: |
    server {
      listen 80;
      server_name _;
      root /usr/share/nginx/html;
      index index.html;
      location / {
        try_files $uri $uri/ /index.html;
      }
    }
```

### k8s/frontend/deployment.yaml
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: app
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
        - name: frontend
          image: your-registry/frontend:1.0.0
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 80
          livenessProbe:
            httpGet:
              path: /
              port: 80
            initialDelaySeconds: 10
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /
              port: 80
            initialDelaySeconds: 5
            periodSeconds: 10
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 256Mi
```

### k8s/frontend/service.yaml
```yaml
apiVersion: v1
kind: Service
metadata:
  name: frontend
  namespace: app
spec:
  type: ClusterIP
  selector:
    app: frontend
  ports:
    - port: 80
      targetPort: 80
```

### k8s/backend/secret.yaml
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: backend-secret
  namespace: app
type: Opaque
stringData:
  DJANGO_SECRET_KEY: change-me
  DATABASE_PASSWORD: change-me
```

### k8s/backend/configmap.yaml
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: backend-config
  namespace: app
data:
  DATABASE_HOST: postgres
  DATABASE_NAME: app
  DATABASE_USER: app
  DJANGO_ALLOWED_HOSTS: "*"
  DJANGO_DEBUG: "false"
```

### k8s/backend/deployment.yaml
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: app
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
        - name: backend
          image: your-registry/backend:1.0.0
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 8000
          env:
            - name: DJANGO_SECRET_KEY
              valueFrom:
                secretKeyRef:
                  name: backend-secret
                  key: DJANGO_SECRET_KEY
            - name: DATABASE_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: backend-secret
                  key: DATABASE_PASSWORD
            - name: DATABASE_HOST
              valueFrom:
                configMapKeyRef:
                  name: backend-config
                  key: DATABASE_HOST
            - name: DATABASE_NAME
              valueFrom:
                configMapKeyRef:
                  name: backend-config
                  key: DATABASE_NAME
            - name: DATABASE_USER
              valueFrom:
                configMapKeyRef:
                  name: backend-config
                  key: DATABASE_USER
            - name: DJANGO_ALLOWED_HOSTS
              valueFrom:
                configMapKeyRef:
                  name: backend-config
                  key: DJANGO_ALLOWED_HOSTS
            - name: DJANGO_DEBUG
              valueFrom:
                configMapKeyRef:
                  name: backend-config
                  key: DJANGO_DEBUG
          livenessProbe:
            httpGet:
              path: /healthz
              port: 8000
            initialDelaySeconds: 15
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /healthz
              port: 8000
            initialDelaySeconds: 5
            periodSeconds: 10
          resources:
            requests:
              cpu: 200m
              memory: 256Mi
            limits:
              cpu: 1
              memory: 512Mi
```

### k8s/backend/service.yaml
```yaml
apiVersion: v1
kind: Service
metadata:
  name: backend
  namespace: app
spec:
  type: ClusterIP
  selector:
    app: backend
  ports:
    - port: 8000
      targetPort: 8000
```

### k8s/backend/job-migrate.yaml
```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: backend-migrate
  namespace: app
spec:
  backoffLimit: 1
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: migrate
          image: your-registry/backend:1.0.0
          imagePullPolicy: IfNotPresent
          env:
            - name: DJANGO_SECRET_KEY
              valueFrom:
                secretKeyRef:
                  name: backend-secret
                  key: DJANGO_SECRET_KEY
            - name: DATABASE_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: backend-secret
                  key: DATABASE_PASSWORD
            - name: DATABASE_HOST
              valueFrom:
                configMapKeyRef:
                  name: backend-config
                  key: DATABASE_HOST
            - name: DATABASE_NAME
              valueFrom:
                configMapKeyRef:
                  name: backend-config
                  key: DATABASE_NAME
            - name: DATABASE_USER
              valueFrom:
                configMapKeyRef:
                  name: backend-config
                  key: DATABASE_USER
          command: ["python", "manage.py", "migrate", "--noinput"]
```

### k8s/db/secret.yaml
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: postgres-secret
  namespace: app
type: Opaque
stringData:
  POSTGRES_PASSWORD: change-me
```

### k8s/db/service.yaml
```yaml
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: app
spec:
  clusterIP: None
  selector:
    app: postgres
  ports:
    - port: 5432
      targetPort: 5432
```

### k8s/db/statefulset.yaml
```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: app
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  updateStrategy:
    type: OnDelete
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
        - name: postgres
          image: postgres:16-alpine
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 5432
          env:
            - name: POSTGRES_USER
              value: app
            - name: POSTGRES_DB
              value: app
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgres-secret
                  key: POSTGRES_PASSWORD
          volumeMounts:
            - name: data
              mountPath: /var/lib/postgresql/data
          livenessProbe:
            exec:
              command: ["bash", "-c", "pg_isready -U $POSTGRES_USER -d $POSTGRES_DB"]
            initialDelaySeconds: 20
            periodSeconds: 10
          readinessProbe:
            exec:
              command: ["bash", "-c", "pg_isready -U $POSTGRES_USER -d $POSTGRES_DB"]
            initialDelaySeconds: 10
            periodSeconds: 10
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 10Gi
```

### k8s/ingress/ingress.yaml
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
  namespace: app
  annotations:
    kubernetes.io/ingress.class: nginx
spec:
  rules:
    - host: example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: frontend
                port:
                  number: 80
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: backend
                port:
                  number: 8000
```

## Separate Deployment Commands

- Frontend only
  - kubectl apply -f k8s/namespaces/app.yaml
  - kubectl apply -n app -f k8s/frontend
  - kubectl apply -n app -f k8s/ingress
- Backend only
  - kubectl apply -f k8s/namespaces/app.yaml
  - kubectl apply -n app -f k8s/backend/secret.yaml
  - kubectl apply -n app -f k8s/backend/configmap.yaml
  - kubectl apply -n app -f k8s/backend/job-migrate.yaml
  - kubectl apply -n app -f k8s/backend
- Database only
  - kubectl apply -f k8s/namespaces/app.yaml
  - kubectl apply -n app -f k8s/db

## How Rolling Deployment Works

- Deployments replace Pods gradually by creating new replicas while keeping existing replicas serving traffic. Readiness probes gate traffic to new Pods until they are healthy.
- maxSurge: 1 creates one extra Pod beyond desired replicas during rollout. maxUnavailable: 0 ensures no reduction in available replicas, enabling zero-downtime updates.
- Service endpoints shift to ready Pods automatically, so clients continue to connect without interruption.

## Why Preferred in Production

- Minimizes downtime and risk by incremental replacement.
- Enables quick rollback when health degrades by reverting to the previous ReplicaSet.
- Works well for stateless services where instances are fungible.

## Limitations and Migrations for Monoliths

- Database schema changes are stateful and not safely hot-swapped. Use backward-compatible, two-step migrations: deploy schema additions first, keep old code paths working, then remove deprecated columns in a later release.
- Run migrations as a separate pre-deploy Job using the same backend image tag. Ensure migrations complete successfully before the backend Deployment rolls.
- Avoid destructive changes in a single release. If unavoidable, plan maintenance windows and backups. StatefulSet uses OnDelete to prevent unintended automatic DB restarts.

## Separation of Concerns

- Frontend serves static assets and calls only the backend via the Ingress path /api.
- Backend communicates only with the postgres Service using environment variables and Secrets for authentication.

## Notes for Local Development

- Keep Docker Compose for local iteration, mirroring environment variables and ports. Images built locally can be pushed to your registry with tags used in manifests to simulate production rollouts.
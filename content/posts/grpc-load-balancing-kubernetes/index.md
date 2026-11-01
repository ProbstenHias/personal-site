---
title: "gRPC load balancing in Kubernetes, with and without a mesh"
date: 2026-10-18
tldr: "A Kubernetes Service balances connections, not requests. gRPC keeps one HTTP/2 connection open, so without a mesh every request lands on the same pod. We learned this when a rollout overloaded one receiver, and turning on Istio fixed it."
summary: "A new service sent thousands of gRPC requests per second and overloaded a single pod of the receiver. The cause: Istio was not on for the receiver yet. Switch the mode and watch the counters."
tags: [kubernetes, grpc, istio, networking]
---

## What happened

We rolled out a new service. It calls another service over gRPC, thousands of requests per second. The moment the rollout started, the receiver fell over. It had several replicas, but one of them took all the traffic.

We found the cause quickly: the Istio service mesh was not enabled for the receiver yet. We turned it on, and the load spread out immediately.

The surprising part was not the fix. It was that none of us knew this could happen. On our platform the mesh is on by default, so we had never seen gRPC traffic without it.

## Why it happens

{{< demo >}}

A Kubernetes Service is implemented by `kube-proxy` at layer 4. It picks a backend pod when a TCP connection opens, and after that the connection is pinned to that pod.

gRPC runs over HTTP/2, and HTTP/2 sends every call over **one long-lived connection**. So the pod is chosen once, and every request that follows goes to the same place. More replicas do not help, because the client never opens a second connection.

A mesh proxy like Istio's understands HTTP/2. It looks at each request and picks a pod again every time.

## The options, and what we picked

1. **Client-side balancing.** A headless Service (`clusterIP: None`) returns every pod IP, and the gRPC client balances with `round_robin`. Not acceptable for us: on our platform, services stay simple and focus on business logic. Load balancing is a platform concern, so no service should have to implement it.
2. **Connection age limits.** Set `MaxConnectionAge` on the server so that clients reconnect and land on other pods from time to time. This would have worked, but it is a blunt tool and we already had something better.
3. **A service mesh.** The proxy balances each request, and the services do not change. We already run Istio, so this was the obvious choice. The real fix was to make sure it is on for every service.

## The lesson

If gRPC traffic is unbalanced in Kubernetes, check first whether the mesh is really on for both sides. A Service alone balances connections, not requests.

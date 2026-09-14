FROM quay.io/keycloak/keycloak:26.0.0 AS builder

ENV KC_HTTP_ENABLED=true
ENV KC_HEALTH_ENABLED=true
ENV KC_METRICS_ENABLED=false
ENV KC_PROXY_HEADERS=xforwarded

# Pre-build Keycloak so the heavy build step runs at IMAGE BUILD TIME
# (not at container startup), saving RAM on the free hosting tier
RUN /opt/keycloak/bin/kc.sh build

# ── Runtime image ──────────────────────────────────────────────────────
FROM quay.io/keycloak/keycloak:26.0.0

COPY --from=builder /opt/keycloak/ /opt/keycloak/

ENV KC_HTTP_ENABLED=true
ENV KC_HTTP_HOST=0.0.0.0
ENV KC_PROXY_HEADERS=xforwarded
ENV KC_HOSTNAME_STRICT=false

EXPOSE 8080

ENTRYPOINT ["/opt/keycloak/bin/kc.sh", "start", "--optimized"]


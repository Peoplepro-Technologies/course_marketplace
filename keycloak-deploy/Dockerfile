FROM quay.io/keycloak/keycloak:26.0.0 AS builder

ENV KC_HEALTH_ENABLED=true
ENV KC_METRICS_ENABLED=false

# Pre-build Keycloak image
RUN /opt/keycloak/bin/kc.sh build

# ── Runtime image ──────────────────────────────────────────────────────
FROM quay.io/keycloak/keycloak:26.0.0

COPY --from=builder /opt/keycloak/ /opt/keycloak/

ENV KC_HTTP_ENABLED=true
ENV KC_HTTP_HOST=0.0.0.0
ENV KC_PROXY_HEADERS=xforwarded
ENV KC_HOSTNAME_STRICT=false

EXPOSE 8080

ENTRYPOINT ["/opt/keycloak/bin/kc.sh"]
CMD ["start", "--http-enabled=true", "--hostname-strict=false", "--proxy-headers=xforwarded"]


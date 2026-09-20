FROM quay.io/keycloak/keycloak:26.0.0

ENV KC_HEALTH_ENABLED=true
ENV KC_METRICS_ENABLED=false
ENV KC_HTTP_ENABLED=true
ENV KC_HTTP_HOST=0.0.0.0
ENV KC_PROXY_HEADERS=xforwarded
ENV KC_HOSTNAME_STRICT=false

# Build Keycloak directly in the image layer so the build state is 100% preserved
RUN /opt/keycloak/bin/kc.sh build --http-enabled=true --http-host=0.0.0.0 --proxy-headers=xforwarded

EXPOSE 8080

ENTRYPOINT ["/opt/keycloak/bin/kc.sh"]
CMD ["start-dev", "--http-host=0.0.0.0"]


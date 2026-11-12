FROM --platform=$BUILDPLATFORM ghcr.io/gohugoio/hugo:v0.169.0 AS build
USER root
WORKDIR /src
COPY . .
RUN hugo --gc --minify

FROM ghcr.io/static-web-server/static-web-server:2.44.2
COPY --from=build /src/public /public
COPY sws.toml /etc/sws.toml
ENV SERVER_CONFIG_FILE=/etc/sws.toml
ENV SERVER_ROOT=/public \
    SERVER_PORT=8080 \
    SERVER_ERROR_PAGE_404=/public/404.html \
    SERVER_COMPRESSION=true
USER 65532:65532
EXPOSE 8080

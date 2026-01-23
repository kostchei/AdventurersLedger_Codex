FROM alpine:latest

# Define PocketBase version
# Check https://github.com/pocketbase/pocketbase/releases for the latest version
ARG PB_VERSION=0.22.21

RUN apk add --no-cache \
    unzip \
    ca-certificates \
    wget \
    libc6-compat

WORKDIR /pb

# Download and install PocketBase
RUN wget https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip \
    && unzip pocketbase_${PB_VERSION}_linux_amd64.zip \
    && rm pocketbase_${PB_VERSION}_linux_amd64.zip \
    && chmod +x pocketbase

EXPOSE 8090

# Start PocketBase
CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8090"]

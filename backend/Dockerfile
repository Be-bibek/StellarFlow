# Builder Stage
FROM rust:1.80-slim-bookworm AS builder

# Install build dependencies
RUN apt-get update && \
    apt-get install -y pkg-config libssl-dev cmake git clang && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# Copy the source code
COPY . .

# Build the release binary
RUN cargo build --release --bin stellarflow-backend

# Runtime Stage
FROM debian:bookworm-slim

# Install runtime dependencies (OpenSSL, CA certs)
RUN apt-get update && \
    apt-get install -y ca-certificates libssl3 && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the compiled binary from the builder
COPY --from=builder /usr/src/app/target/release/stellarflow-backend /app/stellarflow-backend

# Ensure the binary is executable
RUN chmod +x /app/stellarflow-backend

# Expose the default port (Railway will override via PORT)
EXPOSE 8080

# Run the backend
CMD ["./stellarflow-backend"]

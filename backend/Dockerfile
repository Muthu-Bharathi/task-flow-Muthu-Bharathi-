FROM golang:1.22-alpine AS builder

WORKDIR /app
COPY go.mod ./
COPY . .

# tidy and vendor or just tidy and build
RUN go mod tidy
RUN CGO_ENABLED=0 GOOS=linux go build -o taskflow main.go

FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/taskflow .
COPY --from=builder /app/migrations ./migrations

EXPOSE 4000

CMD ["./taskflow"]

# LiveKit Cloud worker image. The browser bridge remains local and is not put in this image.
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim
WORKDIR /app
COPY pyproject.toml ./
RUN uv sync --no-dev --no-install-project
COPY agent ./agent
COPY .env.example ./
CMD ["uv", "run", "python", "agent/agent.py", "start"]

# Minimal image for the JARVIS REST API.
# The core has no dependencies, so the base Python image is all we need.
FROM python:3.12-slim

WORKDIR /app

# Copy project metadata first for better layer caching, then install.
COPY pyproject.toml README.md ./
COPY jarvis ./jarvis
RUN pip install --no-cache-dir .

# Optional provider extras — uncomment to bake them in:
# RUN pip install --no-cache-dir ".[all]"

EXPOSE 8080

# Default to the offline Echo provider so the container runs with no secrets.
ENV JARVIS_LLM__PROVIDER=echo

CMD ["jarvis-serve", "--host", "0.0.0.0", "--port", "8080"]

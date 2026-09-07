/** Server-sent events helper with heartbeats and safe JSON framing. */
export function openStream(res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders?.();

  const heartbeat = setInterval(() => {
    if (!res.writableEnded) res.write(': ping\n\n');
  }, 15000);

  let closed = false;
  const send = (event, data) => {
    if (closed || res.writableEnded) return;
    res.write(`event: ${event}\ndata: ${JSON.stringify(data ?? {})}\n\n`);
  };
  const close = () => {
    if (closed) return;
    closed = true;
    clearInterval(heartbeat);
    if (!res.writableEnded) res.end();
  };

  res.on('close', () => {
    closed = true;
    clearInterval(heartbeat);
  });

  return { send, close, isClosed: () => closed };
}

/** Wrap a streaming handler so every failure reaches the client as an event. */
export async function streamHandler(res, fn) {
  const stream = openStream(res);
  try {
    await fn(stream);
  } catch (err) {
    stream.send('error', {
      message: err?.message || 'Something went wrong.',
      status: err?.status ?? 500,
      retryable: Boolean(err?.retryable),
    });
  } finally {
    stream.close();
  }
}

/** Throttle partial updates so the browser is not flooded. */
export function throttle(fn, ms = 70) {
  let last = 0;
  let pending = null;
  let timer = null;
  return (...args) => {
    pending = args;
    const now = Date.now();
    if (now - last >= ms) {
      last = now;
      fn(...pending);
      pending = null;
      return;
    }
    if (!timer) {
      timer = setTimeout(() => {
        timer = null;
        if (pending) {
          last = Date.now();
          fn(...pending);
          pending = null;
        }
      }, ms - (now - last));
    }
  };
}

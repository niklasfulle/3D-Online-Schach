# Stockfish integration

The server uses the `stockfish` npm package (Stockfish.js 18.0.8) and starts its
single-threaded Lite UCI engine as a separate child process. The application
communicates with the worker over stdin/stdout and does not load the engine into
the Fastify request process.

Stockfish.js is licensed under GPL-3.0. See the [upstream repository](https://github.com/nmrugg/stockfish.js)
and its [license text](https://github.com/nmrugg/stockfish.js/blob/master/Copying.txt).
Before distributing the server, a container, or a bundled product, review the
GPL-3.0 obligations for that exact distribution and include the required notices
and corresponding source. This note is an engineering record, not legal advice.

The worker path targets the package's `stockfish-18-lite-single.js` artifact
directly, so the optional postinstall symlink to the default engine is not
required.

Resource limits are configurable on the server:

| Environment variable | Default | Accepted range | Purpose |
| --- | ---: | ---: | --- |
| `STOCKFISH_WORKER_COUNT` | `1` | 1–4 | Maximum concurrent engine processes; each uses one thread. |
| `STOCKFISH_MAX_QUEUED_REQUESTS` | `16` | 0–128 | Bounded waiting queue; excess work is rejected as at capacity. |
| `STOCKFISH_SEARCH_TIME_MS` | `750` | 50–5000 | Maximum UCI search time per move. |
| `STOCKFISH_RESPONSE_TIMEOUT_MS` | `20000` | 100–30000 | UCI response deadline; must exceed the configured search time. |

Each worker is recycled after a timeout or process failure so stale UCI output
cannot be mistaken for a later move. Invalid or terminal FEN positions are
rejected before reaching a worker.

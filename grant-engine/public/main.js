/** Served build: the interface driven by the engine server over HTTP. */
import { startApp } from './app.js';
import { serverTransport } from './transport-server.js';

startApp(serverTransport);

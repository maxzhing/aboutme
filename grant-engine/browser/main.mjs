/** Single-file build: the interface driven by the engine running in this page. */
import { startApp } from '../public/app.js';
import { localTransport } from './transport-local.mjs';

startApp(localTransport);

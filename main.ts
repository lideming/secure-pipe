import { App } from "./app.ts";
import { HttpServer } from "./http.ts";

var app = new App();

new HttpServer(app).run();

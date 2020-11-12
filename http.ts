import { Application, Router } from "./deps.ts";
import { App } from "./app.ts"
import { config } from "./config.ts";

export class HttpServer {
    oak = new Application();
    router = new Router();

    constructor(readonly app: App) {
        this.addRoutes();
        this.addMiddlewares();

        this.oak.addEventListener('listen', (ev) => {
            console.info(`HTTP server is listening on ${ev.hostname}:${ev.port}`);
        });
        this.oak.addEventListener('error', (ev) => {
            console.error("HTTP server error", ev.error);
        });
    }

    private addMiddlewares() {
        this.oak.use(async (ctx, next) => {
            // console.info("request", ctx.request.url);
            await next();
        });
        this.oak.use(this.router.routes());
    }

    private addRoutes() {
        this.router
            .get('/', (ctx) => {
                ctx.respond = true;
                ctx.response.body = "The secure-pipe service is running.";
            })
            .put('/:pipe', async (ctx) => {
                const pipeName = ctx.params.pipe;
                if (!pipeName) throw new Error("No pipe name");

                const pipe = this.app.pipes.getPipe(pipeName);


                const reader = await ctx.request.body({ type: "reader" }).value;
                try {
                    await pipe.copyFromReader(reader);
                } catch (error) {
                    console.warn("pipe writer", error);
                } finally {
                    this.app.pipes.removePipe(pipeName);
                }
            })
            .get('/:pipe', async (ctx) => {
                const pipeName = ctx.params.pipe;
                if (!pipeName) throw new Error("No pipe name");

                console.log(this.app);
                ctx.respond = true;
                ctx.response.type = "raw";
                ctx.response.body = this.app.pipes.getPipe(pipeName);
            })
    }

    run() {
        this.oak.listen(config.listen);
    }
}

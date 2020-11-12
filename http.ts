import { Application, Router, RouterContext, Status } from "./deps.ts";
import { randomName } from "./util.ts";
import { App } from "./app.ts"
import { config } from "./config.ts";

export class HttpServer {
    oak = new Application({ proxy: config.behindProxy });
    router = new Router();

    constructor(readonly app: App) {
        this.addRoutes();
        this.addMiddlewares();

        this.oak.addEventListener('listen', (ev) => {
            console.info(`HTTP server is listening on http://${ev.hostname}:${ev.port}`);
        });
        this.oak.addEventListener('error', (ev) => {
            console.error("HTTP server error", ev.error);
        });
    }

    private addMiddlewares() {
        if (config.verbose) {
            this.oak.use(async (ctx, next) => {
                console.info("request", ctx.request);
                await next();
            });
        }
        this.oak.use(this.router.routes());
    }

    private addRoutes() {
        this.router
            .get('/', (ctx) => {
                ctx.respond = true;
                const baseUrl = config.overrideBaseUrl ||
                    ((config.overrideProto || ctx.request.url.protocol) + '//' + ctx.request.url.host);
                ctx.response.body = config.welcomeMessage(baseUrl, randomName(10));
            })
            .put('/:pipe', this.writerHandler)
            .get('/:pipe', this.readerHandler)
    }

    writerHandler = async (ctx: RouterContext) => {
        const pipeName = ctx.params.pipe;
        if (!pipeName) throw new Error("No pipe name");

        ctx.respond = true;
        const pipe = this.app.pipes.getPipe(pipeName);
        try {
            const reader = await ctx.request.body({ type: "reader" }).value;
            await pipe.copyFromReader(reader);
            ctx.response.status = Status.OK;
            ctx.response.body = { status: ctx.response.status };
        } catch (error) {
            config.verbose && console.warn("pipe writer", error);
            // (issue in oak or std?) The server will stuck without this line:
            ctx.request.serverRequest.conn.close();
        } finally {
            if (pipe.close())
                this.app.pipes.removePipe(pipeName);
        }
    };

    readerHandler = async (ctx: RouterContext) => {
        const pipeName = ctx.params.pipe;
        if (!pipeName) throw new Error("No pipe name");
        const pipe = this.app.pipes.getPipe(pipeName);

        ctx.respond = true;
        ctx.response.type = "raw";
        ctx.response.body = pipe;
        try {
            await ctx.request.serverRequest.respond(await ctx.response.toServerResponse());
        } finally {
            if (pipe.close())
                this.app.pipes.removePipe(pipeName);
        }
    };

    run() {
        this.oak.listen(config.listen);
    }
}

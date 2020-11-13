import { Application, Router, RouterContext, Status } from "./deps.ts";
import { randomName } from "./util.ts";
import { App } from "./app.ts"
import { config } from "./config.ts";
import { NormalError, PipeError } from "./errors.ts";

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
        this.oak.use(async (ctx, next) => {
            try {
                await next();
            } catch (error) {
                if (error instanceof NormalError) {
                    console.log("warning: " + error.message);
                    ctx.respond = true;
                    ctx.response.status = Status.BadRequest;
                    ctx.response.type = "text";
                    ctx.response.body = error.toString();
                } else {
                    throw error;
                }
            }
        })
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
            .post('/:pipe', this.writerHandler)
            .get('/:pipe', this.readerHandler)
    }

    writerHandler = async (ctx: RouterContext) => {
        const pipeName = ctx.params.pipe;
        if (!pipeName) throw new NormalError("No pipe name");
        const pipe = this.app.pipes.getPipe(pipeName);
        if (!pipe) throw new NormalError("Can not get the specified pipe");

        const pipeStream = await pipe.connectWriter();

        try {
            const reader = await ctx.request.body({ type: "reader" }).value;
            await pipeStream.copyFromReader(reader);
            ctx.respond = true;
            ctx.response.status = Status.OK;
            ctx.response.body = { status: ctx.response.status };
        } catch (error) {
            config.verbose && console.warn("pipe writer", error);
            // throw error;
        } finally {
            pipe.close();
            ctx.request.serverRequest.conn.close();
            // (https://github.com/denoland/deno/issues/8364)
        }
    };

    readerHandler = async (ctx: RouterContext) => {
        const pipeName = ctx.params.pipe;
        if (!pipeName) throw new NormalError("No pipe name");

        const action = ctx.request.url.searchParams.get("action");
        if (action == "status") {
            ctx.respond = true;
            ctx.response.type = "json";
            ctx.response.body = this.app.pipes.getPipeStatus(pipeName);
        } else if (action == null) {
            const pipe = this.app.pipes.getPipe(pipeName);
            if (!pipe) throw new NormalError("Can not get the specified pipe");

            const stream = await pipe.connectReader();

            try {
                ctx.respond = true;
                ctx.response.type = "raw";
                ctx.response.body = stream;
                await ctx.request.serverRequest.respond(await ctx.response.toServerResponse());
            } finally {
                pipe.close();
            }
        } else {
            throw new NormalError("Unknown action param value");
        }
    };

    run() {
        this.oak.listen(config.listen);
    }
}

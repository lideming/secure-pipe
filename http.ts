import { Application, Router, RouterContext, Status } from "./deps.ts";
import { encode, randomName } from "./util.ts";
import { App, PipeService } from "./app.ts"
import { config } from "./config.ts";
import { NormalError, PipeError } from "./errors.ts";
import { LoopbackStream, Pipe } from "./pipe.ts";

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

    run() {
        this.oak.listen(config.listen);
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
            .all('/:pipe', async (ctx) => {
                const pipeName = ctx.params.pipe;
                if (!pipeName) throw new NormalError("No pipe name");
                if (!PipeService.isValidName(pipeName)) throw new NormalError("Invalid pipe name");
                const method = ctx.request.method;
                const action = ctx.request.url.searchParams.get("action");

                if (method == "PUT" || method == "POST") {
                    if (action == null) {
                        const pipe = this.app.pipes.getPipe(pipeName);
                        if (!pipe) throw new NormalError("Can not get the specified pipe");
                        await this.handleWritePipe(pipe, ctx);
                    } else if (method == "POST" && action == "close") {
                        const pipe = this.app.pipes.getPipe(pipeName, false);
                        pipe?.close("manually closed");
                        ctx.response.body = "OK";
                    }
                } else if (method == "GET") {
                    if (action == "status") {
                        ctx.respond = true;
                        ctx.response.type = "json";
                        ctx.response.body = this.app.pipes.getPipeStatus(pipeName);
                    } else if (action == null) {
                        const pipe = this.app.pipes.getPipe(pipeName);
                        if (!pipe) throw new NormalError("Can not get the specified pipe");
                        await this.handleReadPipe(pipe, ctx);
                    } else {
                        throw new NormalError("Unknown action");
                    }
                } else {
                    throw new NormalError("Unsupported HTTP method");
                }
            })
    }

    private async handleWritePipe(pipe: Pipe, ctx: RouterContext) {
        const connecting = pipe.connectWriter();
        const feedback = await this.createFeedbackStream(ctx);
        if (pipe.state != "connectted") {
            await feedback.write("Waiting for reader...");
        }
        const stream = await connecting;
        await feedback.write("Connectted.");

        try {
            const reader = await ctx.request.body({ type: "reader" }).value;
            try {
                await stream.copyFromReader(reader);
            } catch (error) {
                if (error instanceof PipeError) {
                    await feedback.write("The reader has closed the pipe.");
                } else {
                    throw error;
                }
            }
            await feedback.write(`Transferred ${stream.transferred} bytes.`);
        } catch (error) {
            config.verbose && console.warn("pipe writer", error);
            // throw error;
        } finally {
            feedback.stream.close();
            pipe.close();
            // ctx.request.serverRequest.conn.close();
            // (https://github.com/denoland/deno/issues/8364)
        }
    }

    private async handleReadPipe(pipe: Pipe, ctx: RouterContext) {
        const stream = await pipe.connectReader();

        try {
            ctx.respond = true;
            ctx.response.type = "raw";
            ctx.response.body = stream;
            await ctx.request.serverRequest.respond(await ctx.response.toServerResponse());
        } finally {
            pipe.close();
        }
    }

    private async createFeedbackStream(ctx: RouterContext<Record<string | number, string | undefined>, Record<string, any>>) {
        const feedbackStream = new LoopbackStream();
        ctx.respond = true;
        ctx.response.status = Status.OK;
        ctx.response.type = "raw";
        ctx.response.body = feedbackStream;
        ctx.request.serverRequest.respond(await ctx.response.toServerResponse()).catch(e => {
            feedbackStream.close();
        });
        return {
            stream: feedbackStream,
            write: (text: string) => feedbackStream.write(encode(text + '\r\n'))
        };
    }
}

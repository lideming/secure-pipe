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

    private async handleWritePipe(pipe: Pipe, ctx: RouterContext<any, any, any>) {
        const connecting = pipe.connectWriter();
        let feedback: FeedbackStream | null = null;
        try {
            feedback = await this.createFeedbackStream(ctx);
            let stream: LoopbackStream;
            if (pipe.state != "connectted") {
                await feedback.write("Waiting for reader", false);
                (async () => {
                    while (true) {
                        await new Promise(r => setTimeout(r, 5000));
                        if (pipe.state != "no-reader") break;
                        try {
                            await feedback.write(".", false);
                        } catch (error) {
                            pipe.close();
                        }
                    }
                })();
                stream = await connecting;
                await feedback.write("\r\nConnectted.");
            } else {
                stream = await connecting;
                await feedback.write("Connectted.");
            }

            const reader = await ctx.request.body({ type: "reader" }).value;
            // TODO: handle form-data
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
            feedback?.stream.close();
            pipe.close();
            // ctx.request.serverRequest.conn.close();
            // (https://github.com/denoland/deno/issues/8364)
        }
    }

    private async handleReadPipe(pipe: Pipe, ctx: RouterContext<any, any, any>) {
        const stream = await pipe.connectReader();

        try {
            ctx.respond = false;
            ctx.response.type = "raw";
            ctx.response.body = stream;
            await ctx.request.originalRequest.respond(await ctx.response.toDomResponse());
        } finally {
            pipe.close();
        }
    }

    private async createFeedbackStream(ctx: RouterContext<any, any, any>) {
        const stream = new LoopbackStream();
        ctx.respond = false;
        ctx.response.status = Status.OK;
        ctx.response.type = "raw";
        ctx.response.body = stream;
        ctx.request.originalRequest.respond(await ctx.response.toDomResponse()).catch(e => {
            stream.close();
        });
        return new FeedbackStream(stream);
    }
}

class FeedbackStream {
    constructor(readonly stream: LoopbackStream) { }
    write(text: string, newLine = true) {
        return this.stream.write(encode(text + (newLine ? '\r\n' : '')))
    }
}

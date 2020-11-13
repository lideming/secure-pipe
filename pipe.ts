import { PipeService } from "./app.ts";
import { config } from "./config.ts";
import { deferred, Deferred } from "./deps.ts";
import { PipeError } from "./errors.ts";


export class Pipe {
    constructor(readonly service: PipeService, readonly name: string) {
    }

    private _stream?: LoopbackStream = undefined;
    get stream() {
        if (!this._stream) this._stream = new LoopbackStream();
        return this._stream;
    }

    private _state: "none" | "no-reader" | "no-writer" | "connectted" = "none";
    get state() { return this._state; }

    get transferred() { return this._stream?.transferred ?? 0; }

    private _whenConnectted = deferred<LoopbackStream>();

    connectWriter() {
        return this.connect(false);
    }

    connectReader() {
        return this.connect(true);
    }

    connect(isReader: boolean) {
        if (this._state == "connectted") {
            throw new PipeError("The pipe is already connectted");
        } else if (isReader) {
            if (this._state == "no-writer") {
                throw new PipeError("The pipe reader is already connectted");
            } else if (this._state == "no-reader") {
                this._state = "connectted";
            } else {
                this._state = "no-writer";
            }
        } else { // is writer
            if (this._state == "no-reader") {
                throw new PipeError("The pipe writer is already connectted");
            } else if (this._state == "no-writer") {
                this._state = "connectted";
            } else {
                this._state = "no-reader";
            }
        }
        if (this._state == "connectted") {
            this._whenConnectted.resolve(this.stream);
        }
        return this._whenConnectted;
    }

    close() {
        this.stream.close();
        this.service.removePipe(this.name);
    }
}

export class LoopbackStream implements Deno.Reader {
    private reading?: Deferred<Uint8Array | null> = undefined;

    private writing?: Deferred<void> = undefined;
    private writingBuf?: Uint8Array = undefined;

    private state: "open" | "closed" = "open";
    private eofAcked = 0;

    private _transferred = 0;
    get transferred() { return this._transferred; }

    async copyFromReader(reader: Deno.Reader) {
        const buf = new Uint8Array(32768);
        while (true) {
            const nread = await reader.read(buf);
            if (!nread) {
                break;
            }
            await this.write(nread == buf.byteLength ? buf : buf.subarray(0, nread));
        }
    }

    write(buf: Uint8Array) {
        config.verbose && console.debug("pipe write begin", buf.byteLength);
        if (this.state == "closed") throw new PipeError("Pipe closed");
        this.writing = deferred();
        config.verbose && this.writing.then(r => console.debug("pipe write end"));
        this.writingBuf = buf;
        this._transferred += buf.byteLength;
        if (this.reading) {
            this.reading.resolve(buf);
            this.reading = undefined;
        }
        return this.writing;
    }

    read(p: Uint8Array): Promise<number | null>;
    read(): Promise<Uint8Array | null>;

    read(p?: Uint8Array) {
        if (config.verbose) {
            console.debug("pipe read begin");
            return this._read(p).then(r => (console.debug("pipe read end", r), r));
        } else {
            return this._read(p);
        }
    }

    private _read(p?: Uint8Array): Promise<Uint8Array | number | null> {
        if (p) {
            if (this.state != "open" || this.writing) {
                return Promise.resolve(this._readAvailableIntoBuf(p));
            }
            return (this.reading = deferred()).then(() => {
                return this._readAvailableIntoBuf(p);
            });
        }

        if (this.state != "open") return Promise.resolve(this.eofOrThrow());

        if (this.writing) {
            return Promise.resolve(this.writingBuf!);
        } else {
            return (this.reading = deferred());
        }
    }

    private _readAvailableIntoBuf(p: Uint8Array) {
        if (this.state != "open") return this.eofOrThrow();

        let len = Math.min(this.writingBuf!.byteLength, p.byteLength);
        if (len === this.writingBuf!.byteLength) {
            p.set(this.writingBuf!);
            this.endRead();
        } else {
            p.set(this.writingBuf!.subarray(0, len));
            this.writingBuf = this.writingBuf!.subarray(len);
        }
        return len;
    }

    private eofOrThrow(): null | never {
        if (this.eofAcked++ > 10) {
            throw new PipeError("Pipe closed");
        }
        return null;
    }

    endRead() {
        this.writing!.resolve();
        this.writing = this.writingBuf = undefined;
    }

    close() {
        if (this.state == "closed") return false;
        this.state = "closed";
        if (this.reading) {
            this.reading.resolve(null);
            this.reading = undefined;
        }
        if (this.writing) {
            this.writing!.reject(new PipeError("Pipe closed"));
        }
        this.reading = undefined;
        this.writing = this.writingBuf = undefined;
        return true;
    }
}

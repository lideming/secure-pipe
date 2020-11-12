import { config } from "./config.ts";
import { deferred, Deferred } from "./deps.ts";

export class Pipe implements Deno.Reader {
    private reading?: Deferred<Uint8Array | null> = undefined;

    private writing?: Deferred<void> = undefined;
    private writingBuf?: Uint8Array = undefined;

    private state: "open" | "closed" = "open";
    private eofAcked = 0;

    constructor(readonly name: string) {
    }

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
        if (this.state == "closed") throw new Error("Pipe closed");
        this.writing = deferred();
        config.verbose && this.writing.then(r => console.debug("pipe write end"));
        this.writingBuf = buf;
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
            if (this.state != "open") {
                return Promise.resolve(this.eofOrThrow());
            }
            return (async () => {
                if (!this.writing) {
                    await (this.reading = deferred());
                }
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
            })();
        }

        if (this.state != "open") return Promise.resolve(this.eofOrThrow());

        if (this.writing) {
            return Promise.resolve(this.writingBuf!);
        } else {
            return (this.reading = deferred());
        }
    }

    private eofOrThrow(): null | never {
        if (this.eofAcked++ > 10) {
            throw new Error("Pipe closed");
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
            this.writing!.reject("Pipe closed");
        }
        this.reading = undefined;
        this.writing = this.writingBuf = undefined;
        return true;
    }
}

import { Pipe } from "./pipe.ts";

export class App {
    readonly pipes = new PipeService();
}

export class PipeService {
    private readonly pipes = new Map<string, Pipe>();


    getPipe(name: string, allowCreate: false): Pipe | null;
    getPipe(name: string, allowCreate?: true): Pipe;
    getPipe(name: string, allowCreate = true) {
        let pipe = this.pipes.get(name);
        if (!pipe && allowCreate) {
            pipe = new Pipe(name);
            this.pipes.set(name, pipe);
        }
        return pipe ?? null as any;
    }

    removePipe(name: string) {
        return this.pipes.delete(name);
    }
}

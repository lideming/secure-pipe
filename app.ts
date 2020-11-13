import { Pipe } from "./pipe.ts";

export class App {
    readonly pipes = new PipeService();
}

export class PipeService {
    private readonly pipes = new Map<string, Pipe>();


    getPipe(name: string, allowCreate = true): Pipe | null {
        if (!PipeService.isValidName(name)) return null;
        let pipe = this.pipes.get(name);
        if (!pipe && allowCreate) {
            pipe = new Pipe(this, name);
            this.pipes.set(name, pipe);
        }
        return pipe ?? null as any;
    }

    getPipeStatus(name: string) {
        const pipe = this.getPipe(name, false);
        return {
            state: pipe?.state ?? "none",
            transferred: pipe?.transferred ?? 0
        };
    }

    removePipe(name: string) {
        return this.pipes.delete(name);
    }

    static isValidName(name: string) {
        return name.length > 0 && /[a-zA-Z]/.test(name[0]);
    }
}

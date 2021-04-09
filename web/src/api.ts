export const api = new class Api {
    getPipeUrl(pipeName: string) {
        return '/' + pipeName;
    }
    async readPipe(pipeName: string) {
        var resp = await fetch(this.getPipeUrl(pipeName));
        return resp.body;
    }
}

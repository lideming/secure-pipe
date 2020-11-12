export const config = {
    listen: '127.0.0.1:5005',

    behindProxy: false,
    overrideProto: 'https:',
    overrideBaseUrl: '',

    verbose: false,

    welcomeMessage: (baseUrl: string, generatedName: string) => `
The Secure-Pipe Service

Usage:

(sender shell) Read a file and send it to the pipe
$ cat somefile | curl -T- ${baseUrl}/<pipe_name>

(receiver shell) Receive the content from the pipe.
$ curl ${baseUrl}/<pipe_name> | tee somefile

You can also open the URL in the browser to receive it.


Randomly generated pipe name: ${generatedName}

Sender curl:
curl -T- ${baseUrl}/${generatedName}

Receiver curl:
curl ${baseUrl}/${generatedName}

`
};

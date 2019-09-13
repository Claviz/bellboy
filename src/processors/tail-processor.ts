import path from 'path';
import { Readable } from 'stream';

import { ITailProcessorConfig, processStream } from '../types';
import { DirectoryProcessor } from './base/directory-processor';

const Tail = require('tail').Tail;

export class TailProcessor extends DirectoryProcessor {

    protected fromBeginning: boolean;

    constructor(config: ITailProcessorConfig) {
        super(config);
        this.fromBeginning = !!config.fromBeginning;
    }

    async process(processStream: processStream) {
        const readStream = new Readable({
            objectMode: true,
            read() { },
        });
        const tails = [];
        for (const file of this.files) {
            const filePath = path.join(this.path, file);
            const tail = new Tail(filePath, {
                fromBeginning: this.fromBeginning,
            });
            tail.on('line', (data: any) => {
                readStream.push({ file, data });
            });
            tail.on('error', (exception: any) => {
                readStream.emit('error', exception);
            });
            tails.push(tail);
        };
        await processStream(readStream);
        tails.forEach(tail => tail.unwatch());
    }
}

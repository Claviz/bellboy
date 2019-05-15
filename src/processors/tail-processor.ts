import path from 'path';
import { Stream } from 'stream';

import { emit, ITailProcessorConfig, processStream } from '../types';
import { DirectoryProcessor } from './base/directory-processor';

const Tail = require('tail').Tail;

export class TailProcessor extends DirectoryProcessor {

    protected fromBeginning: boolean;

    constructor(config: ITailProcessorConfig) {
        super(config);
        this.fromBeginning = !!config.fromBeginning;
    }

    async process(processStream: processStream, emit: emit) {
        const readStream = new Stream.Readable({
            objectMode: true,
            read() { },
        }).pause();
        const tails = [];
        for (const file of this.files) {
            const filePath = path.join(this.path, file);
            await emit('processingFile', file, filePath);
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
            await emit('processedFile', file, filePath);
        };
        await processStream(readStream);
        tails.forEach(tail => tail.unwatch());
    }
}

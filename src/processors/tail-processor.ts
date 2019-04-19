import fs from 'fs';
import path from 'path';

import { DirectoryProcessor } from './internal/directory-processor';
import { ITailConfig } from '../types';
import { Processor } from './internal/processor';
import { Stream } from 'stream';

const JSONStream = require('JSONStream');
const Tail = require('tail').Tail;

export class TailProcessor extends DirectoryProcessor {
    /** @internal */
    protected config: ITailConfig;

    constructor(config: ITailConfig) {
        super(config);
        this.config = config;
    }

    async process() {
        await super.process();
        await super.emit('startProcessing');
        const readStream = new Stream.Readable({
            objectMode: true,
            read() { },
        }).pause();
        const tails = [];
        for (const file of this.config.files!) {
            const filePath = path.join(this.config.path, file);
            await super.emit('processingFile', file, filePath);
            const tail = new Tail(filePath, {
                fromBeginning: this.config.fromBeginning,
            });
            tail.on('line', (data: any) => {
                readStream.push({ file, data });
            });
            tail.on('error', (exception: any) => {
                readStream.emit('error', exception);
            });
            tails.push(tail);
            await super.emit('processedFile', file, filePath);
        };
        await super.processStream(readStream);
        tails.forEach(tail => tail.unwatch());
        await super.emit('endProcessing');
    }
}

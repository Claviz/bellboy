import fs from 'fs';
import path from 'path';
import { emit, IDelimitedProcessorConfig, processStream } from '../types';
import { DirectoryProcessor } from './base/directory-processor';

const split2 = require('split2');

export class DelimitedProcessor extends DirectoryProcessor {

    protected delimiter: string;

    constructor(config: IDelimitedProcessorConfig) {
        super(config);
        if (!config.delimiter) {
            throw new Error('No delimiter specified.');
        }
        this.delimiter = config.delimiter;
    }

    async process(processStream: processStream, emit: emit) {
        for (const file of this.files) {
            const filePath = path.join(this.path, file);
            await emit('processingFile', file, filePath);
            const readStream = fs.createReadStream(filePath).pipe(split2(this.delimiter)).pause();
            await processStream(readStream);
            await emit('processedFile', file, filePath);
        };
    }
}

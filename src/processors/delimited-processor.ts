import fs from 'fs';
import path from 'path';

import { IDelimitedProcessorConfig, processStream } from '../types';
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

    async process(processStream: processStream) {
        for (const file of this.files) {
            const filePath = path.join(this.path, file);
            const fileReadStream = fs.createReadStream(filePath);
            const readStream = fileReadStream.pipe(split2(this.delimiter)).pause();
            readStream.on('close', function () {
                fileReadStream.destroy()
            });
            await processStream(readStream, file, filePath);
        };
    }
}

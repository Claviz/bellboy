import fs from 'fs';
import path from 'path';

import { IJsonConfig } from '../types';
import { DirectoryProcessor } from './internal/directory-processor';

const JSONStream = require('JSONStream');

export class JsonProcessor extends DirectoryProcessor {
    /** @internal */
    protected config: IJsonConfig;

    constructor(config: IJsonConfig) {
        super(config);
        this.config = config;
    }

    async process() {
        await super.process();
        if (!this.config.jsonPath) {
            throw new Error('No JSON path specified.');
        }
        await super.emit('startProcessing');
        for (const file of this.config.files!) {
            const filePath = path.join(this.config.path, file);
            await super.emit('processingFile', file, filePath);
            const readStream = fs.createReadStream(filePath).pipe(JSONStream.parse(this.config.jsonPath));
            readStream.pause();
            await super.processStream(readStream);
            await super.emit('processedFile', file, filePath);
        };
        await super.emit('startProcessing');
    }
}

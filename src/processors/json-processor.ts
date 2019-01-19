import fs from 'fs';
import path from 'path';

import { IJsonConfig } from '../interfaces/destination';
import { DirectoryProcessor } from './directory-processor';

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
        await super.emit('processingDirectory');
        for (const file of this.config.files!) {
            await super.emit('processingFile', file);
            const readStream = fs.createReadStream(path.join(this.config.path, file)).pipe(JSONStream.parse(this.config.jsonPath));
            readStream.pause();
            await super.processStream(readStream);
            await super.emit('processedFile', file);
        };
        await super.emit('processedDirectory');
    }
}

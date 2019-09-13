import fs from 'fs';
import path from 'path';

import { IJsonProcessorConfig, processStream } from '../types';
import { getReadableJsonStream } from '../utils';
import { DirectoryProcessor } from './base/directory-processor';

const JSONStream = require('JSONStream');

export class JsonProcessor extends DirectoryProcessor {

    protected jsonPath: string;

    constructor(config: IJsonProcessorConfig) {
        super(config);
        if (!config.jsonPath) {
            throw new Error('No JSON path specified.');
        }
        this.jsonPath = config.jsonPath;
    }

    async process(processStream: processStream) {
        for (const file of this.files) {
            const filePath = path.join(this.path, file);
            const fileReadStream = fs.createReadStream(filePath);
            const readableJsonStream = getReadableJsonStream(fileReadStream.pipe(JSONStream.parse(this.jsonPath)));
            await processStream(readableJsonStream, file, filePath);
            fileReadStream.destroy();
        };
    }
}

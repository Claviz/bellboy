import fs from 'fs';
import path from 'path';
import { pick } from 'stream-json/filters/Pick';
import { parser } from 'stream-json/Parser';
import { streamArray } from 'stream-json/streamers/StreamArray';

import { IJsonProcessorConfig, processStream } from '../types';
import { getValueFromJSONChunk } from '../utils';
import { DirectoryProcessor } from './base/directory-processor';

export class JsonProcessor extends DirectoryProcessor {

    protected jsonPath: RegExp | undefined;

    constructor(config: IJsonProcessorConfig) {
        super(config);
        this.jsonPath = config.jsonPath;
    }

    async process(processStream: processStream) {
        for (const file of this.files) {
            const filePath = path.join(this.path, file);
            const stream = fs.createReadStream(filePath)
                .pipe(parser())
                .pipe(pick({ filter: this.jsonPath || '' }))
                .pipe(streamArray())
                .pipe(getValueFromJSONChunk());

            await processStream(stream, file, filePath);
        };
    }
}

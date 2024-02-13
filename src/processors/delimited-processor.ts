import { parse } from 'csv-parse';
import fs from 'fs';
import path from 'path';
import iconv from 'iconv-lite';

import { IDelimitedProcessorConfig, processStream } from '../types';
import { getDelimitedGenerator } from '../utils';
import { DirectoryProcessor } from './base/directory-processor';

export class DelimitedProcessor extends DirectoryProcessor {
    protected rowSeparator: string;
    protected hasHeader: boolean;
    protected delimiter?: string;
    protected qualifier?: string;
    protected encoding?: string;

    constructor(config: IDelimitedProcessorConfig) {
        super(config);
        if (!config.rowSeparator) {
            throw new Error('No rowSeparator specified.');
        }
        this.rowSeparator = config.rowSeparator;
        this.hasHeader = !!config.hasHeader;
        this.delimiter = config.delimiter;
        this.qualifier = config.qualifier;
        this.encoding = config.encoding;
    }

    async process(processStream: processStream) {
        for (const file of this.files) {
            const filePath = path.join(this.path, file);
            const fileReadStream = fs.createReadStream(filePath);
            const streamToParse = this.encoding ? fileReadStream.pipe(iconv.decodeStream(this.encoding)) : fileReadStream;
            const parser = parse({
                quote: this.qualifier,
                delimiter: this.delimiter,
                record_delimiter: this.rowSeparator,
                raw: true,
                relax_quotes: true,
                relax_column_count: true,
            });
            const readStream = streamToParse.pipe(parser);
            const generator = getDelimitedGenerator({
                hasHeader: this.hasHeader,
                readStream,
            });
            await processStream(generator(), file, filePath);
            fileReadStream.destroy();
        };
    }
}

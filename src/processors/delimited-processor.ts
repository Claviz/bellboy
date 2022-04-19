import { parse } from 'csv-parse';
import fs from 'fs';
import path from 'path';

import { IDelimitedProcessorConfig, processStream } from '../types';
import { getDelimitedGenerator } from '../utils';
import { DirectoryProcessor } from './base/directory-processor';

export class DelimitedProcessor extends DirectoryProcessor {

    protected rowSeparator: string;
    protected hasHeader: boolean;
    protected delimiter?: string;
    protected qualifier?: string;

    constructor(config: IDelimitedProcessorConfig) {
        super(config);
        if (!config.rowSeparator) {
            throw new Error('No rowSeparator specified.');
        }
        this.rowSeparator = config.rowSeparator;
        this.hasHeader = !!config.hasHeader;
        this.delimiter = config.delimiter;
        this.qualifier = config.qualifier;
    }

    async process(processStream: processStream) {
        for (const file of this.files) {
            const filePath = path.join(this.path, file);
            const fileReadStream = fs.createReadStream(filePath);
            const parser = parse({
                quote: this.qualifier,
                delimiter: this.delimiter,
                record_delimiter: this.rowSeparator,
                raw: true,
                relax_quotes: true,
                relax_column_count: true,
            });
            const readStream = fileReadStream.pipe(parser);
            const generator = getDelimitedGenerator({
                hasHeader: this.hasHeader,
                readStream,
            });
            await processStream(generator(), file, filePath);
            fileReadStream.destroy();
        };
    }
}

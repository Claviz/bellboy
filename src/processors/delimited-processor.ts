import fs from 'fs';
import path from 'path';

import { IDelimitedProcessorConfig, processStream } from '../types';
import { getDelimitedGenerator } from '../utils';
import { DirectoryProcessor } from './base/directory-processor';

const split2 = require('split2');

export class DelimitedProcessor extends DirectoryProcessor {

    protected rowSeparator: string;
    protected hasHeader: boolean;
    protected delimiter?: string;
    protected qualifier?: string;
    protected trimQualifier: boolean = false;

    constructor(config: IDelimitedProcessorConfig) {
        super(config);
        if (!config.rowSeparator) {
            throw new Error('No rowSeparator specified.');
        }
        this.rowSeparator = config.rowSeparator;
        this.hasHeader = !!config.hasHeader;
        this.trimQualifier = !!config.trimQualifier;
        this.delimiter = config.delimiter;
        this.qualifier = config.qualifier;
    }

    async process(processStream: processStream) {
        for (const file of this.files) {
            const filePath = path.join(this.path, file);
            const fileReadStream = fs.createReadStream(filePath);
            const readStream = fileReadStream.pipe(split2(this.rowSeparator));
            const generator = getDelimitedGenerator({
                delimiter: this.delimiter,
                hasHeader: this.hasHeader,
                qualifier: this.qualifier,
                readStream,
                trimQualifier: this.trimQualifier,
            });
            await processStream(generator(), file, filePath);
            fileReadStream.destroy();
        };
    }
}

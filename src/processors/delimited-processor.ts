import fs from 'fs';
import path from 'path';

import { IDelimitedProcessorConfig, processStream } from '../types';
import { DirectoryProcessor } from './base/directory-processor';

const split2 = require('split2');

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
            const readStream = fileReadStream.pipe(split2(this.rowSeparator));
            let header: string[] = [];
            const splitRegExp = new RegExp(`${this.delimiter}(?=(?:(?:[^${this.qualifier}]*${this.qualifier}){2})*[^${this.qualifier}]*$)`);
            const processRow = (row: any) => {
                let arr: string[] = [];
                if (this.qualifier) {
                    arr = row.split(splitRegExp);
                } else {
                    arr = row.split(this.delimiter);
                }
                if (this.hasHeader && !header.length) {
                    header = arr.map((x: string) => x.trim());
                } else {
                    let obj;
                    if (header.length) {
                        obj = Object.fromEntries(header.map((x: any, i: any) => [x, arr[i]]));
                    }
                    return { header, arr, obj, row };
                }
            }
            const generator = async function* () {
                for await (const row of readStream) {
                    const result = processRow(row);
                    if (result) {
                        yield result;
                    }
                }
            }
            await processStream(generator(), file, filePath);
            fileReadStream.destroy();
        };
    }
}

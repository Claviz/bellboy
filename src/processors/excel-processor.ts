import fs from 'fs';
import path from 'path';

import { IExcelConfig } from '../types';
import { DirectoryProcessor } from './internal/directory-processor';

const excel = require('ek-excel-stream')

export class ExcelProcessor extends DirectoryProcessor {
    /** @internal */
    protected config: IExcelConfig;

    constructor(config: IExcelConfig) {
        super(config);
        this.config = config;
    }

    /** @internal */
    private toColumnName(num: number) {
        for (var ret = '', a = 1, b = 26; (num -= a) >= 0; a = b, b *= 26) {
            ret = String.fromCharCode((num % b) / a + 65) + ret;
        }
        return ret;
    }

    async process() {
        await super.process();
        for (let file of this.config.files!) {
            await super.emit('processingFile', file);
            const readStream = fs.createReadStream(path.join(this.config.path, file)).pipe(excel({
                headers: this.config.hasHeader,
                ignoreEmpty: true,
                discardUnmappedColumns: true,
            }, this.config.hasHeader ? null : (x: any) => {
                let transformed: any = {};
                for (let k in x) {
                    transformed[this.toColumnName(Number(k) + 1)] = x[k];
                }
                return transformed;
            })).pause();
            if (this.config.skipRows) {
                for (let i = 0; i < this.config.skipRows; i++) {
                    await super.getNextRecord(readStream);
                }
            }
            await super.processStream(readStream);
            await super.emit('processedFile', file);
        }
    }
}

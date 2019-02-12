import path from 'path';
import { getXlsxStream } from 'xlstream';

import { IExcelConfig } from '../types';
import { DirectoryProcessor } from './internal/directory-processor';

export class ExcelProcessor extends DirectoryProcessor {
    /** @internal */
    protected config: IExcelConfig;

    constructor(config: IExcelConfig) {
        super(config);
        this.config = config;
    }

    async process() {
        await super.process();
        for (let file of this.config.files!) {
            await super.emit('processingFile', file);
            const readStream = await getXlsxStream({
                filePath: path.join(this.config.path, file),
                sheet: this.config.sheetName ?
                    this.config.sheetName :
                    this.config.sheetIndex ? this.config.sheetIndex : 0,
                withHeader: this.config.hasHeader,
                ignoreEmpty: true,
            });
            if (this.config.skipRows) {
                for (let i = 0; i < this.config.skipRows; i++) {
                    await super.getNextRecord(readStream as any);
                }
            }
            await super.processStream(readStream as any);
            await super.emit('processedFile', file);
        }
    }
}

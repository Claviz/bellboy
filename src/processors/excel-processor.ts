import path from 'path';
import { getXlsxStream, getWorksheets } from 'xlstream';

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
        await super.emit('startProcessing');
        for (let file of this.config.files!) {
            const filePath = path.join(this.config.path, file);
            await super.emit('processingFile', file, filePath);
            let sheet;
            if (this.config.sheetName) {
                sheet = this.config.sheetName;
            } else if (this.config.sheetIndex) {
                sheet = this.config.sheetIndex;
            } else if (this.config.sheetGetter) {
                const sheets = await getWorksheets({
                    filePath,
                });
                sheet = await this.config.sheetGetter(sheets);
            }
            const readStream = await getXlsxStream({
                filePath,
                sheet: sheet ? sheet : 0,
                withHeader: this.config.hasHeader,
                ignoreEmpty: true,
            });
            if (this.config.skipRows) {
                for (let i = 0; i < this.config.skipRows; i++) {
                    await super.getNextRecord(readStream as any);
                }
            }
            await super.processStream(readStream as any);
            await super.emit('processedFile', file, filePath);
        }
        await super.emit('endProcessing');
    }
}

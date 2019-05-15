import path from 'path';
import { getXlsxStream, getWorksheets } from 'xlstream';

import { DirectoryProcessor } from './base/directory-processor';
import { IExcelProcessorConfig, processStream, emit } from '../types';

export class ExcelProcessor extends DirectoryProcessor {

    protected hasHeader: boolean;
    protected sheetGetter: (filePath: string) => Promise<string | number>;

    constructor(config: IExcelProcessorConfig) {
        super(config);
        this.hasHeader = !!config.hasHeader;
        this.sheetGetter = async (filePath: string) => {
            if (config.sheetName) {
                return config.sheetName;
            } else if (config.sheetIndex) {
                return config.sheetIndex;
            } else if (config.sheetGetter) {
                const sheets = await getWorksheets({
                    filePath,
                });
                return await config.sheetGetter(sheets);
            }
            return 0;
        };
    }

    async process(processStream: processStream, emit: emit) {
        for (let file of this.files) {
            const filePath = path.join(this.path, file);
            await emit('processingFile', file, filePath);
            const readStream = await getXlsxStream({
                filePath,
                sheet: await this.sheetGetter(filePath),
                withHeader: this.hasHeader,
                ignoreEmpty: true,
            });
            await processStream(readStream as any);
            await emit('processedFile', file, filePath);
        }
    }
}

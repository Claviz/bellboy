import path from 'path';
import { getWorksheets, getXlsxStream } from 'xlstream';

import { IExcelProcessorConfig, processStream } from '../types';
import { DirectoryProcessor } from './base/directory-processor';

export class ExcelProcessor extends DirectoryProcessor {

    protected hasHeader: boolean;
    protected ignoreEmpty: boolean;
    protected sheetGetter: (filePath: string) => Promise<string | number>;

    constructor(config: IExcelProcessorConfig) {
        super(config);
        this.hasHeader = !!config.hasHeader;
        this.ignoreEmpty = config.ignoreEmpty === false ? false : true;
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

    async process(processStream: processStream) {
        for (let file of this.files) {
            const filePath = path.join(this.path, file);
            const readStream = await getXlsxStream({
                filePath,
                sheet: await this.sheetGetter(filePath),
                withHeader: this.hasHeader,
                ignoreEmpty: this.ignoreEmpty,
            });
            await processStream(readStream as any, file, filePath);
        }
    }
}

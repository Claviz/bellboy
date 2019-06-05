import path from 'path';
import { getXlsxStream } from 'xlstream';

import { IExcelProcessorConfig, processStream } from '../types';
import { DirectoryProcessor } from './base/directory-processor';

export class ExcelProcessor extends DirectoryProcessor {

    protected hasHeader: boolean;
    protected ignoreEmpty: boolean;
    protected sheets: (number | string)[];

    constructor(config: IExcelProcessorConfig) {
        super(config);
        this.hasHeader = !!config.hasHeader;
        this.ignoreEmpty = config.ignoreEmpty === false ? false : true;
        if (config.sheets && config.sheets.length) {
            this.sheets = config.sheets;
        } else {
            this.sheets = [0];
        }
    }

    async process(processStream: processStream) {
        for (let file of this.files) {
            const filePath = path.join(this.path, file);
            for (let i = 0; i < this.sheets.length; i++) {
                const readStream = await getXlsxStream({
                    filePath,
                    sheet: this.sheets[i],
                    withHeader: this.hasHeader,
                    ignoreEmpty: this.ignoreEmpty,
                });
                await processStream(readStream as any, file, filePath, this.sheets[i]);
            }
        }
    }
}

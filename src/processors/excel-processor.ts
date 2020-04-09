import path from 'path';
import { getWorksheets, getXlsxStream } from 'xlstream';

import { IExcelProcessorConfig, processStream, sheetGetter } from '../types';
import { DirectoryProcessor } from './base/directory-processor';

export class ExcelProcessor extends DirectoryProcessor {

    protected hasHeader: boolean;
    protected ignoreEmpty: boolean;
    protected fillMergedCells: boolean;
    protected sheets: (string | number)[] | sheetGetter;

    constructor(config: IExcelProcessorConfig) {
        super(config);
        this.hasHeader = !!config.hasHeader;
        this.ignoreEmpty = config.ignoreEmpty === false ? false : true;
        this.fillMergedCells = !!config.fillMergedCells;
        if (config.sheets) {
            this.sheets = config.sheets;
        } else {
            this.sheets = [0];
        }
    }

    async process(processStream: processStream) {
        for (let file of this.files) {
            const filePath = path.join(this.path, file);
            let sheets: (number | string)[] = [];
            if (this.sheets instanceof Function) {
                const allSheets = await getWorksheets({ filePath });
                sheets = await this.sheets(allSheets);
            } else {
                sheets = this.sheets;
            }
            for (let i = 0; i < sheets.length; i++) {
                const readStream = await getXlsxStream({
                    filePath,
                    sheet: sheets[i],
                    withHeader: this.hasHeader,
                    ignoreEmpty: this.ignoreEmpty,
                    fillMergedCells: this.fillMergedCells,
                });
                await processStream(readStream, file, filePath, sheets[i]);
            }
        }
    }
}

import { promises as fs } from 'fs';

import { DelimitedProcessor, Job } from '../src';
import { CustomDestination } from './helpers';

const filePath = 'test.txt';

beforeAll(async () => {
});

beforeEach(async () => {
});

afterEach(async () => {
    await fs.unlink(filePath);
});

afterAll(async () => {
});

it('reads data from file delimited by new lines', async () => {
    await fs.appendFile(filePath, 'First line\n');
    await fs.appendFile(filePath, 'Second line\n');
    const destination = new CustomDestination();
    const processor = new DelimitedProcessor({
        path: './',
        files: [filePath],
        rowSeparator: '\n',
        rowLimit: 2,
    });
    const job = new Job(processor, [destination]);
    await job.run();
    expect(destination.getData()).toEqual([
        { header: [], arr: ['First line'], obj: undefined, row: 'First line' },
        { header: [], arr: ['Second line'], obj: undefined, row: 'Second line' },
    ]);
});

it('reads data from file delimited by commas', async () => {
    await fs.appendFile(filePath, 'Hello, world!');
    const destination = new CustomDestination();
    const processor = new DelimitedProcessor({
        path: './',
        files: [filePath],
        rowSeparator: ',',
        rowLimit: 2,
    });
    const job = new Job(processor, [destination]);
    await job.run();
    expect(destination.getData()).toEqual([
        { header: [], arr: ['Hello'], obj: undefined, row: 'Hello' },
        { header: [], arr: [' world!'], obj: undefined, row: ' world!' },
    ]);
});

it('respects rowLimit', async () => {
    await fs.appendFile(filePath, '1\n');
    await fs.appendFile(filePath, '2\n');
    await fs.appendFile(filePath, '3\n');
    await fs.appendFile(filePath, '4\n');
    const destination = new CustomDestination();
    const processor = new DelimitedProcessor({
        path: './',
        files: [filePath],
        rowSeparator: '\n',
        rowLimit: 3,
    });
    const job = new Job(processor, [destination]);
    await job.run();
    expect(destination.getData()).toEqual([
        { header: [], arr: ['1'], obj: undefined, row: '1' },
        { header: [], arr: ['2'], obj: undefined, row: '2' },
        { header: [], arr: ['3'], obj: undefined, row: '3' },
    ]);
});

it('reads data from file with header', async () => {
    await fs.appendFile(filePath, 'Name,Age\n');
    await fs.appendFile(filePath, 'Bob,18\n');
    await fs.appendFile(filePath, 'Alice,22\n');
    const destination = new CustomDestination();
    const processor = new DelimitedProcessor({
        path: './',
        files: [filePath],
        rowSeparator: '\n',
        hasHeader: true,
        delimiter: ',',
    });
    const job = new Job(processor, [destination]);
    await job.run();
    expect(destination.getData()).toEqual([
        { header: ['Name', 'Age'], arr: ['Bob', '18'], obj: { Name: 'Bob', Age: '18' }, row: 'Bob,18' },
        { header: ['Name', 'Age'], arr: ['Alice', '22'], obj: { Name: 'Alice', Age: '22' }, row: 'Alice,22' },
    ]);
});

it('reads data from file with header and without delimiter', async () => {
    await fs.appendFile(filePath, 'Name\n');
    await fs.appendFile(filePath, 'Bob\n');
    await fs.appendFile(filePath, 'Alice\n');
    const destination = new CustomDestination();
    const processor = new DelimitedProcessor({
        path: './',
        files: [filePath],
        rowSeparator: '\n',
        hasHeader: true,
    });
    const job = new Job(processor, [destination]);
    await job.run();
    expect(destination.getData()).toEqual([
        { header: ['Name'], arr: ['Bob'], obj: { Name: 'Bob' }, row: 'Bob' },
        { header: ['Name'], arr: ['Alice'], obj: { Name: 'Alice' }, row: 'Alice' },
    ]);
});

it('reads data from file with qualifier', async () => {
    await fs.appendFile(filePath, '"Bob, the "HaCk3r"",Riga\n');
    await fs.appendFile(filePath, 'Alice,""Wonderland", Apt. 22"\n');
    const destination = new CustomDestination();
    const processor = new DelimitedProcessor({
        path: './',
        files: [filePath],
        rowSeparator: '\n',
        delimiter: ',',
        qualifier: '"',
    });
    const job = new Job(processor, [destination]);
    await job.run();
    expect(destination.getData()).toEqual([
        { header: [], arr: ['"Bob, the "HaCk3r""', 'Riga'], obj: undefined, row: '"Bob, the "HaCk3r"",Riga' },
        { header: [], arr: ['Alice', '""Wonderland", Apt. 22"'], obj: undefined, row: 'Alice,""Wonderland", Apt. 22"' },
    ]);
});
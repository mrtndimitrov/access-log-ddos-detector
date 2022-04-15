const fs = require('fs');
const glob = require('glob');
const path = require('path');
const async = require('async');
const { ProcessDataService } = require('./process-data-service');
const { DbService } = require('./db-service');

class FileWatcherService {
    filename = null;
    db = null;
    mongoFileData = null;
    fileStat = null;
    changeDetected = false;

    // filename can be a single file, directory or glob expression
    constructor(filename) {
        this.filename = filename;
        this.processFile();
    }

    async processFile() {
        this.db = await DbService.getInstance();
        // check if we had already watched before this file in MongoDb
        this.mongoFileData = await this.db.getFileData(this.filename);
        if (!this.mongoFileData) {
            console.info(`File ${this.filename} not in MongoDB. Inserting it.`);
            this.mongoFileData = {name: this.filename, read: 0};
            await this.db.insertFileData(this.mongoFileData);
        }
        this.fileStat = fs.lstatSync(this.filename);
        console.info(`Start watching file: ${this.filename}, with size: ${this.fileStat.size}, read so far: ${this.mongoFileData.read}`);
        // let's see if we have to read data
        if(this.fileStat.size > this.mongoFileData.read){
            console.info(`File ${this.filename} has grown since last end of program.`);
            this.readFromFile(this.mongoFileData.read, this.fileStat.size - this.mongoFileData.read, true);
        } else if (this.fileStat.size < this.mongoFileData.read) {
            console.info(`File ${this.filename} has shrunk since last end of program meaning it has been truncated. We need to read from start to its actual size now.`);
            this.readFromFile(0, this.fileStat.size, true);
        } else {
            // sizes are the same. skip the reading, start watching for changes
            this.watchForChanges();
        }
    }

    readFromFile(start, length, initial) {
        fs.open(this.filename, 'r', (err, fd) => {
            if (err) {
                console.error(`Opening file ${this.filename} for read failed.`);
                return;
            }
            const buffer = Buffer.alloc(length);
            let readSoFar = 0;
            const filename = this.filename;
            function doRead(callback) {
                console.info(`Start reading from file ${filename} at ${start}, length ${length}`);
                fs.read(fd, buffer, readSoFar, (length - readSoFar), start, (err, nread) => {
                    if (err) {
                        console.error(`Reading from file ${filename} failed.`);
                        return;
                    }
                    if (nread === 0) {
                        // we are at the end of the file. strange but maybe it was truncated at the moment we read.
                        fs.close(fd, function (err) {});
                        console.warn(`Reached file end before reading all data. file: ${filename}`);
                        // update the read length
                        length = readSoFar;
                        callback();
                    } else {
                        readSoFar += nread;
                        // ok, did we read the whole thing?
                        if (readSoFar < length) {
                            doRead(callback);
                        } else {
                            fs.close(fd, function (err) {});
                            callback();
                        }
                    }
                });
            }
            doRead(async () => {
                // ok, we have our buffer filled
                const data = buffer.toString('utf8');
                console.info(`Read from file ${this.filename}: ${data.length}`);
                await (new ProcessDataService()).parseLogEntry(data);
                // let's update the size of the read
                this.mongoFileData.read += length;
                await this.db.updateFileRead(this.mongoFileData._id, this.mongoFileData.read);
                if(initial) {
                    // now start watching for changes
                    this.watchForChanges();
                }
            });
        });
    }

    watchForChanges() {
        console.log(`Start watching: ${this.filename}`);
        fs.watch(this.filename, {}, (event, filename) => {
            if (this.changeDetected) {
                return;
            }
            if (event === 'change') {
                this.changeDetected = true;
                // let's wait for a second if there are other change events coming
                setTimeout(() => {
                    this.fileStat = fs.lstatSync(this.filename);
                    if(this.fileStat.size > this.mongoFileData.read){
                        this.readFromFile(this.mongoFileData.read, this.fileStat.size - this.mongoFileData.read, false);
                    }
                    this.changeDetected = false;
                }, 1000);
            }
        });
    }

    static parseFiles(argv, mainCallback) {
        let pathsToWatch = argv['log-path'] ? argv['log-path'] : [];
        if (!Array.isArray(pathsToWatch)) {
            pathsToWatch = [pathsToWatch];
        }
        if (argv.l) {
            if (Array.isArray(argv.l)) {
                pathsToWatch = pathsToWatch.concat(argv.l);
            } else {
                pathsToWatch.push(argv.l);
            }
        }
        const allFiles = [];
        async.each(pathsToWatch, (filename, callback) => {
            if(fs.existsSync(filename) && fs.lstatSync(filename).isDirectory()) {
                filename = path.join(filename, '*');
            }
            glob(filename, [], async (er, files) => {
                if(er) {
                    console.warn(`Error in glob "${er}". skipping argument.`);
                    callback();
                    return;
                }
                for (const file of files) {
                    if(!fs.existsSync(file)) {
                        console.warn(`File "${file}" does not exist. skipping.`);
                        continue;
                    }
                    // is this file in the list of files?
                    if(allFiles.indexOf(file) === -1){
                        allFiles.push(file);
                    }
                }
                callback();
            });
        }, () => {
            mainCallback(allFiles);
        });
    }
}
exports.FileWatcherService = FileWatcherService;

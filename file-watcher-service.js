const fs = require('fs');
const glob = require('glob');
const path = require('path');
const async = require('async');
const chokidar = require('chokidar');
const isGlob = require('is-glob');
const { ProcessDataService } = require('./process-data-service');
const { DbService } = require('./db-service');
const { DirWatcherService } = require('./dir-watcher-service');

const CHUNK_SIZE = 1024 * 1014 * 4;

class FileWatcherService {
    filename = null;
    db = null;
    mongoFileData = null;
    fileStat = null;
    leftOverString = '';

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

    // we have to read in chunks. otherwise the log file can be too large to handle in memory
    readFromFile(start, length, initial) {
        fs.open(this.filename, 'r', (err, fd) => {
            if (err) {
                console.error(`Opening file ${this.filename} for read failed.`);
                return;
            }

            this.doRead(fd, start, length, 0,async (actualReadSize) => {
                // let's update the size of the read
                this.mongoFileData.read += actualReadSize;
                await this.db.updateFileRead(this.mongoFileData._id, this.mongoFileData.read);
                if(initial) {
                    // now start watching for changes
                    this.watchForChanges();
                }
            });
        });
    }

    doRead(fd, start, length, readSoFar, callback) {
        const currentLength = (length - readSoFar) > CHUNK_SIZE ? CHUNK_SIZE : (length - readSoFar);
        const buffer = Buffer.alloc(currentLength);
        fs.read(fd, buffer, 0, currentLength, start + readSoFar, async (err, nread) => {
            if (err) {
                console.error(`Reading from file ${this.filename} failed.`);
                return;
            }
            if (nread === 0) {
                // we are at the end of the file. strange but maybe because it was truncated at the moment we read.
                fs.close(fd, function (err) {});
                console.warn(`Reached file end before reading all data. file: ${this.filename}`);
                callback(readSoFar);
            } else {
                const data = this.leftOverString + buffer.toString('utf8');
                console.info(`Read from file ${this.filename}: ${nread}`);
                this.leftOverString = await (new ProcessDataService()).parseLogEntry(data, this.filename);
                readSoFar += nread;
                // ok, did we read the whole thing?
                if (readSoFar < length) {
                    this.doRead(fd, start, length, readSoFar, callback);
                } else {
                    fs.close(fd, function (err) {});
                    callback(readSoFar);
                }
            }
        });
    }

    watchForChanges() {
        console.log(`Start watching: ${this.filename}`);
        chokidar.watch(this.filename).on('change', (filename, stats) => {
            this.fileStat = fs.lstatSync(this.filename);
            if(this.fileStat.size > this.mongoFileData.read){
                this.readFromFile(this.mongoFileData.read, this.fileStat.size - this.mongoFileData.read, false);
            }

        });
    }

    static parseFiles(argv, mainCallback) {
        let pathsToWatch = argv['path-watch'] ? argv['path-watch'] : [];
        if (!Array.isArray(pathsToWatch)) {
            pathsToWatch = [pathsToWatch];
        }
        if (argv.p) {
            if (Array.isArray(argv.p)) {
                pathsToWatch = pathsToWatch.concat(argv.p);
            } else {
                pathsToWatch.push(argv.p);
            }
        }
        const allFiles = [];
        async.each(pathsToWatch, (filename, callback) => {
            if(fs.existsSync(filename) && fs.lstatSync(filename).isDirectory()) {
                // we need to watch the dir for any new files
                new DirWatcherService(filename, '*', (newFileNameToWatch) => {
                    new FileWatcherService(newFileNameToWatch);
                });
                filename = path.join(filename, '*');
            } else if (isGlob(filename)) {
                // we need to watch the dir for new files that match the glob expression
                new DirWatcherService(path.dirname(filename), path.basename(filename), (newFileNameToWatch) => {
                    new FileWatcherService(newFileNameToWatch);
                });
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

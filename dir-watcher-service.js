const chokidar = require('chokidar');
const globToRegExp = require('glob-to-regexp');
const { FileWatcherService } = require("./file-watcher-service");

class DirWatcherService {
    constructor(dir, globExpression) {
        console.info(`Start watching directory ${dir} for new files with glob ${globExpression}`);
        const re = globToRegExp(globExpression);
        chokidar.watch(dir, {ignoreInitial: true}).on('add', (filename, stats) => {
            if(re.test(filename)){
                console.info(`New file ${filename} in directory ${dir}`);
                new FileWatcherService(filename);
            }
        });
    }
}
exports.DirWatcherService = DirWatcherService;

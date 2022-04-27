const chokidar = require('chokidar');
const globToRegExp = require('glob-to-regexp');

class DirWatcherService {
    constructor(dir, globExpression, onNewFile) {
        console.info(`Start watching directory ${dir} for new files with glob ${globExpression}`);
        const re = globToRegExp(globExpression);
        chokidar.watch(dir, {ignoreInitial: true}).on('add', (filename, stats) => {
            console.info(`New file ${filename} in directory ${dir}`);
            if(re.test(filename)){
                console.info(`Adding new file ${filename} to be watched`);
                onNewFile(filename);
            }
        });
    }
}
exports.DirWatcherService = DirWatcherService;

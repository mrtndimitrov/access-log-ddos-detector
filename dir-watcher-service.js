import chokidar from 'chokidar';
import globToRegExp from 'glob-to-regexp';
import path from 'path';

export class DirWatcherService {
    constructor(dir, globExpression, onNewFile) {
        console.info(`Start watching directory ${dir} for new files with glob ${globExpression}`);
        const re = globToRegExp(globExpression);
        chokidar.watch(dir, {ignoreInitial: true}).on('add', (filename, stats) => {
            console.info(`New file ${filename} in directory ${dir}`);
            if(re.test(path.basename(filename))){
                console.info(`Adding new file ${filename} to be watched`);
                onNewFile(filename);
            }
        });
    }
}

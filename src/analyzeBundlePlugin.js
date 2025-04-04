const fs = require('fs');
const path = require('path');
const Logger = require('./logger');
const {writeStats} = require('./statsUtils');

//分析打包资源大小插件
class AnalyzeBundlePlugin {

    constructor(opts = {}) {
        this.opts = {
            reportFilename: null,
            reportFilename: null,
            logLevel: 'info',
            ...opts,
        };

        this.logger = new Logger(this.opts.logLevel);
    }

    apply(compiler) {
        this.compiler = compiler;

        const done = (stats, callback) => {
            callback = callback || (() => { });

            const actions = [];

            actions.push(() => this.generateStatsFile(stats.toJson(this.opts.statsOptions)));

            if (actions.length) {
                // Making analyzer logs to be after all webpack logs in the console
                setImmediate(async () => {
                    try {
                        await Promise.all(actions.map(action => action()));
                        callback();
                    } catch (e) {
                        callback(e);
                    }
                });
            } else {
                callback();
            }
        };

        if (compiler.hooks) {
            compiler.hooks.done.tapAsync('webpack-analyze-bundel', done);
        } else {
            compiler.plugin('done', done);
        }
    }



    async generateStatsFile(stats) {
        const statsFilepath = path.resolve(this.compiler.outputPath, this.opts.statsFilename);
        await fs.promises.mkdir(path.dirname(statsFilepath), { recursive: true });

        try {
            await writeStats(stats, statsFilepath);

            this.logger.info(
                `${bold('Webpack Bundle Analyzer')} saved stats file to ${bold(statsFilepath)}`
            );
        } catch (error) {
            this.logger.error(
                `${bold('Webpack Bundle Analyzer')} error saving stats file to ${bold(statsFilepath)}: ${error}`
            );
        }
    }

}

module.exports = AnalyzeBundlePlugin
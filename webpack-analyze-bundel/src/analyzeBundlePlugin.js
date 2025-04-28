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

            actions.push(() => this.generateReport(stats.toJson()));

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

    getBundleDirFromCompiler() {
        if (typeof this.compiler.outputFileSystem.constructor === 'undefined') {
          return this.compiler.outputPath;
        }
        switch (this.compiler.outputFileSystem.constructor.name) {
          case 'MemoryFileSystem':
            return null;
          // Detect AsyncMFS used by Nuxt 2.5 that replaces webpack's MFS during development
          // Related: #274
          case 'AsyncMFS':
            return null;
          default:
            return this.compiler.outputPath;
        }
      }
    

    async generateReport(stats) {
        await this.generateJSONReport(stats, {
          reportFilename: path.resolve(this.compiler.outputPath, this.opts.reportFilename || 'report.json'),
          bundleDir: this.getBundleDirFromCompiler(),
          logger: this.logger,
          excludeAssets: this.opts.excludeAssets
        });
      }

      async generateJSONReport(bundleStats, opts) {
        const {reportFilename, bundleDir = null, logger = new Logger(), excludeAssets = null} = opts || {};
      
        const chartData = getChartData({logger, excludeAssets}, bundleStats, bundleDir);
      
        if (!chartData) return;
      
        await fs.promises.mkdir(path.dirname(reportFilename), {recursive: true});
        await fs.promises.writeFile(reportFilename, JSON.stringify(chartData));
      
        logger.info(`${bold('Webpack Bundle Analyzer')} saved JSON report to ${bold(reportFilename)}`);
      }

}

module.exports = AnalyzeBundlePlugin
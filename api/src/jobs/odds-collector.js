/**
 * 赔率采集定时任务
 * 每 2 分钟采集一次所有活跃比赛的 Polymarket 赔率
 */

const cron = require('node-cron');
const OddsCollectorService = require('../services/OddsCollectorService');

let isRunning = false;

/**
 * 执行赔率采集
 */
async function runOddsCollection() {
    if (isRunning) {
        console.log('Odds collection already running, skipping...');
        return;
    }

    isRunning = true;
    try {
        await OddsCollectorService.collectAllActiveGames();
    } catch (error) {
        console.error('Odds collection job error:', error.message);
    } finally {
        isRunning = false;
    }
}

/**
 * 执行数据清理 (每小时)
 */
async function runCleanup() {
    try {
        await OddsCollectorService.cleanOldRecords(48);
    } catch (error) {
        console.error('Odds cleanup job error:', error.message);
    }
}

/**
 * 启动赔率采集任务
 */
function startOddsCollector() {
    console.log('Starting odds collector job...');

    // 每 2 分钟采集一次
    cron.schedule('*/2 * * * *', async () => {
        console.log('Running scheduled odds collection...');
        await runOddsCollection();
    });

    // 每小时清理过期数据
    cron.schedule('0 * * * *', async () => {
        console.log('Running scheduled odds cleanup...');
        await runCleanup();
    });

    // 启动时立即执行一次
    setTimeout(() => {
        console.log('Running initial odds collection...');
        runOddsCollection();
    }, 5000); // 5 秒后执行，等待其他服务初始化

    console.log('Odds collector job scheduled (every 2 minutes)');
}

module.exports = {
    startOddsCollector,
    runOddsCollection,
    runCleanup
};

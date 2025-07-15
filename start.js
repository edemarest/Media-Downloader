const { spawn } = require('child_process');

// Check if we're running the bot or the scraper
const args = process.argv.slice(2);

if (args.length > 0 && args[0].includes('http')) {
    // If a URL is provided, run the scraper
    console.log('Starting scraper mode...');
    const scraper = spawn('node', ['scraper.js', ...args], { stdio: 'inherit' });
    scraper.on('close', (code) => {
        process.exit(code);
    });
} else {
    // Otherwise, run the bot
    console.log('Starting Discord bot...');
    const bot = spawn('node', ['bot.js'], { stdio: 'inherit' });
    bot.on('close', (code) => {
        console.log(`Bot process exited with code ${code}`);
        process.exit(code);
    });
}

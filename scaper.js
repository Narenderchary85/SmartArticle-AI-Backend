const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

async function scrapeBeyondChats() {
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

    try {
        console.log("Navigating to blog section...");
        await page.goto('https://beyondchats.com/blogs/', { waitUntil: 'networkidle2' });

        const lastPageNumber = await page.evaluate(() => {
            const pages = Array.from(document.querySelectorAll('.page-numbers'));
            const numbers = pages
                .map(p => parseInt(p.innerText))
                .filter(n => !isNaN(n));
            return numbers.length > 0 ? Math.max(...numbers) : 1;
        });

        console.log(`Navigating to the oldest articles on page: ${lastPageNumber-1}`);
        await page.goto(`https://beyondchats.com/blogs/page/${lastPageNumber-1}/`, { waitUntil: 'networkidle2' });

        const articleLinks = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('article h2 a, .entry-title a, article > a'));
            return [...new Set(links.map(a => a.href))].slice(-5);
        });

        console.log(`Found ${articleLinks.length} links. Starting full content extraction...`);

        const fullArticles = [];

        for (const url of articleLinks) {
            console.log(`Deep scraping: ${url}`);
            await page.goto(url, { waitUntil: 'networkidle2' });

            await autoScroll(page);

            const articleData = await page.evaluate((articleUrl) => {
                const title = document.querySelector('h1.entry-title, h1')?.innerText.trim() || 'No Title';
                const contentBlock = document.querySelector('.entry-content, .post-content, main article');
                
                if (contentBlock) {
                    const unwanted = contentBlock.querySelectorAll('.sharedaddy, .wpcnt, .jp-relatedposts, .author-bio');
                    unwanted.forEach(el => el.remove());
                }

                return {
                    title: title,
                    url: articleUrl,
                    content: contentBlock ? contentBlock.innerText.trim() : 'Content not found',
                    scraped_at: new Date().toISOString()
                };
            }, url);

            fullArticles.push(articleData);
            
            await new Promise(r => setTimeout(r, 1500)); 
        }

        console.log("Success! Scraped 5 full articles.");
        console.log(JSON.stringify(fullArticles, null, 2));
        
        return fullArticles;

    } catch (error) {
        console.error("Scraping failed:", error);
    } finally {
        await browser.close();
    }
}

async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            let distance = 100;
            let timer = setInterval(() => {
                let scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if (totalHeight >= scrollHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });
}
scrapeBeyondChats();
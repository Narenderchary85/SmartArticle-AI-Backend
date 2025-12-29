import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

export const scrapeSinglePage = async (url) => {
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        
        await page.setDefaultNavigationTimeout(30000); 

        console.log(`Accessing competitor: ${url}`);
        await page.goto(url, { waitUntil: 'networkidle2' });

        const textContent = await page.evaluate(() => {
            const articleBody = document.querySelector('article, main, .content, .post-content, #content');
            
            if (articleBody) {
                const scriptTags = articleBody.querySelectorAll('script, style, nav, footer, header');
                scriptTags.forEach(tag => tag.remove());
                return articleBody.innerText.trim();
            }
            
            return document.body.innerText.trim();
        });

        return textContent;

    } catch (error) {
        console.error(`Could not scrape ${url}:`, error.message);
        return ""; 
    } finally {
        if (browser) await browser.close();
    }
};
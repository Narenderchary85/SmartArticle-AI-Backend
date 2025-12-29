import express from 'express';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import ArticleModel from '../model/ArticleModel.js';

puppeteer.use(StealthPlugin());
const router=express.Router();


async function runScraper() {
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

    try {
        console.log("Starting scrape...");
        await page.goto('https://beyondchats.com/blogs/', { waitUntil: 'networkidle2' });

        const lastPageNumber = await page.evaluate(() => {
            const pages = Array.from(document.querySelectorAll('.page-numbers'));
            const numbers = pages.map(p => parseInt(p.innerText)).filter(n => !isNaN(n));
            return numbers.length > 0 ? Math.max(...numbers) : 1;
        });


        await page.goto(`https://beyondchats.com/blogs/page/${lastPageNumber-1}/`, { waitUntil: 'networkidle2' });

        const articleLinks = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('article h2 a, .entry-title a, article > a'));
            return [...new Set(links.map(a => a.href))].slice(-5);
        });

        const fullArticles = [];
        for (const url of articleLinks) {
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
                };
            }, url);

            const article = new ArticleModel({
                title: articleData.title,
                url: articleData.url,
                content: articleData.content,
                scraped_at: new Date()
            });
            await article.save();

            fullArticles.push(articleData);
            await new Promise(r => setTimeout(r, 1000)); 
        }
        return fullArticles;
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
                if (totalHeight >= scrollHeight) { clearInterval(timer); resolve(); }
            }, 100);
        });
    });
}

router.post('/scrape', async (req, res) => {
    try {
        const data = await runScraper();
        res.status(200).json({ message: "Scraping completed and DB updated", count: data.length });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/getarticles', async (req, res) => {
    try {
        const articles = await ArticleModel.find().sort({ scraped_at: -1 });
        res.json(articles);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/getarticlesbyId/:id', async (req, res) => {
    try {
        const article = await ArticleModel.findById(req.params.id);
        
        if (!article) {
            return res.status(404).json({ message: "Article not found" });
        }

        res.json(article);
    } catch (error) {
        res.status(500).json({ error: "Invalid ID format or Server Error" });
    }
});

export default router;
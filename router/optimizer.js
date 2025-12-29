import express from 'express';
import ArticleModel from '../model/ArticleModel.js';
import { scrapeSinglePage } from './scrapeSinglePage.js';
import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from 'axios'; 
import dotenv from 'dotenv';
dotenv.config();

const router=express.Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.post('/googlescrape/:id', async (req, res) => {
    try {
        const originalArticle = await ArticleModel.findById(req.params.id);
        if (!originalArticle) return res.status(404).send("Article not found");

        console.log(`Searching Google for: ${originalArticle.title}`);

        const response = await axios.post('https://google.serper.dev/search', 
            { q: originalArticle.title }, 
            { headers: { 'X-API-KEY': process.env.SERPER_API_KEY, 'Content-Type': 'application/json' } }
        );
        
        const topLinks = response.data.organic
            .filter(item => !item.link.includes('beyondchats.com'))
            .slice(0, 2)
            .map(item => item.link);

        // const results = await googleIt({ query: originalArticle.title });
        // const topLinks = results
        //     .filter(item => item.link.includes('http') && !item.link.includes('beyondchats.com'))
        //     .slice(0, 2)
        //     .map(item => item.link);

        console.log("Top Competitors Found:", topLinks);

        const competitorContent = [];
        for (const link of topLinks) {
            const content = await scrapeSinglePage(link);
            competitorContent.push(content);
        }

        const model = genAI.getGenerativeModel({ model: "gemini-flash-lite-latest" });

        const prompt = `
        ROLE: You are an expert Content Strategist and SEO Specialist. Your goal is to apply the "Skyscraper Technique" to create an article that is objectively better than the current top-ranking results.

        --- DATA INPUTS ---
        ORIGINAL ARTICLE (Our Draft):
        ${originalArticle.content}

        COMPETITOR RESEARCH 1 (Top Ranking):
        ${competitorContent[0] || "No extra data found"}

        COMPETITOR RESEARCH 2 (Top Ranking):
        ${competitorContent[1] || "No extra data found"}

        --- ANALYSIS STEP ---
        Before writing, analyze the competitors to identify:
        1. THEMATIC GAPS: What specific details or sub-topics did they cover that our original draft missed?
        2. INTENT & TONE: Are they authoritative, conversational, or instructional? What "hidden pattern" makes them rank well (e.g., specific FAQs, data points, or step-by-step guides)?
        3. USER VALUE: How can we simplify their complex points or add more depth where they were vague?

        --- WRITING TASK ---
        Now, rewrite the ORIGINAL ARTICLE into a "10x Version" using these rules:
        - REVERSE-ENGINEER SUCCESS: Adopt the structural strengths of the competitors (like high-impact H2/H3 headers and bulleted lists) but improve the clarity.
        - BEAT THE COMPETITION: Add one unique "Expert Insight" section or a "Pro-Tip" that neither competitor mentioned.
        - SEO SEMANTICS: Naturally integrate key phrases and concepts found in the research without keyword stuffing.
        - READABILITY: Use short paragraphs (2-3 sentences max) and bold key terms for high scanability.
        - NO FLUFF: Do not mention "competitors," "analysis," or "research." The reader should feel they are reading the definitive guide on this topic.

        OUTPUT FORMAT: Markdown only. Include a compelling H1 title, a Hook-driven introduction, detailed body sections, and a helpful conclusion.
    `;

        const aiResult = await model.generateContent(prompt);
        const aiGeneratedContent = aiResult.response.text();

        originalArticle.updated_content = aiGeneratedContent;
        originalArticle.references = topLinks;
        originalArticle.is_updated = true;
        await originalArticle.save();

        res.json({ message: "Article optimized successfully!", article: originalArticle });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
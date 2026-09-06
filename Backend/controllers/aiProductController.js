import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * POST /api/ai/generate-description
 * Generate a compelling product description using Gemini AI.
 * Admin only.
 *
 * Body: { name, category, price, keywords? }
 */
export const generateDescription = async (req, res, next) => {
  try {
    const { name, category, price, keywords } = req.body;

    if (!name || !category || price === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Fields "name", "category", and "price" are required.',
      });
    }

    if (typeof price !== 'number' || price < 0) {
      return res.status(400).json({
        success: false,
        message: '"price" must be a non-negative number.',
      });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `
You are a professional e-commerce copywriter for Divine-Kart, an Indian online store.

Write a compelling product description for the following product:
- Name: ${name}
- Category: ${category}
- Price: ₹${price}
${keywords ? `- Key features/keywords: ${Array.isArray(keywords) ? keywords.join(', ') : keywords}` : ''}

Requirements:
- 2-3 short paragraphs (max 150 words total)
- Engaging, benefit-focused language
- Highlight quality, value for money, and use cases
- No markdown formatting, plain text only
- Suitable for Indian customers
    `.trim();

    const result = await model.generateContent(prompt);
    const description = result.response.text().trim();

    res.json({
      success: true,
      description,
    });
  } catch (error) {
    console.error('generateDescription error:', error.message);
    next(error);
  }
};

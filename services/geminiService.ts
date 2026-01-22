
import { GoogleGenAI, Type } from "@google/genai";
import { BudgetResponse, SankeyData, City } from "../types";

const API_KEY = process.env.API_KEY || "";

export const fetchCityBudget = async (city: City): Promise<BudgetResponse> => {
  if (!API_KEY) throw new Error("API Key is missing.");

  const ai = new GoogleGenAI({ apiKey: API_KEY });
  
  const prompt = `
    ${city}の最新（令和6年度当初予算、または令和5年度補正を含む最新）の「観光関連予算」について、公式資料を元に詳細に調査してください。
    
    【最重要：単位の統一】
    全ての金額は必ず「千円（1,000円）」単位の数値で出力してください。
    資料に「億円」や「百万円」で記載されている場合は、以下の通り正確に換算してください：
    ・1億円 → 100,000
    ・1,000万円 → 10,000
    ・100万円 → 1,000
    数値にカンマや単位（円、千円など）を含めず、純粋な「数値」としてJSONに格納してください。

    【構造の定義】
    以下の4層構造でサンキーダイアグラム用データを作成してください。循環参照は厳禁です。
    1. 【財源 (rev_*)】: 一般財源、国庫支出金、都支出金など
    2. 【費目 (exp_*)】: 観光振興費、産業振興費など
    3. 【事業カテゴリー (cat_*)】: プロモーション、施設整備、イベント支援など
    4. 【具体的細目 (item_*)】: 具体的事業名（例：港区シティプロモーション事業、観光インフォメーション運営など）

    フロー： [財源] -> [費目] -> [事業カテゴリー] -> [具体的細目]

    JSON出力形式（この形式のみを出力）：
    {
      "nodes": [{"id": "prefix_id", "name": "名称"}, ...],
      "links": [{"source": "source_id", "target": "target_id", "value": 数値],
      "explanation": "予算の主な特徴と、単位換算の根拠を含む詳細解説（日本語）"
    }

    ※もし特定の事業の金額が不明な場合は、合計から逆算するか、合理的な推定値を割り当て、その旨をexplanationに記載してください。
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || "";
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    const sources = groundingChunks
      .filter((chunk: any) => chunk.web)
      .map((chunk: any) => ({
        title: chunk.web.title,
        uri: chunk.web.uri
      }));

    let budgetData: SankeyData = { nodes: [], links: [] };
    let explanation = "";
    
    // Improved JSON extraction that handles potential text before/after
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        budgetData = {
          nodes: parsed.nodes || [],
          links: parsed.links || []
        };
        explanation = parsed.explanation || text.replace(jsonMatch[0], '').trim();
      } catch (e) {
        console.error("JSON Parse Error:", e);
        explanation = "データの解析に失敗しました。以下はAIの回答テキストです：\n\n" + text;
      }
    } else {
      explanation = text;
    }

    // Basic validation of IDs to prevent breakage
    const nodeIds = new Set(budgetData.nodes.map(n => n.id));
    budgetData.links = budgetData.links.filter(l => nodeIds.has(l.source) && nodeIds.has(l.target));

    return { data: budgetData, explanation, sources };
  } catch (error: any) {
    if (error.status === 429 || error.message?.includes('429')) {
      throw new Error("Quota exceeded: 429");
    }
    throw error;
  }
};

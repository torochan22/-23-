
import { GoogleGenAI, Type } from "@google/genai";
import { BudgetResponse, SankeyData, City } from "../types";

const API_KEY = process.env.API_KEY || "";

export const fetchCityBudget = async (city: City): Promise<BudgetResponse> => {
  if (!API_KEY) throw new Error("API Key is missing.");

  const ai = new GoogleGenAI({ apiKey: API_KEY });
  
  const prompt = `
    ${city}の最新（令和6年度または令和5年度補正を含む最新）の観光関連予算について詳細に調査し、その内訳を可能な限り「細目（具体的な事業レベル）」まで分解してサンキーダイアグラム用のJSON形式で出力してください。
    
    以下の厳格な階層構造（一方向のフロー）を維持してください。
    【重要】循環参照（A→B→AやA→A）は絶対に含めないでください。IDは各層でユニークにし、以下のプレフィックスを付けてください。
    
    1. 【財源 (rev_*)】: 一般財源、国庫支出金、都支出金、地方債、その他収入など。
    2. 【費目 (exp_*)】: 「観光振興費」や「商業観光費」など。
    3. 【事業カテゴリー (cat_*)】: 観光プロモーション、イベント支援、観光インフラ整備、ふるさと納税関連など。
    4. 【具体的細目 (item_*)】: 各区の特色を反映した具体的事業。
    
    フローは必ず [財源] -> [費目] -> [事業カテゴリー] -> [具体的細目] の順に流れるようにしてください。
    
    JSON出力形式：
    {
      "nodes": [{"id": "prefix_id", "name": "名称"}, ...],
      "links": [{"source": "id1", "target": "id2", "value": 数値],
      "explanation": "詳細な解説文"
    }
    
    ※実際の予算書に基づいた具体的数値を抽出してください。
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
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      budgetData = {
        nodes: parsed.nodes || [],
        links: parsed.links || []
      };
      explanation = parsed.explanation || text.split('{')[0];
    } else {
      explanation = text;
    }

    return { data: budgetData, explanation, sources };
  } catch (error: any) {
    // Re-throw with more context if it's a quota error
    if (error.status === 429 || error.message?.includes('429')) {
      throw new Error("Quota exceeded: 429");
    }
    throw error;
  }
};

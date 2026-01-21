
import { GoogleGenAI, Type } from "@google/genai";
import { BudgetResponse, SankeyData, City } from "../types";

const API_KEY = process.env.API_KEY || "";

export const fetchCityBudget = async (city: City): Promise<BudgetResponse> => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  
  const prompt = `
    ${city}の最新（令和6年度または令和5年度補正を含む最新）の観光関連予算について詳細に調査し、その内訳を可能な限り「細目（具体的な事業レベル）」まで分解してサンキーダイアグラム用のJSON形式で出力してください。
    
    以下の厳格な階層構造（一方向のフロー）を維持してください。
    【重要】循環参照（A→B→AやA→A）は絶対に含めないでください。IDは各層でユニークにし、以下のプレフィックスを付けてください。
    
    1. 【財源 (rev_*)】: 一般財源、国庫支出金、都支出金、地方債、その他収入など。
    2. 【費目 (exp_*)】: 「観光振興費」や「商業観光費」など。
    3. 【事業カテゴリー (cat_*)】: 観光プロモーション、イベント支援、観光インフラ整備、ふるさと納税関連など。
    4. 【具体的細目 (item_*)】: 各区の特色を反映した具体的事業を抽出してください。
       - 千代田区: 皇居周辺・秋葉原・神田明神・歴史的建造物整備
       - 中央区: 銀座・日本橋・築地・ウォーターフロント活性化
       - 港区: 東京タワー・ナイトタイムエコノミー・MICE誘致
       - 新宿区: 歌舞伎町・新宿御苑連携・多文化共生観光
       - 文京区: 六義園・歴史庭園・文豪ゆかりの地・東京ドーム周辺
       - 台東区: 浅草・上野・インバウンド・伝統工芸
       - 墨田区: スカイツリー・北斎美術館・両国国技館・花火大会
       - 江東区: 豊洲・有明・深川・現代美術館連携
       - 品川区: 品川宿・目黒川・しながわ水族館・運河観光
       - 目黒区: 目黒川の桜・中目黒・自由が丘・美術館
       - 大田区: 羽田空港・町工場観光・多摩川水辺活用
       - 世田谷区: 等々力渓谷・世田谷線・デジタルポイントラリー
       - 渋谷区: ハチ公周辺・スタートアップ観光・クリエイティブ産業
       - 中野区: 中野ブロードウェイ・サブカル・哲学堂
       - 杉並区: 阿波踊り・ジャズ・アニメ産業振興
       - 豊島区: 池袋・巣鴨・マンガ聖地・サンシャイン
       - 北区: 渋沢栄一・飛鳥山・赤羽レトロ観光
       - 荒川区: 都電荒川線・伝統工芸・あらかわ遊園
       - 板橋区: 商店街活性化・加賀藩屋敷跡・舟渡
       - 練馬区: アニメ発祥・スタジオツアー東京・緑地観光
       - 足立区: 西新井大師・千住の歴史・北千住周辺
       - 葛飾区: 柴又・亀有・寅さん・水元公園
       - 江戸川区: 葛西臨海公園・金魚・花火・スポーツ観光
    
    フローは必ず [財源] -> [費目] -> [事業カテゴリー] -> [具体的細目] の順に流れるようにしてください。
    
    以下の形式のJSONを含めて回答してください：
    {
      "nodes": [{"id": "prefix_unique_id", "name": "名称"}, ...],
      "links": [{"source": "source_id", "target": "target_id", "value": 数値(単位:千円)],
      "explanation": "${city}の観光政策の特徴や、予算配分の詳細な解説。特にその区らしいユニークな事業に触れてください。",
      "currency": "千円"
    }
    
    ※数値は公開予算書等に基づいた具体的な金額を使用してください。
    ※「その他」にまとめすぎず、具体的な事業名（細目）を抽出してください。
  `;

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
  let explanation = "データを取得できませんでした。";
  
  try {
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
  } catch (e) {
    console.error("JSON parsing error:", e);
    explanation = text;
  }

  return {
    data: budgetData,
    explanation,
    sources
  };
};

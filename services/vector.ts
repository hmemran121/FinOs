import { supabase } from './supabase';

// Interface for Category with Embedding
export interface VectorCategory {
    id: string;
    name: string;
    similarity?: number;
}

export const VectorService = {
    /**
     * Semantic Search for Categories via Supabase RPC
     * Expects pre-calculated embedding
     */
    async searchCategories(embedding: number[], limit = 5): Promise<VectorCategory[]> {
        if (!embedding || embedding.length === 0) return [];

        try {
            const { data: { user } } = await supabase.auth.getUser();

            const { data, error } = await supabase.rpc('match_categories', {
                query_embedding: embedding,
                match_threshold: 0.3, // Lowered for maximum recall (User Request)
                match_count: limit,
                filter_user_id: user?.id
            });

            if (error) {
                console.error("❌ [Vector] RPC Search failed:", error);
                return [];
            }

            return data.map((c: any) => ({
                id: c.id,
                name: c.name,
                similarity: c.similarity
            }));

        } catch (e) {
            console.error("❌ [Vector] Search service error:", e);
            return [];
        }
    },

    /**
     * Save embedding for a category via Supabase
     */
    async indexCategory(categoryId: string, embedding: number[]) {
        const { error } = await supabase
            .from('categories')
            .update({ embedding }) // Supabase automatically handles array -> vector cast
            .eq('id', categoryId);

        if (error) {
            console.error("❌ [Vector] Indexing failed:", error);
            return false;
        }
        return true;
    }
};

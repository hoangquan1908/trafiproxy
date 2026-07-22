import { create } from "zustand";
import type { TrafficRow } from "../types/traffic";

const MAX_TRAFFICS = 1000;

interface TrafficStore {
    traffics: TrafficRow[];
    loading: boolean;
    error: string | null;

    setTraffics: (rows: TrafficRow[]) => void;
    prependTraffic: (row: TrafficRow) => void;
    setLoading: (loading: boolean) => void;
    setError: ( error: string | null ) => void;
    clearTraffic: () => void;
}

export const useTrafficStore = create<TrafficStore>((set) => ({
    traffics: [],
    loading: true,
    error: null,

    setTraffics: (rows)=> set({traffics: rows}),

    prependTraffic: (row) => 
        set((state) => {
            const filtered = state.traffics.filter((item) => item.id !== row.id);

            const next = [row, ...filtered];

            return { traffics: next.slice(0, MAX_TRAFFICS) };
        }),
    
        setLoading: (loading) => set({loading}),
        setError: (error) => set ({error}),
        clearTraffic: () => set({ traffics: []}),
}))

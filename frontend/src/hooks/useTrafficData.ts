import { useEffect, useState } from "react";
import type { TrafficRow } from "../types/traffic"; 

//Định nghĩa kiểu dữ liệu trả về của custom Hook
interface UseTrafficDataResult {
    items: TrafficRow[];
    setItems: React.Dispatch<React.SetStateAction<TrafficRow[]>>;
    loading: boolean;
    error: string | null;
}

export function useTrafficData(): UseTrafficDataResult {
    const [items, setItems] = useState<TrafficRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadFromApi() {
            try{
                setLoading(true);
                setError(null);

                const res = await fetch("/api/requests?limit=100&offset=0");

                if (!res.ok) {
                    throw new Error(`API error: ${res.status}`);
                }

                const rows = await res.json();

                setItems(Array.isArray(rows) ? rows : []);
            }catch (err) {
                const msg = err instanceof Error ? err.message : "Can't load traffic";
                setError(msg);
                console.error("[useTrafficData]", err);
            } finally {
                setLoading(false);
            }
        }

        loadFromApi();
    }, [])
    return { items, setItems, loading, error};
}


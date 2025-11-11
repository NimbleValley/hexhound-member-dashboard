import type { Database } from "database.types";
import { useState } from "react";

type MemberType = Database["public"]["Tables"]["members"]["Row"];
type EntriesType = Database["public"]["Tables"]["time_entries"]["Row"];
type MatchType = Database["public"]["Tables"]["matches_predictions"]["Row"];

const Leaderboard = () => {
    const [members, setMembers] = useState<MemberType[]>([]);
    const [timeEntries, setTimeEntries] = useState<EntriesType[]>([]);
    const [matchEntries, setMatchEntries] = useState<MatchType[]>([]);
    const [loading, setLoading] = useState(true);

    return (
        <div className="relative h-[100dvh] text-white max-h-screen">
            <img
                className="h-[100dvh] brightness-25 w-full object-cover fixed top-0 inset-0 z-1 select-none"
                src="./admin.jpg"
                alt="Admin background"
            />

            {loading && (
                <div className='fixed inset-0 z-50 bg-black/90 flex flex-col justify-center items-center'>
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-orange-500 border-t-transparent mb-4"></div>
                    <h2 className='text-3xl text-white font-bold'>Loading Dashboard...</h2>
                </div>
            )}
        </div>
    )
}

export default Leaderboard;
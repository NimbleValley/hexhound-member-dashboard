import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { supabase } from "~/supabase";

export default function Dashboard() {
    const navigate = useNavigate();
    const [memberData, setMemberData] = useState(null);
    const [timeEntries, setTimeEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isClockedIn, setIsClockedIn] = useState<boolean | null>(null);
    const [totalHours, setTotalHours] = useState<number>(0);

    useEffect(() => {
        // Get member data from session storage
        const storedMember = sessionStorage.getItem('currentMember');

        if (!storedMember) {
            // No member data, redirect to landing
            navigate('/');
            return;
        }

        const memberInfo = JSON.parse(storedMember);
        const memberId = memberInfo.id;

        const fetchMemberData = async () => {
            try {
                setLoading(true);

                // Fetch member info and stats
                const { data: member } = await supabase
                    .from('members')
                    .select('*')
                    .eq('id', memberId)
                    .single();

                // Fetch time entries
                const { data: times } = await supabase
                    .from('time_entries')
                    .select('*')
                    .eq('member_id', memberId)
                    .order('created_at', { ascending: false });

                let tempTotal = 0;
                times?.forEach((time) => {
                    tempTotal += time.total_hours;
                });
                setTotalHours(tempTotal);

                setMemberData({ ...member, id: memberId });
                setTimeEntries(times || []);
                console.log(member['clocked_in'])
                setIsClockedIn(member['clocked_in']);
            } catch (err) {
                console.error('Error fetching dashboard data:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchMemberData();
    }, [navigate]);

    const handleLogout = () => {
        sessionStorage.removeItem('currentMember');
        navigate('/');
    };

    const handleClockIn = async () => {
        try {
            const { data, error } = await supabase
                .from('time_entries')
                .insert({
                    member_id: memberData.id,
                    clock_in_time: new Date().toISOString(),
                });

            await setClockStatus(true);

            if (error) throw error;

            setIsClockedIn(true);

            window.location.reload();

        } catch (err) {
            console.error('Error clocking in:', err);
        }
    };

    const setClockStatus = async (status: boolean) => {
        try {
            const { data, error } = await supabase
                .from('members')
                .update({
                    clocked_in: status
                })
                .eq('id', memberData.id);

            console.log(data)


            if (error) throw error;

        } catch (err) {
            console.error('Error setting clock status:', err);
        }
    }

    const handleClockOut = async () => {
        try {
            const { data, error } = await supabase
                .from('time_entries')
                .update({
                    clock_out_time: new Date().toISOString()
                })
                .eq('member_id', memberData.id)
                .is('clock_out_time', null);

            await setClockStatus(false);

            if (error) throw error;

            setIsClockedIn(false);

            window.location.reload();
        } catch (err) {
            console.error('Error clocking out:', err);
        }
    };

    // Rest of your component JSX stays the same, just change the logout button:
    return (
        <div className="min-h-screen bg-gray-100 text-black p-8">
            {/* Header */}
            <div className="flex bg-gray-900/85 border-black/25 border-1 shadow-lg px-5 py-3 rounded-lg justify-between items-center mb-8 ">
                <div>
                    <h1 className="font-nippori text-4xl font-bold text-orange-400">
                        Welcome, {memberData?.first_name}!
                    </h1>
                </div>
                <button
                    onClick={handleLogout}
                    className="bg-orange-600 hover:bg-orange-700 px-4 py-2 rounded-lg transition-colors"
                >
                    Logout
                </button>
            </div>

            {loading &&
                <div className='z-10 fixed w-full h-full bg-black/90 left-0 top-0 flex flex-col justify-center items-center'>
                    <h2 className='text-5xl text-white font-bold'>Loading...</h2>
                </div>
            }

            {!isClockedIn ?
                <div className="flex w-full items-center flex-col mt-10 gap-5">
                    <h3 className="text-lg">You are currently <span className="font-bold text-red-900">CLOCKED OUT</span>.</h3>
                    <button onClick={handleClockIn} className="font-bold color-gray-900 text-4xl bg-green-500/10 px-15 py-10 rounded-xl border-green-700/75 border-2 shadow-lg shadow-green-100">Clock In</button>
                </div>
                : <div className="flex w-full items-center flex-col mt-10 gap-5">
                    <h3 className="text-lg">You are currently <span className="font-bold text-green-900">CLOCKED IN</span>.</h3>
                    <button onClick={handleClockOut} className="font-bold color-gray-900 text-4xl bg-red-500/10 px-15 py-10 rounded-xl border-red-700/75 border-2 shadow-lg shadow-green-100">Clock Out</button>
                </div>
            }

            <h1 className="mt-5 text-3xl text-center">Total hours: {totalHours}</h1>
        </div >
    );
}